package ru.example.ninexfifteen

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import android.os.Environment
import android.provider.DocumentsContract
import java.io.File
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.util.ArrayDeque

class DigikamLibrary(private val context: Context) {
    fun load(): Library? {
        val databaseFile = AppSettings.rootFolderUri(context)
            ?.let(::findDatabaseInTree)
            ?: findDatabaseInDirectory(Environment.getExternalStorageDirectory())
            ?: return null

        databaseFile.use { file ->
            return SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY).use { database ->
                Library(
                    statistics = Statistics(
                        photos = queryCount(database, "Images"),
                        albums = queryCount(database, "Albums"),
                        tags = queryCount(database, "Tags WHERE id != 0 AND name NOT GLOB '_Digikam_*'"),
                    ),
                    photos = queryPhotos(
                        database,
                        AppSettings.selectedTagIds(context),
                        AppSettings.selectedAlbumIds(context),
                    ),
                    thumbnailDatabasePath = findThumbnailDatabase(databaseFile),
                )
            }
        }
    }

    fun loadTags(): List<Tag> = openDatabase { database ->
        buildList {
            database.rawQuery(
                "SELECT id, pid, name FROM Tags WHERE id != 0 ORDER BY name",
                null,
            ).use { cursor ->
                while (cursor.moveToNext()) {
                    add(Tag(cursor.getLong(0), cursor.takeIf { !it.isNull(1) }?.getLong(1), cursor.getString(2)))
                }
            }
        }
    } ?: emptyList()

    fun loadAlbums(): List<Album> = openDatabase { database ->
        buildList {
            database.rawQuery(
                "SELECT id, albumRoot, relativePath FROM Albums ORDER BY relativePath",
                null,
            ).use { cursor ->
                while (cursor.moveToNext()) {
                    add(Album(cursor.getLong(0), cursor.getLong(1), cursor.getString(2)))
                }
            }
        }
    } ?: emptyList()

    private fun <T> openDatabase(block: (SQLiteDatabase) -> T): T? {
        val databaseFile = AppSettings.rootFolderUri(context)
            ?.let(::findDatabaseInTree)
            ?: findDatabaseInDirectory(Environment.getExternalStorageDirectory())
            ?: return null

        databaseFile.use { file ->
            return SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY).use(block)
        }
    }

    private fun queryPhotos(
        database: SQLiteDatabase,
        tagIds: Set<Long>,
        albumIds: Set<Long>,
    ): List<Photo> = buildList {
        val tagFilter = if (tagIds.isEmpty()) "" else "JOIN ImageTags tags ON tags.imageid = i.id"
        val filters = buildList {
            if (tagIds.isNotEmpty()) add("tags.tagid IN (${tagIds.joinToString { "?" }})")
            if (albumIds.isNotEmpty()) add("i.album IN (${albumIds.joinToString { "?" }})")
        }
        val whereClause = filters.takeIf { it.isNotEmpty() }?.joinToString(" AND ", prefix = "WHERE ") ?: ""
        database.rawQuery(
            """
            SELECT DISTINCT trim(a.relativePath, '/') || '/' || i.name,
                   info.creationDate,
                   i.uniqueHash,
                   i.fileSize
            FROM Images i
            JOIN Albums a ON a.id = i.album
            LEFT JOIN ImageInformation info ON info.imageid = i.id
            $tagFilter
            $whereClause
            ORDER BY info.creationDate DESC, i.id DESC
            """.trimIndent(),
            (tagIds + albumIds).map(Long::toString).toTypedArray(),
        ).use { cursor ->
            while (cursor.moveToNext()) {
                add(
                    Photo(
                        relativePath = cursor.getString(0).trim('/'),
                        date = cursor.getString(1)?.let(::parseDate),
                        uniqueHash = cursor.getString(2),
                        fileSize = cursor.getLong(3),
                    ),
                )
            }
        }
    }

    private fun findThumbnailDatabase(databaseFile: DatabaseFile): String? {
        val besideCoreDatabase = File(databaseFile.path).parentFile?.resolve(THUMBNAIL_DATABASE_NAME)
        if (besideCoreDatabase?.isFile == true) return cacheThumbnailDatabase(besideCoreDatabase)

        val source = AppSettings.rootFolder(context)
            .walkTopDown()
            .firstOrNull { it.isFile && it.name == THUMBNAIL_DATABASE_NAME }
            ?: return null
        return cacheThumbnailDatabase(source)
    }

    private fun cacheThumbnailDatabase(source: File): String {
        val cached = File(context.cacheDir, THUMBNAIL_DATABASE_NAME)
        if (cached.isFile && cached.length() == source.length() && cached.lastModified() >= source.lastModified()) {
            return cached.path
        }

        source.inputStream().use { input ->
            cached.outputStream().use { output -> input.copyTo(output) }
        }
        cached.setLastModified(source.lastModified())
        return cached.path
    }

    private fun parseDate(value: String): LocalDate? = runCatching {
        OffsetDateTime.parse(value).toLocalDate()
    }.recoverCatching {
        LocalDateTime.parse(value).toLocalDate()
    }.getOrNull()

    private fun queryCount(database: SQLiteDatabase, table: String): Int = database
        .rawQuery("SELECT COUNT(*) FROM $table", null)
        .use { cursor ->
            cursor.moveToFirst()
            cursor.getInt(0)
        }

    private fun findDatabaseInDirectory(root: File): DatabaseFile? = root
        .walkTopDown()
        .firstOrNull { it.isFile && it.name == DATABASE_NAME }
        ?.let(::DirectDatabaseFile)

    private fun findDatabaseInTree(treeUri: Uri): DatabaseFile? {
        val documentIds = ArrayDeque<String>()
        documentIds.add(DocumentsContract.getTreeDocumentId(treeUri))

        while (documentIds.isNotEmpty()) {
            val parentId = documentIds.removeFirst()
            val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, parentId)
            context.contentResolver.query(childrenUri, PROJECTION, null, null, null)?.use { cursor ->
                val idIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID)
                val nameIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
                val mimeTypeIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_MIME_TYPE)

                while (cursor.moveToNext()) {
                    val documentId = cursor.getString(idIndex)
                    if (cursor.getString(nameIndex) == DATABASE_NAME) {
                        val documentUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, documentId)
                        return CachedDatabaseFile(copyToCache(documentUri))
                    }
                    if (cursor.getString(mimeTypeIndex) == DocumentsContract.Document.MIME_TYPE_DIR) {
                        documentIds.add(documentId)
                    }
                }
            }
        }
        return null
    }

    private fun copyToCache(uri: Uri): File {
        val cacheFile = File.createTempFile("digikam4-", ".db", context.cacheDir)
        context.contentResolver.openInputStream(uri)?.use { input ->
            cacheFile.outputStream().use { output -> input.copyTo(output) }
        } ?: error("Cannot open the selected database")
        return cacheFile
    }

    data class Library(
        val statistics: Statistics,
        val photos: List<Photo>,
        val thumbnailDatabasePath: String?,
    )
    data class Statistics(val photos: Int, val albums: Int, val tags: Int)
    data class Photo(
        val relativePath: String,
        val date: LocalDate?,
        val uniqueHash: String?,
        val fileSize: Long,
    )
    data class Tag(val id: Long, val parentId: Long?, val name: String)
    data class Album(val id: Long, val rootId: Long, val relativePath: String)

    private interface DatabaseFile : AutoCloseable {
        val path: String
    }

    private class DirectDatabaseFile(private val file: File) : DatabaseFile {
        override val path = file.path
        override fun close() = Unit
    }

    private class CachedDatabaseFile(private val file: File) : DatabaseFile {
        override val path = file.path
        override fun close() {
            file.delete()
        }
    }

    private companion object {
        const val DATABASE_NAME = "digikam4.db"
        const val THUMBNAIL_DATABASE_NAME = "thumbnails-digikam.db"
        val PROJECTION = arrayOf(
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE,
        )
    }
}
