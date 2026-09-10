package ru.example.ninexfifteen

import android.content.Context
import android.net.Uri
import android.os.Environment
import android.provider.DocumentsContract
import java.io.File

object AppSettings {
    private const val PREFERENCES_NAME = "settings"
    private const val ROOT_FOLDER_KEY = "root_folder"
    private const val SELECTED_TAG_IDS_KEY = "selected_tag_ids"
    private const val SELECTED_ALBUM_IDS_KEY = "selected_album_ids"

    fun rootFolderUri(context: Context): Uri? = context
        .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        .getString(ROOT_FOLDER_KEY, null)
        ?.let(Uri::parse)

    fun rootFolder(context: Context): File {
        val uri = rootFolderUri(context) ?: return Environment.getExternalStorageDirectory()
        val documentId = DocumentsContract.getTreeDocumentId(uri)
        val path = if (documentId.startsWith("primary:")) {
            Environment.getExternalStorageDirectory().path + "/" + documentId.removePrefix("primary:")
        } else {
            "/storage/" + documentId.replace(':', '/')
        }
        return File(path)
    }

    fun saveRootFolderUri(context: Context, uri: Uri) {
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(ROOT_FOLDER_KEY, uri.toString())
            .apply()
    }

    fun selectedTagIds(context: Context): Set<Long> = context
        .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        .getStringSet(SELECTED_TAG_IDS_KEY, emptySet())
        .orEmpty()
        .mapNotNull(String::toLongOrNull)
        .toSet()

    fun saveSelectedTagIds(context: Context, tagIds: Set<Long>) {
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putStringSet(SELECTED_TAG_IDS_KEY, tagIds.map(Long::toString).toSet())
            .apply()
    }

    fun selectedAlbumIds(context: Context): Set<Long> = selectedIds(context, SELECTED_ALBUM_IDS_KEY)

    fun saveSelectedAlbumIds(context: Context, albumIds: Set<Long>) {
        saveIds(context, SELECTED_ALBUM_IDS_KEY, albumIds)
    }

    private fun selectedIds(context: Context, key: String): Set<Long> = context
        .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        .getStringSet(key, emptySet())
        .orEmpty()
        .mapNotNull(String::toLongOrNull)
        .toSet()

    private fun saveIds(context: Context, key: String, ids: Set<Long>) {
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putStringSet(key, ids.map(Long::toString).toSet())
            .apply()
    }
}
