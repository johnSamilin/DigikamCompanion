package ru.example.ninexfifteen

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.DocumentsContract
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class SettingsActivity : Activity() {
    private lateinit var rootFolderView: TextView
    private lateinit var statisticsView: TextView
    private var isLoadingStatistics = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        rootFolderView = TextView(this).apply {
            textSize = 16f
            PunkStyle.outlined(this)
            setPadding(24, 24, 24, 24)
            PunkStyle.label(this)
        }
        statisticsView = TextView(this).apply {
            textSize = 16f
            PunkStyle.outlined(this, 0xFFF5F5F5.toInt())
            setPadding(24, 24, 24, 24)
            PunkStyle.label(this)
        }

        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
            PunkStyle.screen(this)
            addView(TextView(this@SettingsActivity).apply {
                text = "Settings"
                textSize = 22f
                PunkStyle.title(this)
            })
            addView(TextView(this@SettingsActivity).apply {
                text = "Root folder"
                textSize = 18f
                setPadding(0, 48, 0, 8)
                PunkStyle.title(this)
            })
            addView(rootFolderView)
            addView(Button(this@SettingsActivity).apply {
                text = "Change"
                PunkStyle.button(this)
                setOnClickListener { selectRootFolder() }
            }, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            ).apply {
                gravity = Gravity.START
            })
            addView(TextView(this@SettingsActivity).apply {
                text = "digiKam library"
                textSize = 18f
                setPadding(0, 48, 0, 8)
                PunkStyle.title(this)
            })
            addView(statisticsView)
        })
        showRootFolder()
    }

    override fun onResume() {
        super.onResume()
        loadStatistics()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != SELECT_ROOT_FOLDER || resultCode != RESULT_OK) return

        val resultData = data ?: return
        val folderUri = resultData.data ?: return
        val permissions = resultData.flags and
            (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        contentResolver.takePersistableUriPermission(folderUri, permissions)
        AppSettings.saveRootFolderUri(this, folderUri)
        showRootFolder()
        loadStatistics()
    }

    private fun selectRootFolder() {
        startActivityForResult(
            Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION or
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                    Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION,
            ),
            SELECT_ROOT_FOLDER,
        )
    }

    private fun showRootFolder() {
        rootFolderView.text = AppSettings.rootFolder(this).path
    }

    private fun displayNameFor(uriString: String): String {
        val documentId = DocumentsContract.getTreeDocumentId(Uri.parse(uriString))
        return documentId.replaceFirst("primary:", "/storage/emulated/0/")
    }

    private fun loadStatistics() {
        if (isLoadingStatistics) return

        isLoadingStatistics = true
        statisticsView.text = "Loading statistics..."
        Thread {
            val result = runCatching { DigikamLibrary(this).load() }
            runOnUiThread {
                isLoadingStatistics = false
                val library = result.getOrElse {
                    statisticsView.text = "Unable to read digikam4.db: ${it.message}"
                    return@runOnUiThread
                }
                statisticsView.text = library?.statistics?.let {
                    "Photos: ${it.photos}\nAlbums: ${it.albums}\nTags: ${it.tags}"
                } ?: "digikam4.db was not found."
            }
        }.start()
    }

    private companion object {
        const val SELECT_ROOT_FOLDER = 1
    }
}
