package ru.example.ninexfifteen

import android.app.WallpaperManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.exifinterface.media.ExifInterface
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import java.io.File
import java.util.concurrent.TimeUnit

object WallpaperRotation {
    private const val WORK_NAME = "wallpaper-rotation"
    private const val CHANGE_NOW_WORK_NAME = "wallpaper-change-now"
    const val KEY_REQUIRE_ENABLED = "require_enabled"

    fun schedule(context: Context) {
        val workManager = WorkManager.getInstance(context)
        if (!AppSettings.wallpaperRotationEnabled(context) || AppSettings.wallpaperRotationTagIds(context).isEmpty()) {
            workManager.cancelUniqueWork(WORK_NAME)
            return
        }

        val request = PeriodicWorkRequestBuilder<WallpaperRotationWorker>(
            AppSettings.wallpaperRotationFrequencyDays(context),
            TimeUnit.DAYS,
        ).build()
        workManager.enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, request)
    }

    fun changeNow(context: Context) {
        val request = OneTimeWorkRequestBuilder<WallpaperRotationWorker>()
            .setInputData(workDataOf(KEY_REQUIRE_ENABLED to false))
            .build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork(CHANGE_NOW_WORK_NAME, ExistingWorkPolicy.REPLACE, request)
    }

    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
    }
}

class WallpaperRotationWorker(
    context: Context,
    parameters: WorkerParameters,
) : Worker(context, parameters) {
    override fun doWork(): Result {
        val tags = AppSettings.wallpaperRotationTagIds(applicationContext)
        val requireEnabled = inputData.getBoolean(WallpaperRotation.KEY_REQUIRE_ENABLED, true)
        if ((requireEnabled && !AppSettings.wallpaperRotationEnabled(applicationContext)) || tags.isEmpty()) {
            return Result.success()
        }

        val photo = try {
            DigikamLibrary(applicationContext).loadPhotos(tags)
                .map { File(AppSettings.rootFolder(applicationContext), it.relativePath) }
                .filter(File::isFile)
                .randomOrNull()
        } catch (error: Throwable) {
            return Result.retry()
        } ?: return Result.success()

        return applyWallpaper(photo)
    }

    private fun applyWallpaper(photo: File): Result = try {
        val wallpaperManager = WallpaperManager.getInstance(applicationContext)
        val metrics = applicationContext.resources.displayMetrics
        val screenWidth = metrics.widthPixels
        val screenHeight = metrics.heightPixels
        val homeWidth = wallpaperManager.desiredMinimumWidth.coerceAtLeast(screenWidth)
        val homeHeight = wallpaperManager.desiredMinimumHeight.coerceAtLeast(screenHeight)

        val bitmap = decodeSampledBitmap(photo, homeWidth, homeHeight) ?: return Result.retry()

        wallpaperManager.setBitmap(
            centerCrop(bitmap, homeWidth, homeHeight),
            null,
            true,
            WallpaperManager.FLAG_SYSTEM,
        )
        wallpaperManager.setBitmap(
            centerCrop(bitmap, screenWidth, screenHeight),
            null,
            true,
            WallpaperManager.FLAG_LOCK,
        )

        Result.success()
    } catch (error: Throwable) {
        Result.retry()
    }

    private fun decodeSampledBitmap(photo: File, targetWidth: Int, targetHeight: Int): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(photo.path, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        var sampleSize = 1
        while (bounds.outWidth / sampleSize > targetWidth * 2 || bounds.outHeight / sampleSize > targetHeight * 2) {
            sampleSize *= 2
        }
        val decoded = BitmapFactory.decodeFile(photo.path, BitmapFactory.Options().apply { inSampleSize = sampleSize })
            ?: return null
        return applyExifRotation(photo, decoded)
    }

    private fun applyExifRotation(photo: File, bitmap: Bitmap): Bitmap {
        val orientation = runCatching {
            ExifInterface(photo.path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
        }.getOrDefault(ExifInterface.ORIENTATION_NORMAL)
        val rotation = when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> 90f
            ExifInterface.ORIENTATION_ROTATE_180 -> 180f
            ExifInterface.ORIENTATION_ROTATE_270 -> 270f
            else -> return bitmap
        }
        return Bitmap.createBitmap(
            bitmap,
            0,
            0,
            bitmap.width,
            bitmap.height,
            Matrix().apply { postRotate(rotation) },
            true,
        ).also { rotated -> if (rotated !== bitmap) bitmap.recycle() }
    }

    private fun centerCrop(source: Bitmap, targetWidth: Int, targetHeight: Int): Bitmap {
        val targetAspect = targetWidth.toFloat() / targetHeight
        val sourceAspect = source.width.toFloat() / source.height
        val cropWidth: Int
        val cropHeight: Int
        if (sourceAspect > targetAspect) {
            cropHeight = source.height
            cropWidth = (source.height * targetAspect).toInt().coerceIn(1, source.width)
        } else {
            cropWidth = source.width
            cropHeight = (source.width / targetAspect).toInt().coerceIn(1, source.height)
        }
        val x = (source.width - cropWidth) / 2
        val y = (source.height - cropHeight) / 2
        return Bitmap.createBitmap(source, x, y, cropWidth, cropHeight)
    }
}
