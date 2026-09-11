package ru.example.ninexfifteen

import android.content.ClipData
import android.content.Intent
import android.content.res.Configuration
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.TextView
import android.widget.Button
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.fragment.app.FragmentActivity
import androidx.core.content.FileProvider
import androidx.documentfile.provider.DocumentFile
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.floatingactionbutton.FloatingActionButton
import java.io.File
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.concurrent.Executors

internal fun photoGridSpanCount(orientation: Int): Int = when (orientation) {
    Configuration.ORIENTATION_LANDSCAPE -> 8
    else -> 4
}

class MainActivity : FragmentActivity() {
    private lateinit var statusView: TextView
    private lateinit var loadingView: Button
    private lateinit var photoCountView: TextView
    private lateinit var selectAllButton: Button
    private lateinit var unselectAllButton: Button
    private lateinit var shareButton: Button
    private lateinit var copyButton: Button
    private lateinit var photosView: RecyclerView
    private lateinit var filterButton: Button
    private lateinit var resetFilterButton: Button
    private var hasRequestedAllFilesAccess = false
    private var isLoading = false
    private var shouldReloadLibrary = true
    private var allPhotos = emptyList<DigikamLibrary.Photo>()
    private var thumbnailDatabasePath: String? = null
    private var activeDateRange: ClosedRange<LocalDate>? = null
    private var multiSelectMode = false
    private var displayedPhotoPaths = emptySet<String>()
    private val selectedPhotoPaths = mutableSetOf<String>()
    private var pendingCopyPaths: List<String>? = null
    private var isCopying = false
    private val imageLoadHandler = Handler(Looper.getMainLooper())
    private val loadVisiblePhotos = Runnable {
        (photosView.adapter as? PhotoAdapter)?.loadVisible(photosView)
    }
    private val photoGridSpanCount: Int
        get() = photoGridSpanCount(resources.configuration.orientation)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        statusView = TextView(this).apply {
            setPadding(48, 48, 48, 48)
            textSize = 18f
            PunkStyle.title(this)
        }
        loadingView = Button(this).apply {
            text = "Loading photos..."
            isClickable = false
            isFocusable = false
            visibility = View.GONE
            PunkStyle.button(this)
        }
        photoCountView = TextView(this).apply {
            gravity = Gravity.CENTER
            setPadding(24, 24, 24, 24)
            textSize = 18f
            PunkStyle.title(this)
        }
        unselectAllButton = Button(this).apply {
            text = "Unselect all"
            visibility = View.GONE
            PunkStyle.button(this, primary = false)
            setOnClickListener {
                selectedPhotoPaths.clear()
                multiSelectMode = false
                updateSelectionUi()
            }
        }
        selectAllButton = Button(this).apply {
            text = "Select all"
            visibility = View.GONE
            PunkStyle.button(this)
            setOnClickListener {
                selectedPhotoPaths.addAll(displayedPhotoPaths)
                updateSelectionUi()
            }
        }
        shareButton = Button(this).apply {
            text = "Share"
            visibility = View.GONE
            PunkStyle.button(this)
            setOnClickListener { shareSelectedPhotos() }
        }
        copyButton = Button(this).apply {
            text = "Copy"
            visibility = View.GONE
            PunkStyle.button(this)
            setOnClickListener { pickCopyDestination() }
        }
        photosView = RecyclerView(this).apply {
            layoutManager = GridLayoutManager(this@MainActivity, photoGridSpanCount)
            addOnScrollListener(object : RecyclerView.OnScrollListener() {
                override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                    scheduleVisiblePhotoLoading()
                }
            })
        }
        val fab = FloatingActionButton(this).apply {
            setImageResource(R.drawable.ic_settings)
            backgroundTintList = ColorStateList.valueOf(Color.rgb(26, 26, 26))
            imageTintList = ColorStateList.valueOf(Color.WHITE)
            contentDescription = "Open menu"
            rotation = 2f
            setOnClickListener { showMenu(this) }
        }
        resetFilterButton = Button(this).apply {
            text = "Reset filter"
            PunkStyle.button(this, primary = false)
            visibility = View.GONE
            setOnClickListener {
                activeDateRange = null
                AppSettings.saveSelectedTagIds(this@MainActivity, emptySet())
                AppSettings.saveSelectedAlbumIds(this@MainActivity, emptySet())
                loadPhotos()
            }
        }
        filterButton = Button(this).apply {
            text = "Filter"
            PunkStyle.button(this)
            setOnClickListener {
                startActivityForResult(Intent(this@MainActivity, FilterActivity::class.java), FILTER_REQUEST)
            }
        }
        setContentView(FrameLayout(this).apply {
            PunkStyle.screen(this)
            addView(LinearLayout(this@MainActivity).apply {
                orientation = LinearLayout.VERTICAL
                addView(
                    LinearLayout(this@MainActivity).apply {
                        gravity = Gravity.CENTER_VERTICAL
                        setBackgroundResource(R.drawable.photo_count_header)
                        addView(unselectAllButton, LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.WRAP_CONTENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT,
                        ))
                        addView(photoCountView, LinearLayout.LayoutParams(
                            0,
                            LinearLayout.LayoutParams.WRAP_CONTENT,
                            1f,
                        ))
                        addView(selectAllButton, LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.WRAP_CONTENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT,
                        ))
                    },
                    LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                    ),
                )
                addView(
                    photosView,
                    LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        0,
                        1f,
                    ),
                )
            }, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
            addView(statusView)
            addView(
                loadingView,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.CENTER,
                ),
            )
            addView(
                fab,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.BOTTOM or Gravity.END,
                ).apply { setMargins(0, 0, 48, 48) },
            )
            addView(
                filterButton,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.BOTTOM or Gravity.END,
                ).apply { setMargins(0, 0, 48, 128) },
            )
            addView(
                resetFilterButton,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.BOTTOM or Gravity.END,
                ).apply { setMargins(0, 0, 48, 200) },
            )
            addView(
                shareButton,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.BOTTOM or Gravity.START,
                ).apply { setMargins(48, 0, 0, 48) },
            )
            addView(
                copyButton,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.BOTTOM or Gravity.START,
                ).apply { setMargins(48, 0, 0, 128) },
            )
        })
    }

    override fun onResume() {
        super.onResume()
        checkAllFilesAccess()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILTER_REQUEST) {
            shouldReloadLibrary = true
            checkAllFilesAccess()
        } else if (requestCode == COPY_DESTINATION_REQUEST) {
            val selectedPaths = pendingCopyPaths
            pendingCopyPaths = null
            if (resultCode == RESULT_OK && data?.data != null && selectedPaths != null) {
                copySelectedPhotos(data.data!!, selectedPaths, data.flags)
            } else {
                updateSelectionUi()
            }
        }
    }

    private fun checkAllFilesAccess() {
        if (Environment.isExternalStorageManager()) {
            if (shouldReloadLibrary) loadPhotos()
            return
        }

        statusView.visibility = View.VISIBLE
        statusView.text = "Access to all files is required."
        if (!hasRequestedAllFilesAccess) openAllFilesAccessSettings()
    }

    private fun loadPhotos() {
        if (isLoading) return

        isLoading = true
        shouldReloadLibrary = false
        statusView.visibility = View.GONE
        loadingView.visibility = View.VISIBLE
        Thread {
            val result = runCatching { DigikamLibrary(this).load() }
            runOnUiThread {
                isLoading = false
                loadingView.visibility = View.GONE
                val library = result.getOrElse {
                    statusView.visibility = View.VISIBLE
                    statusView.text = "Unable to read digikam4.db: ${it.message}"
                    return@runOnUiThread
                }
                if (library == null) {
                    statusView.visibility = View.VISIBLE
                    statusView.text = "digikam4.db was not found."
                    return@runOnUiThread
                }

                allPhotos = library.photos
                thumbnailDatabasePath = library.thumbnailDatabasePath
                showPhotos()
                statusView.visibility = View.GONE
            }
        }.start()
    }

    private fun showMenu(anchor: View) {
        PopupMenu(this, anchor).apply {
            menu.add("Settings")
            setOnMenuItemClickListener {
                startActivity(Intent(this@MainActivity, SettingsActivity::class.java))
                true
            }
            show()
        }
    }

    private fun showPhotos() {
        val photos = activeDateRange?.let { range ->
            allPhotos.filter { photo -> photo.date?.let(range::contains) == true }
        } ?: allPhotos
        displayedPhotoPaths = photos.mapTo(mutableSetOf()) { photo ->
            File(AppSettings.rootFolder(this), photo.relativePath).path
        }
        selectedPhotoPaths.retainAll(displayedPhotoPaths)
        val adapter = PhotoAdapter(
            photos,
            AppSettings.rootFolder(this),
            thumbnailDatabasePath,
            ::showDateRangePicker,
            ::openSlider,
            ::activateMultiSelect,
            ::togglePhotoSelection,
            { multiSelectMode },
            { it in selectedPhotoPaths },
            photoGridSpanCount,
        )
        photosView.adapter = adapter
        (photosView.layoutManager as GridLayoutManager).spanSizeLookup =
            object : GridLayoutManager.SpanSizeLookup() {
                override fun getSpanSize(position: Int) = adapter.getSpanSize(position)
            }
        resetFilterButton.visibility = if (
            activeDateRange == null &&
                AppSettings.selectedTagIds(this).isEmpty() &&
                AppSettings.selectedAlbumIds(this).isEmpty()
        ) {
            View.GONE
        } else {
            View.VISIBLE
        }
        updateSelectionUi()
        scheduleVisiblePhotoLoading()
    }

    private fun activateMultiSelect(path: String) {
        multiSelectMode = true
        selectedPhotoPaths.add(path)
        updateSelectionUi()
    }

    private fun togglePhotoSelection(path: String) {
        if (!selectedPhotoPaths.add(path)) selectedPhotoPaths.remove(path)
        updateSelectionUi()
    }

    private fun updateSelectionUi() {
        photoCountView.text = if (multiSelectMode) {
            "${selectedPhotoPaths.size} of ${displayedPhotoPaths.size}"
        } else {
            "${displayedPhotoPaths.size} photo"
        }
        unselectAllButton.visibility = if (multiSelectMode) View.VISIBLE else View.GONE
        selectAllButton.visibility = if (multiSelectMode) View.VISIBLE else View.GONE
        shareButton.visibility = if (multiSelectMode && selectedPhotoPaths.isNotEmpty()) View.VISIBLE else View.GONE
        copyButton.visibility = if (multiSelectMode && selectedPhotoPaths.isNotEmpty()) View.VISIBLE else View.GONE
        copyButton.isEnabled = !isCopying && pendingCopyPaths == null
        (photosView.adapter as? PhotoAdapter)?.notifyDataSetChanged()
    }

    private fun pickCopyDestination() {
        val selectedPaths = selectedPhotoPaths.toList()
        if (selectedPaths.isEmpty() || pendingCopyPaths != null || isCopying) return

        pendingCopyPaths = selectedPaths
        updateSelectionUi()
        try {
            startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
                addFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or
                        Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                        Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION,
                )
            }, COPY_DESTINATION_REQUEST)
        } catch (error: Exception) {
            pendingCopyPaths = null
            updateSelectionUi()
            showCopyMessage("Unable to open folder picker: ${error.message}")
        }
    }

    private fun copySelectedPhotos(destinationUri: Uri, selectedPaths: List<String>, resultFlags: Int) {
        isCopying = true
        updateSelectionUi()
        Thread {
            val result = runCatching {
                val grantedFlags = resultFlags and (
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or
                        Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    )
                if (grantedFlags != 0) {
                    contentResolver.takePersistableUriPermission(destinationUri, grantedFlags)
                }
                copyPhotosToTree(destinationUri, selectedPaths)
            }
            runOnUiThread {
                isCopying = false
                updateSelectionUi()
                result.onSuccess { summary -> showCopyMessage(summary.message) }
                    .onFailure { error -> showCopyMessage("Copy failed: ${error.message ?: "Unknown error"}") }
            }
        }.start()
    }

    private fun copyPhotosToTree(destinationUri: Uri, selectedPaths: List<String>): CopySummary {
        val destination = requireNotNull(DocumentFile.fromTreeUri(this, destinationUri)) {
            "Selected folder is unavailable"
        }
        val root = AppSettings.rootFolder(this).canonicalFile
        var copied = 0
        var skipped = 0
        var missing = 0
        selectedPaths.forEach { path ->
            val source = File(path).canonicalFile
            if (!source.isFile) {
                missing++
                return@forEach
            }
            val relativePath = source.relativeToOrNull(root)
            if (relativePath == null || relativePath.isAbsolute) {
                skipped++
                return@forEach
            }
            val targetDirectory = relativePath.parentFile
                ?.invariantSeparatorsPath
                ?.split('/')
                ?.filter(String::isNotBlank)
                ?.fold(destination) { directory, name ->
                    directory.findFile(name)?.takeIf(DocumentFile::isDirectory)
                        ?: directory.createDirectory(name)
                        ?: throw IllegalStateException("Unable to create folder: $name")
                }
                ?: destination
            if (targetDirectory.findFile(source.name) != null) {
                skipped++
                return@forEach
            }
            val target = targetDirectory.createFile(contentResolver.getType(Uri.fromFile(source)) ?: "application/octet-stream", source.name)
                ?: throw IllegalStateException("Unable to create file: ${source.name}")
            try {
                source.inputStream().use { input ->
                    requireNotNull(contentResolver.openOutputStream(target.uri, "w")) {
                        "Unable to open destination file: ${source.name}"
                    }.use { output -> input.copyTo(output) }
                }
                copied++
            } catch (error: Exception) {
                target.delete()
                throw error
            }
        }
        return CopySummary(copied, skipped, missing)
    }

    private fun showCopyMessage(message: String) {
        statusView.text = message
        statusView.visibility = View.VISIBLE
    }

    private fun shareSelectedPhotos() {
        val selectedPaths = selectedPhotoPaths.toList()
        if (selectedPaths.isEmpty()) return

        shareButton.isEnabled = false
        Thread {
            val result = runCatching { createShareUris(selectedPaths) }
            runOnUiThread {
                shareButton.isEnabled = true
                result.onSuccess { uris ->
                    if (uris.isEmpty()) return@onSuccess
                    val sendIntent = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                        type = "image/*"
                        putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                        clipData = ClipData.newUri(contentResolver, "Selected photos", uris.first()).apply {
                            uris.drop(1).forEach { addItem(ClipData.Item(it)) }
                        }
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    startActivity(Intent.createChooser(sendIntent, "Share photos"))
                }
            }
        }.start()
    }

    private fun createShareUris(paths: List<String>): ArrayList<Uri> {
        val shareDirectory = File(cacheDir, "shared-photos").apply {
            deleteRecursively()
            mkdirs()
        }
        return ArrayList<Uri>().apply {
            paths.map(::File).filter(File::isFile).forEachIndexed { index, photo ->
                val sharedPhoto = File(shareDirectory, "${index}_${photo.name}")
                photo.copyTo(sharedPhoto)
                add(FileProvider.getUriForFile(this@MainActivity, "$packageName.fileprovider", sharedPhoto))
            }
        }
    }

    private fun scheduleVisiblePhotoLoading() {
        imageLoadHandler.removeCallbacks(loadVisiblePhotos)
        imageLoadHandler.postDelayed(loadVisiblePhotos, IMAGE_LOAD_DEBOUNCE_MS)
    }

    private fun showDateRangePicker() {
        MaterialDatePicker.Builder.dateRangePicker()
            .setTitleText("Select date range")
            .build()
            .apply {
                addOnPositiveButtonClickListener { selection ->
                    activeDateRange = selection.first.toLocalDate()..selection.second.toLocalDate()
                    showPhotos()
                }
            }
            .show(supportFragmentManager, "date_range")
    }

    private fun openSlider(paths: List<String>, position: Int) {
        PhotoSession.paths = paths
        startActivity(Intent(this, PhotoSliderActivity::class.java).putExtra("position", position))
    }

    private fun openAllFilesAccessSettings() {
        hasRequestedAllFilesAccess = true
        startActivity(Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
            data = Uri.parse("package:$packageName")
        })
    }

    private class PhotoAdapter(
        sourcePhotos: List<DigikamLibrary.Photo>,
        rootFolder: File,
        private val thumbnailDatabasePath: String?,
        private val onHeaderClick: () -> Unit,
        private val onPhotoClick: (List<String>, Int) -> Unit,
        private val onPhotoLongClick: (String) -> Unit,
        private val onPhotoSelectionToggle: (String) -> Unit,
        private val isMultiSelectMode: () -> Boolean,
        private val isPhotoSelected: (String) -> Boolean,
        private val spanCount: Int,
    ) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
        private val photos = sourcePhotos.map {
            GridPhoto(File(rootFolder, it.relativePath).path, it.uniqueHash, it.fileSize)
        }
        private val photoPaths = this.photos.map { it.path }
        private val items = buildList {
            var currentMonth: YearMonth? = null
            var hasMonth = false
            for ((index, photo) in sourcePhotos.withIndex()) {
                val month = photo.date?.let(YearMonth::from)
                if (!hasMonth || month != currentMonth) {
                    add(GridItem.Header(month?.let(::formatMonth) ?: "Unknown date", month))
                    currentMonth = month
                    hasMonth = true
                }
                add(GridItem.Photo(photos[index], index))
            }
        }

        override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): RecyclerView.ViewHolder {
            if (viewType == HEADER_VIEW_TYPE) {
                return HeaderViewHolder(TextView(parent.context).apply {
                    setPadding(24, 24, 24, 24)
                    textSize = 18f
                    PunkStyle.title(this)
                })
            }

            val size = parent.width.takeIf { it > 0 }
                ?.div(spanCount)
                ?: parent.resources.displayMetrics.widthPixels / spanCount
            val imageView = ImageView(parent.context).apply {
                scaleType = ImageView.ScaleType.CENTER_CROP
            }
            val missingView = TextView(parent.context).apply {
                gravity = Gravity.CENTER
                text = "Photo not found"
                textSize = 12f
                visibility = View.GONE
                PunkStyle.label(this)
            }
            val selectionOverlay = View(parent.context).apply {
                setBackgroundColor(Color.argb(112, 0, 255, 0))
                visibility = View.GONE
            }
            return PhotoViewHolder(FrameLayout(parent.context).apply {
                layoutParams = RecyclerView.LayoutParams(size, size)
                addView(imageView, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
                addView(missingView, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
                addView(selectionOverlay, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
            }, imageView, missingView, selectionOverlay)
        }

        override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
            when (val item = items[position]) {
                is GridItem.Header -> (holder as HeaderViewHolder).textView.apply {
                    text = item.title
                    setOnClickListener { onHeaderClick() }
                }
                is GridItem.Photo -> bindPhoto(holder as PhotoViewHolder, item)
            }
        }

        override fun getItemViewType(position: Int) = when (items[position]) {
            is GridItem.Header -> HEADER_VIEW_TYPE
            is GridItem.Photo -> PHOTO_VIEW_TYPE
        }

        fun getSpanSize(position: Int) = if (getItemViewType(position) == HEADER_VIEW_TYPE) spanCount else 1

        private fun bindPhoto(holder: PhotoViewHolder, item: GridItem.Photo) {
            val photo = File(item.photo.path)
            holder.boundPhoto = item.photo
            holder.loadRequested = false
            holder.imageView.setImageDrawable(null)
            holder.missingView.visibility = if (photo.isFile) {
                View.GONE
            } else {
                View.VISIBLE
            }
            holder.selectionOverlay.visibility = if (isPhotoSelected(item.photo.path)) View.VISIBLE else View.GONE
            holder.itemView.setOnClickListener {
                if (isMultiSelectMode()) {
                    onPhotoSelectionToggle(item.photo.path)
                } else {
                    onPhotoClick(photoPaths, item.index)
                }
            }
            holder.itemView.setOnLongClickListener {
                if (!isMultiSelectMode()) onPhotoLongClick(item.photo.path)
                true
            }
        }

        fun loadVisible(recyclerView: RecyclerView) {
            for (index in 0 until recyclerView.childCount) {
                val holder = recyclerView.getChildViewHolder(recyclerView.getChildAt(index))
                if (holder is PhotoViewHolder) requestImage(holder, recyclerView)
            }
        }

        private fun requestImage(holder: PhotoViewHolder, recyclerView: RecyclerView) {
            val photo = holder.boundPhoto ?: return
            if (holder.loadRequested || !File(photo.path).isFile) return

            holder.loadRequested = true
            imageLoader.execute {
                val thumbnail = DigikamThumbnailStore.load(
                    thumbnailDatabasePath,
                    photo.path,
                    photo.uniqueHash,
                    photo.fileSize,
                )
                val bitmap = thumbnail
                    ?.takeUnless(::isPgf)
                    ?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }
                    ?: decodeSampledOriginal(photo.path, recyclerView.width / spanCount)
                recyclerView.post {
                    if (holder.itemView.isAttachedToWindow && holder.boundPhoto == photo) {
                        if (bitmap == null) {
                            holder.missingView.visibility = View.GONE
                        } else {
                            holder.imageView.setImageBitmap(bitmap)
                        }
                    }
                }
            }
        }

        override fun getItemCount() = items.size

        private fun isPgf(data: ByteArray) =
            data.size >= 3 && data[0] == 'P'.code.toByte() && data[1] == 'G'.code.toByte() && data[2] == 'F'.code.toByte()

        private fun decodeSampledOriginal(path: String, targetSize: Int): android.graphics.Bitmap? {
            val safeTargetSize = targetSize.coerceAtLeast(1)
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(path, bounds)
            var sampleSize = 1
            while (
                bounds.outWidth / sampleSize > safeTargetSize * 2 ||
                    bounds.outHeight / sampleSize > safeTargetSize * 2
            ) {
                sampleSize *= 2
            }
            return BitmapFactory.decodeFile(path, BitmapFactory.Options().apply { inSampleSize = sampleSize })
        }

        private sealed class GridItem {
            data class Header(val title: String, val month: YearMonth?) : GridItem()
            data class Photo(val photo: GridPhoto, val index: Int) : GridItem()
        }

        private companion object {
            const val HEADER_VIEW_TYPE = 0
            const val PHOTO_VIEW_TYPE = 1

            fun formatMonth(month: YearMonth): String {
                val locale = Locale.getDefault()
                return month.format(DateTimeFormatter.ofPattern("LLLL, yyyy", locale))
                    .replaceFirstChar { it.titlecase(locale) }
            }
        }
    }

    private class PhotoViewHolder(
        view: View,
        val imageView: ImageView,
        val missingView: TextView,
        val selectionOverlay: View,
    ) : RecyclerView.ViewHolder(view) {
        var boundPhoto: GridPhoto? = null
        var loadRequested = false
    }

    private class HeaderViewHolder(val textView: TextView) : RecyclerView.ViewHolder(textView)

    private data class GridPhoto(val path: String, val uniqueHash: String?, val fileSize: Long)

    private data class CopySummary(val copied: Int, val skipped: Int, val missing: Int) {
        val message: String
            get() = buildString {
                append("Copied $copied photo${if (copied == 1) "" else "s"}.")
                if (skipped > 0) append(" Skipped $skipped existing or out-of-library file${if (skipped == 1) "" else "s"}.")
                if (missing > 0) append(" $missing source file${if (missing == 1) " was" else "s were"} missing.")
            }
    }

    private fun Long.toLocalDate() = Instant.ofEpochMilli(this).atZone(ZoneOffset.UTC).toLocalDate()

    private companion object {
        const val IMAGE_LOAD_DEBOUNCE_MS = 300L
        const val FILTER_REQUEST = 1
        const val COPY_DESTINATION_REQUEST = 2
        val imageLoader = Executors.newFixedThreadPool(2)
    }
}
