package ru.example.ninexfifteen

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.provider.DocumentsContract
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.Switch
import android.widget.TextView

class SettingsActivity : Activity() {
    private lateinit var rootFolderView: TextView
    private lateinit var statisticsView: TextView
    private lateinit var photoSortingView: TextView
    private lateinit var wallpaperTagsView: TextView
    private lateinit var wallpaperFrequencyGroup: RadioGroup
    private lateinit var wallpaperRotationSwitch: Switch
    private var isLoadingStatistics = false
    private var isSortingPhotos = false
    private var photoSortingPlan: PhotoSorting.Plan? = null

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
        photoSortingView = TextView(this).apply {
            textSize = 16f
            PunkStyle.outlined(this, 0xFFF5F5F5.toInt())
            setPadding(24, 24, 24, 24)
            PunkStyle.label(this)
        }
        wallpaperTagsView = TextView(this).apply {
            textSize = 16f
            PunkStyle.outlined(this, 0xFFF5F5F5.toInt())
            setPadding(24, 24, 24, 24)
            PunkStyle.label(this)
        }
        wallpaperRotationSwitch = Switch(this).apply {
            text = "Change wallpapers automatically"
            PunkStyle.label(this)
            setOnCheckedChangeListener { _, enabled ->
                AppSettings.saveWallpaperRotationEnabled(this@SettingsActivity, enabled)
                WallpaperRotation.schedule(this@SettingsActivity)
            }
        }
        wallpaperFrequencyGroup = RadioGroup(this).apply {
            orientation = RadioGroup.HORIZONTAL
            listOf(1L, 3L, 5L).forEach { days ->
                addView(RadioButton(this@SettingsActivity).apply {
                    id = days.toInt()
                    text = "$days ${if (days == 1L) "day" else "days"}"
                    PunkStyle.label(this)
                })
            }
            setOnCheckedChangeListener { _, checkedId ->
                if (checkedId in WALLPAPER_FREQUENCIES) {
                    AppSettings.saveWallpaperRotationFrequencyDays(this@SettingsActivity, checkedId.toLong())
                    WallpaperRotation.schedule(this@SettingsActivity)
                }
            }
        }

        val content = LinearLayout(this).apply {
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
            addView(TextView(this@SettingsActivity).apply {
                text = "Sort photos"
                textSize = 18f
                setPadding(0, 48, 0, 8)
                PunkStyle.title(this)
            })
            addView(TextView(this@SettingsActivity).apply {
                text = "Move photos from DCIM to YEAR/MONTH folders and add them to digiKam."
                PunkStyle.label(this)
            })
            addView(photoSortingView)
            addView(Button(this@SettingsActivity).apply {
                text = "Analyze DCIM"
                PunkStyle.button(this)
                setOnClickListener { analyzePhotos() }
            }, buttonLayoutParams())
            addView(Button(this@SettingsActivity).apply {
                text = "Sort photos"
                PunkStyle.button(this)
                setOnClickListener { sortPhotos() }
            }, buttonLayoutParams())
            addView(TextView(this@SettingsActivity).apply {
                text = "Wallpaper rotation"
                textSize = 18f
                setPadding(0, 48, 0, 8)
                PunkStyle.title(this)
            })
            addView(TextView(this@SettingsActivity).apply {
                text = "A random photo matching the selected tags will be set on both the lock and home screens."
                PunkStyle.label(this)
            })
            addView(wallpaperTagsView)
            addView(Button(this@SettingsActivity).apply {
                text = "Choose tags"
                PunkStyle.button(this)
                setOnClickListener {
                    startActivity(Intent(this@SettingsActivity, FilterActivity::class.java).apply {
                        putExtra(FilterActivity.EXTRA_WALLPAPER_TAGS_MODE, true)
                    })
                }
            }, buttonLayoutParams())
            addView(TextView(this@SettingsActivity).apply {
                text = "Frequency"
                setPadding(0, 24, 0, 8)
                PunkStyle.title(this)
            })
            addView(wallpaperFrequencyGroup)
            addView(wallpaperRotationSwitch)
        }
        setContentView(ScrollView(this).apply {
            PunkStyle.screen(this)
            addView(content)
        })
        showRootFolder()
        showWallpaperRotation()
        photoSortingView.text = "Select a root folder, then analyze DCIM."
    }

    override fun onResume() {
        super.onResume()
        loadStatistics()
        photoSortingPlan = null
        photoSortingView.text = "Root folder changed. Analyze DCIM again."
        showWallpaperRotation()
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

    private fun showWallpaperRotation() {
        val tags = AppSettings.wallpaperRotationTagIds(this)
        wallpaperTagsView.text = if (tags.isEmpty()) {
            "No tags selected."
        } else {
            "Selected tags: ${tags.size}"
        }
        wallpaperFrequencyGroup.check(AppSettings.wallpaperRotationFrequencyDays(this).toInt())
        wallpaperRotationSwitch.isChecked = AppSettings.wallpaperRotationEnabled(this)
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

    private fun analyzePhotos() {
        if (AppSettings.rootFolderUri(this) == null) {
            photoSortingView.text = "Select a root folder first."
            return
        }
        photoSortingView.text = "Analyzing DCIM..."
        Thread {
            val result = runCatching {
                PhotoSorting.plan(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DCIM),
                    AppSettings.rootFolder(this),
                )
            }
            runOnUiThread {
                result.onSuccess { plan ->
                    photoSortingPlan = plan
                    photoSortingView.text = when {
                        plan.photos.isEmpty() -> "No photos to sort in DCIM."
                        else -> "${plan.photos.size} photos will be moved.\n${plan.folders.size} folders: ${plan.folders.take(10).joinToString()}" +
                            if (plan.folders.size > 10) " and ${plan.folders.size - 10} more." else ""
                    }
                }.onFailure { error ->
                    photoSortingView.text = "Unable to analyze DCIM: ${error.message}"
                }
            }
        }.start()
    }

    private fun sortPhotos() {
        val plan = photoSortingPlan
        if (plan == null || plan.photos.isEmpty()) {
            photoSortingView.text = "Analyze DCIM first."
            return
        }
        if (isSortingPhotos) return

        isSortingPhotos = true
        photoSortingView.text = "Sorting 0/${plan.photos.size}..."
        Thread {
            val result = PhotoSorting.sort(plan) { processed, total ->
                runOnUiThread { photoSortingView.text = "Sorting $processed/$total..." }
            }
            val indexed = runCatching { DigikamLibrary(this).indexSortedPhotos(result.sortedPhotos) }
            runOnUiThread {
                isSortingPhotos = false
                photoSortingPlan = null
                val databaseResult = indexed.getOrNull()?.let { "$it added to digiKam." }
                    ?: "Files moved, but digiKam database was not updated: ${indexed.exceptionOrNull()?.message ?: "database not found"}"
                photoSortingView.text = "Moved ${result.moved}; errors: ${result.failed}. $databaseResult"
                loadStatistics()
            }
        }.start()
    }

    private fun buttonLayoutParams() = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
    ).apply { gravity = Gravity.START }

    private companion object {
        const val SELECT_ROOT_FOLDER = 1
        val WALLPAPER_FREQUENCIES = setOf(1, 3, 5)
    }
}
