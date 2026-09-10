package ru.example.ninexfifteen

import android.content.Context
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.widget.ImageView

class ZoomImageView(context: Context) : ImageView(context) {
    private val scaleDetector = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
        override fun onScale(scaleGestureDetector: ScaleGestureDetector): Boolean {
            scale = (scale * scaleGestureDetector.scaleFactor).coerceIn(MIN_SCALE, MAX_SCALE)
            applyTransform()
            parent.requestDisallowInterceptTouchEvent(true)
            return true
        }
    })
    private var scale = MIN_SCALE
    private var lastX = 0f
    private var lastY = 0f

    override fun onTouchEvent(event: MotionEvent): Boolean {
        scaleDetector.onTouchEvent(event)
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastX = event.x
                lastY = event.y
            }

            MotionEvent.ACTION_MOVE -> if (!scaleDetector.isInProgress && scale > MIN_SCALE) {
                translationX += event.x - lastX
                translationY += event.y - lastY
                applyTransform()
                parent.requestDisallowInterceptTouchEvent(true)
            }

            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                if (scale == MIN_SCALE) parent.requestDisallowInterceptTouchEvent(false)
            }
        }
        lastX = event.x
        lastY = event.y
        return true
    }

    fun resetZoom() {
        scale = MIN_SCALE
        translationX = 0f
        translationY = 0f
        applyTransform()
    }

    private fun applyTransform() {
        scaleX = scale
        scaleY = scale
        val maxX = width * (scale - 1f) / 2f
        val maxY = height * (scale - 1f) / 2f
        translationX = translationX.coerceIn(-maxX, maxX)
        translationY = translationY.coerceIn(-maxY, maxY)
    }

    private companion object {
        const val MIN_SCALE = 1f
        const val MAX_SCALE = 5f
    }
}
