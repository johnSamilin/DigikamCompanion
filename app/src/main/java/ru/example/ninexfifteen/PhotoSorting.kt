package ru.example.ninexfifteen

import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

object PhotoSorting {
    private val targetDateFormat = DateTimeFormatter.ofPattern("yyyy/MM")
    private val photoExtensions = setOf("jpg", "jpeg", "png", "gif", "bmp", "webp", "heic", "raw", "dng")

    fun plan(dcimFolder: File, rootFolder: File): Plan {
        require(dcimFolder.isDirectory) { "DCIM folder was not found" }
        val entries = dcimFolder.walkTopDown()
            .filter { it.isFile && it.extension.lowercase() in photoExtensions }
            .mapNotNull { source ->
                val folder = targetDateFormat.format(Instant.ofEpochMilli(source.lastModified()).atZone(ZoneId.systemDefault()))
                val target = rootFolder.resolve(folder).resolve(source.name)
                if (source.canonicalFile == target.canonicalFile) null else Entry(source, target, folder)
            }
            .toList()
        return Plan(entries, entries.map(Entry::folder).distinct().sorted())
    }

    fun sort(plan: Plan, onProgress: (Int, Int) -> Unit = { _, _ -> }): Result {
        var moved = 0
        var failed = 0
        val sorted = mutableListOf<SortedPhoto>()
        plan.folders.forEach { folder -> plan.photos.first { it.folder == folder }.target.parentFile!!.mkdirs() }
        plan.photos.forEachIndexed { index, entry ->
            try {
                val target = uniqueTarget(entry.target)
                entry.source.renameTo(target).also { success -> check(success) { "Cannot move ${entry.source.name}" } }
                moved++
                sorted += SortedPhoto(target, entry.folder)
            } catch (_: Exception) {
                failed++
            }
            onProgress(index + 1, plan.photos.size)
        }
        return Result(moved, failed, sorted)
    }

    private fun uniqueTarget(target: File): File {
        if (!target.exists()) return target
        val baseName = target.nameWithoutExtension
        val extension = target.extension.let { if (it.isEmpty()) "" else ".${it}" }
        var number = 1
        while (true) {
            val candidate = target.parentFile!!.resolve("${baseName}_$number$extension")
            if (!candidate.exists()) return candidate
            number++
        }
    }

    data class Plan(val photos: List<Entry>, val folders: List<String>)
    data class Entry(val source: File, val target: File, val folder: String)
    data class SortedPhoto(val file: File, val folder: String)
    data class Result(val moved: Int, val failed: Int, val sortedPhotos: List<SortedPhoto>)
}
