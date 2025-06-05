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

class WallpaperModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "WallpaperModule"

    @ReactMethod
    fun setWallpaper(path: String, type: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val wallpaperManager = WallpaperManager.getInstance(context)
            
            val uri = Uri.parse(path)
            val inputStream = context.contentResolver.openInputStream(uri)
            val bitmap = BitmapFactory.decodeStream(inputStream)
            
            when (type) {
                "home" -> wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_SYSTEM)
                "lock" -> wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
                else -> wallpaperManager.setBitmap(bitmap)
            }
            
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}