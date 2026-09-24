package ru.example.ninexfifteen

import android.app.WallpaperManager
import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.io.File
import java.util.concurrent.TimeUnit

object WallpaperRotation {
    private const val WORK_NAME = "wallpaper-rotation"

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
        if (!AppSettings.wallpaperRotationEnabled(applicationContext) || tags.isEmpty()) return Result.success()

        return runCatching {
            val photo = DigikamLibrary(applicationContext).loadPhotos(tags)
                .map { File(AppSettings.rootFolder(applicationContext), it.relativePath) }
                .filter(File::isFile)
                .randomOrNull()
                ?: return Result.success()
            photo.inputStream().use { input ->
                WallpaperManager.getInstance(applicationContext).setStream(
                    input,
                    null,
                    true,
                    WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK,
                )
            }
        }.fold(
            onSuccess = { Result.success() },
            onFailure = { Result.retry() },
        )
    }
}
