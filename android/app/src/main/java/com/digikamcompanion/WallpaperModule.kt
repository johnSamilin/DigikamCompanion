package com.digikamcompanion

import android.app.WallpaperManager
import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream

class WallpaperModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "WallpaperModule"

    @ReactMethod
    fun setWallpaper(path: String, type: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val wallpaperManager = WallpaperManager.getInstance(context)
            
            // Handle different URI schemes
            val actualPath = when {
                path.startsWith("file://") -> path.substring(7)
                path.startsWith("content://") -> {
                    // For content URIs, we need to handle differently
                    val uri = Uri.parse(path)
                    val inputStream = context.contentResolver.openInputStream(uri)
                    val bitmap = BitmapFactory.decodeStream(inputStream)
                    inputStream?.close()
                    
                    when (type) {
                        "home" -> wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_SYSTEM)
                        "lock" -> wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
                        "both" -> {
                            wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_SYSTEM)
                            wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
                        }
                        else -> wallpaperManager.setBitmap(bitmap)
                    }
                    promise.resolve(null)
                    return
                }
                else -> path
            }
            
            // For file paths
            val file = File(actualPath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Image file not found: $actualPath")
                return
            }
            
            val inputStream = FileInputStream(file)
            val bitmap = BitmapFactory.decodeStream(inputStream)
            inputStream.close()
            
            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode image")
                return
            }
            
            when (type) {
                "home" -> wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_SYSTEM)
                "lock" -> wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
                "both" -> {
                    wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_SYSTEM)
                    wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
                }
                else -> wallpaperManager.setBitmap(bitmap)
            }
            
            // Clean up bitmap
            bitmap.recycle()
            
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("WALLPAPER_ERROR", "Failed to set wallpaper: ${e.message}", e)
        }
    }
}