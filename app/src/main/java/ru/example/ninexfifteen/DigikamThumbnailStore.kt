package ru.example.ninexfifteen

import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import java.io.File

object DigikamThumbnailStore {
    private var databasePath: String? = null
    private var database: SQLiteDatabase? = null

    @Synchronized
    fun load(
        databasePath: String?,
        photoPath: String,
        uniqueHash: String?,
        fileSize: Long,
    ): ByteArray? {
        if (databasePath == null) return null

        return runCatching {
            if (this.databasePath != databasePath) {
                database?.close()
                database = SQLiteDatabase.openDatabase(databasePath, null, SQLiteDatabase.OPEN_READONLY)
                this.databasePath = databasePath
            }
            database!!.rawQuery(
                """
                SELECT thumbnails.data
                FROM Thumbnails thumbnails
                JOIN FilePaths paths ON paths.thumbId = thumbnails.id
                WHERE paths.path IN (?, ?)
                LIMIT 1
                """.trimIndent(),
                arrayOf(photoPath, Uri.fromFile(File(photoPath)).toString()),
            ).use { cursor ->
                if (cursor.moveToFirst()) {
                    cursor.getBlob(0)
                } else {
                    loadByHash(database!!, uniqueHash, fileSize)
                }
            }
        }.getOrNull()
    }

    private fun loadByHash(database: SQLiteDatabase, uniqueHash: String?, fileSize: Long): ByteArray? {
        if (uniqueHash.isNullOrEmpty()) return null

        return database.rawQuery(
            """
            SELECT thumbnails.data
            FROM Thumbnails thumbnails
            JOIN UniqueHashes hashes ON hashes.thumbId = thumbnails.id
            WHERE hashes.uniqueHash = ? AND hashes.fileSize = ?
            LIMIT 1
            """.trimIndent(),
            arrayOf(uniqueHash, fileSize.toString()),
        ).use { cursor ->
            if (cursor.moveToFirst()) cursor.getBlob(0) else null
        }
    }
}
