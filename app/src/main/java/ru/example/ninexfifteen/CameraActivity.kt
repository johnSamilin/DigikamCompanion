package ru.example.ninexfifteen

import android.Manifest
import android.content.ContentValues
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CameraActivity : ComponentActivity() {
    private lateinit var previewView: PreviewView
    private lateinit var shutterButton: Button
    private lateinit var zoomButtons: List<Pair<Float, Button>>
    private lateinit var exposureControls: LinearLayout
    private lateinit var exposureLabel: TextView
    private lateinit var exposureSeekBar: SeekBar
    private var camera: androidx.camera.core.Camera? = null
    private var imageCapture: ImageCapture? = null

    private val cameraPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) startCamera() else {
            Toast.makeText(this, "Camera permission is required", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val reference = File(intent.getStringExtra(EXTRA_REFERENCE_PATH).orEmpty())
        if (!reference.isFile) {
            Toast.makeText(this, "Reference photo not found", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        previewView = PreviewView(this).apply {
            scaleType = PreviewView.ScaleType.FIT_CENTER
        }
        val referenceView = ImageView(this).apply {
            setImageURI(Uri.fromFile(reference))
            alpha = REFERENCE_ALPHA
            scaleType = ImageView.ScaleType.FIT_CENTER
            contentDescription = "Reference photo"
        }
        shutterButton = Button(this).apply {
            text = "Take photo"
            PunkStyle.button(this)
            setOnClickListener { takePhoto() }
        }
        val controls = createCameraControls()
        setContentView(FrameLayout(this).apply {
            addView(previewView, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
            addView(referenceView, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
            addView(controls, FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL,
            ).apply { setMargins(dp(16), 0, dp(16), dp(CONTROLS_BOTTOM_MARGIN_DP)) })
            addView(shutterButton, FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL,
            ).apply { setMargins(0, 0, 0, dp(SHUTTER_BOTTOM_MARGIN_DP)) })
        })

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            cameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    private fun createCameraControls() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(12), dp(8), dp(12), dp(8))
        PunkStyle.panel(this)

        val zoomRow = LinearLayout(this@CameraActivity).apply {
            gravity = Gravity.CENTER
        }
        zoomButtons = ZOOM_PRESETS.map { zoom ->
            zoom to Button(this@CameraActivity).apply {
                text = zoomLabel(zoom)
                contentDescription = "Set zoom to ${zoom} times"
                PunkStyle.button(this, primary = false)
                setOnClickListener { setZoom(zoom) }
                isEnabled = false
                alpha = DISABLED_ALPHA
            }.also { button ->
                zoomRow.addView(button, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                    setMargins(dp(3), 0, dp(3), 0)
                })
            }
        }
        addView(zoomRow, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)

        exposureControls = LinearLayout(this@CameraActivity).apply {
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(6), 0, 0)
        }
        exposureLabel = TextView(this@CameraActivity).apply {
            PunkStyle.label(this)
            text = "EV 0.0"
        }
        exposureSeekBar = SeekBar(this@CameraActivity).apply {
            contentDescription = "Exposure compensation"
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar, progress: Int, fromUser: Boolean) {
                    if (fromUser) setExposureCompensation(progress)
                }

                override fun onStartTrackingTouch(seekBar: SeekBar) = Unit
                override fun onStopTrackingTouch(seekBar: SeekBar) = Unit
            })
        }
        exposureControls.addView(exposureLabel, LinearLayout.LayoutParams(dp(EXPOSURE_LABEL_WIDTH_DP), LinearLayout.LayoutParams.WRAP_CONTENT))
        exposureControls.addView(exposureSeekBar, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        addView(exposureControls, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val provider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }
            imageCapture = ImageCapture.Builder().build()
            provider.unbindAll()
            camera = provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, imageCapture)
            configureCameraControls()
        }, ContextCompat.getMainExecutor(this))
    }

    private fun configureCameraControls() {
        val activeCamera = camera ?: return
        val zoomState = activeCamera.cameraInfo.zoomState.value ?: return
        zoomButtons.forEach { (ratio, button) ->
            button.isEnabled = ratio in zoomState.minZoomRatio..zoomState.maxZoomRatio
            button.alpha = if (button.isEnabled) 1f else DISABLED_ALPHA
        }
        setZoom(1f.coerceIn(zoomState.minZoomRatio, zoomState.maxZoomRatio))

        val exposure = activeCamera.cameraInfo.exposureState
        exposureControls.visibility = if (exposure.isExposureCompensationSupported) View.VISIBLE else View.GONE
        if (!exposure.isExposureCompensationSupported) return

        exposureSeekBar.min = exposure.exposureCompensationRange.lower
        exposureSeekBar.max = exposure.exposureCompensationRange.upper
        exposureSeekBar.progress = exposure.exposureCompensationIndex
        updateExposureLabel(exposure.exposureCompensationIndex)
    }

    private fun setZoom(ratio: Float) {
        val activeCamera = camera ?: return
        activeCamera.cameraControl.setZoomRatio(ratio)
        zoomButtons.forEach { (preset, button) ->
            PunkStyle.button(button, primary = preset == ratio)
        }
    }

    private fun setExposureCompensation(index: Int) {
        val activeCamera = camera ?: return
        val exposure = activeCamera.cameraInfo.exposureState
        if (index !in exposure.exposureCompensationRange) return

        activeCamera.cameraControl.setExposureCompensationIndex(index)
        updateExposureLabel(index)
    }

    private fun updateExposureLabel(index: Int) {
        val step = camera?.cameraInfo?.exposureState?.exposureCompensationStep ?: return
        val ev = index * step.numerator.toFloat() / step.denominator
        exposureLabel.text = String.format(Locale.US, "EV %+.1f", ev)
    }

    private fun zoomLabel(zoom: Float) = when (zoom) {
        0.6f -> "0.6x"
        1f -> "1x"
        2f -> "2x"
        else -> "${zoom}x"
    }

    private fun takePhoto() {
        val capture = imageCapture ?: return
        shutterButton.isEnabled = false
        val name = "9x15_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}"
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, name)
            put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg")
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/9x15")
        }
        val output = ImageCapture.OutputFileOptions.Builder(
            contentResolver,
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            values,
        ).build()
        capture.takePicture(output, ContextCompat.getMainExecutor(this), object : ImageCapture.OnImageSavedCallback {
            override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                Toast.makeText(this@CameraActivity, "Photo saved", Toast.LENGTH_SHORT).show()
                shutterButton.isEnabled = true
            }

            override fun onError(exception: ImageCaptureException) {
                Toast.makeText(this@CameraActivity, "Unable to save photo", Toast.LENGTH_SHORT).show()
                shutterButton.isEnabled = true
            }
        })
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    companion object {
        const val EXTRA_REFERENCE_PATH = "reference_path"
        private const val REFERENCE_ALPHA = 0.45f
        private const val SHUTTER_BOTTOM_MARGIN_DP = 32
        private const val CONTROLS_BOTTOM_MARGIN_DP = 104
        private const val EXPOSURE_LABEL_WIDTH_DP = 72
        private const val DISABLED_ALPHA = 0.4f
        private val ZOOM_PRESETS = listOf(0.6f, 1f, 2f)
    }
}
