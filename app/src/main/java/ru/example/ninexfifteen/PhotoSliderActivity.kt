package ru.example.ninexfifteen

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.FileProvider
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.ViewPager2
import java.io.File
import kotlin.math.roundToInt

class PhotoSliderActivity : Activity() {
    private lateinit var detailsPanel: LinearLayout
    private lateinit var pathView: TextView
    private lateinit var shareButton: Button
    private lateinit var photos: List<String>
    private var currentPhotoPosition = 0
    private var hiddenPanelOffset = 0f
    private var panelIsVisible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        photos = PhotoSession.paths
        if (photos.isEmpty()) {
            finish()
            return
        }

        val initialPosition = intent.getIntExtra(EXTRA_POSITION, 0).coerceIn(0, photos.lastIndex)
        val slider = ViewPager2(this).apply {
            adapter = SliderAdapter(photos)
            setCurrentItem(initialPosition, false)
            registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
                override fun onPageSelected(position: Int) = showPhotoPath(position)
            })
        }
        val root = FrameLayout(this).apply {
            addView(slider, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        }
        detailsPanel = createDetailsPanel().also { panel ->
            root.addView(panel, FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL,
            ))
            panel.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ ->
                hiddenPanelOffset = (panel.height - dp(GRAB_HEIGHT_DP)).coerceAtLeast(0).toFloat()
                panel.translationY = if (panelIsVisible) 0f else hiddenPanelOffset
            }
        }
        root.addOnLayoutChangeListener { _, left, _, right, _, oldLeft, _, oldRight, _ ->
            if (right - left != oldRight - oldLeft) {
                updateDetailsPanelWidth(root)
            }
        }
        setContentView(root)
        showPhotoPath(initialPosition)
    }

    private fun createDetailsPanel() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        PunkStyle.panel(this)

        val grabStrip = View(this@PhotoSliderActivity).apply {
            contentDescription = "Drag photo details"
            setOnTouchListener(::handlePanelDrag)
        }
        addView(grabStrip, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(GRAB_HEIGHT_DP),
        ))

        pathView = TextView(this@PhotoSliderActivity).apply {
            PunkStyle.label(this)
            setPadding(dp(16), dp(8), dp(16), dp(8))
            textSize = 16f
        }
        addView(pathView, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        ))

        shareButton = Button(this@PhotoSliderActivity).apply {
            text = "Share"
            PunkStyle.button(this)
            setOnClickListener { shareVisiblePhoto() }
        }
        addView(shareButton, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { setMargins(dp(16), 0, dp(16), dp(16)) })
    }

    private fun updateDetailsPanelWidth(root: FrameLayout) {
        val availableWidth = root.width
        if (availableWidth == 0) return

        val width = (availableWidth * detailsPanelWidthFraction()).roundToInt()
        val layoutParams = detailsPanel.layoutParams as FrameLayout.LayoutParams
        if (layoutParams.width != width) {
            layoutParams.width = width
            layoutParams.gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            detailsPanel.layoutParams = layoutParams
        }
    }

    private fun detailsPanelWidthFraction() = when (resources.configuration.orientation) {
        Configuration.ORIENTATION_LANDSCAPE -> LANDSCAPE_PANEL_WIDTH_FRACTION
        else -> PORTRAIT_PANEL_WIDTH_FRACTION
    }

    private var dragStartY = 0f
    private var dragStartTranslation = 0f

    private fun handlePanelDrag(view: View, event: MotionEvent): Boolean = when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
            dragStartY = event.rawY
            dragStartTranslation = detailsPanel.translationY
            true
        }

        MotionEvent.ACTION_MOVE -> {
            detailsPanel.translationY = (dragStartTranslation + event.rawY - dragStartY)
                .coerceIn(0f, hiddenPanelOffset)
            true
        }

        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
            panelIsVisible = detailsPanel.translationY < hiddenPanelOffset / 2
            detailsPanel.animate()
                .translationY(if (panelIsVisible) 0f else hiddenPanelOffset)
                .setDuration(PANEL_ANIMATION_DURATION_MS)
                .start()
            true
        }

        else -> false
    }

    private fun showPhotoPath(position: Int) {
        currentPhotoPosition = position
        pathView.text = photos[position]
    }

    private fun shareVisiblePhoto() {
        val photo = File(photos[currentPhotoPosition])
        if (!photo.isFile) {
            Toast.makeText(this, "Photo not found", Toast.LENGTH_SHORT).show()
            return
        }

        shareButton.isEnabled = false
        Thread {
            val result = runCatching { createShareUri(photo) }
            runOnUiThread {
                shareButton.isEnabled = true
                result.onSuccess { uri ->
                    val sendIntent = Intent(Intent.ACTION_SEND).apply {
                        type = contentResolver.getType(Uri.fromFile(photo)) ?: "image/*"
                        putExtra(Intent.EXTRA_STREAM, uri)
                        clipData = ClipData.newUri(contentResolver, "Photo", uri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    runCatching { startActivity(Intent.createChooser(sendIntent, "Share photo")) }
                        .onFailure { Toast.makeText(this, "No app available to share this photo", Toast.LENGTH_SHORT).show() }
                }.onFailure {
                    Toast.makeText(this, "Unable to prepare photo for sharing", Toast.LENGTH_SHORT).show()
                }
            }
        }.start()
    }

    private fun createShareUri(photo: File): Uri {
        val shareDirectory = File(cacheDir, "shared-photos").apply {
            deleteRecursively()
            mkdirs()
        }
        val sharedPhoto = File(shareDirectory, photo.name)
        photo.copyTo(sharedPhoto, overwrite = true)
        return FileProvider.getUriForFile(this, "$packageName.fileprovider", sharedPhoto)
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    private class SliderAdapter(private val paths: List<String>) : RecyclerView.Adapter<SliderViewHolder>() {
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): SliderViewHolder {
            val imageView = ZoomImageView(parent.context).apply {
                scaleType = ImageView.ScaleType.FIT_CENTER
            }
            val missingView = TextView(parent.context).apply {
                text = "Photo not found"
                gravity = android.view.Gravity.CENTER
                PunkStyle.label(this)
            }
            return SliderViewHolder(FrameLayout(parent.context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
                addView(imageView, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
                addView(missingView, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
            }, imageView, missingView)
        }

        override fun onBindViewHolder(holder: SliderViewHolder, position: Int) {
            val photo = File(paths[position])
            holder.imageView.resetZoom()
            holder.imageView.setImageDrawable(null)
            holder.missingView.visibility = if (photo.isFile) {
                holder.imageView.setImageURI(Uri.fromFile(photo))
                android.view.View.GONE
            } else {
                holder.missingView.text = "Photo not found\n${photo.path}"
                android.view.View.VISIBLE
            }
        }

        override fun getItemCount() = paths.size
    }

    private class SliderViewHolder(
        view: android.view.View,
        val imageView: ZoomImageView,
        val missingView: TextView,
    ) : RecyclerView.ViewHolder(view)

    private companion object {
        const val EXTRA_POSITION = "position"
        const val GRAB_HEIGHT_DP = 30
        const val PANEL_ANIMATION_DURATION_MS = 180L
        const val PORTRAIT_PANEL_WIDTH_FRACTION = 0.9f
        const val LANDSCAPE_PANEL_WIDTH_FRACTION = 0.25f
    }
}
