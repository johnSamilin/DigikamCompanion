package ru.example.ninexfifteen

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.file.Files
import java.time.LocalDateTime
import java.time.ZoneId

class PhotoSortingPlanTest {
    @Test
    fun `plans supported DCIM photos into year month folders`() {
        val dcim = Files.createTempDirectory("dcim").toFile()
        val root = Files.createTempDirectory("library").toFile()
        try {
            val photo = dcim.resolve("Camera/IMG_001.JPG").apply {
                parentFile!!.mkdirs()
                writeText("photo")
                setLastModified(LocalDateTime.of(2024, 3, 5, 12, 0).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
            }
            dcim.resolve("Camera/readme.txt").writeText("not a photo")

            val plan = PhotoSorting.plan(dcim, root)

            assertEquals(listOf("2024/03"), plan.folders)
            assertEquals(1, plan.photos.size)
            assertEquals(photo, plan.photos.single().source)
            assertEquals(root.resolve("2024/03/IMG_001.JPG"), plan.photos.single().target)
        } finally {
            dcim.deleteRecursively()
            root.deleteRecursively()
        }
    }

    @Test
    fun `does not plan photo already in its destination folder`() {
        val dcim = Files.createTempDirectory("dcim").toFile()
        try {
            val photo = dcim.resolve("2024/03/IMG_001.jpg").apply {
                parentFile!!.mkdirs()
                writeText("photo")
                setLastModified(LocalDateTime.of(2024, 3, 5, 12, 0).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
            }

            assertTrue(PhotoSorting.plan(dcim, dcim).photos.isEmpty())
        } finally {
            dcim.deleteRecursively()
        }
    }

    @Test
    fun `keeps existing destination files and folders when sorting`() {
        val dcim = Files.createTempDirectory("dcim").toFile()
        val root = Files.createTempDirectory("library").toFile()
        try {
            val timestamp = LocalDateTime.of(2024, 3, 5, 12, 0)
                .atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
            dcim.resolve("IMG_001.jpg").apply {
                writeText("new photo")
                setLastModified(timestamp)
            }
            val destination = root.resolve("2024/03").apply { mkdirs() }
            destination.resolve("IMG_001.jpg").writeText("existing photo")
            destination.resolve("keep.txt").writeText("keep me")
            destination.resolve("nested").mkdir()

            val result = PhotoSorting.sort(PhotoSorting.plan(dcim, root))

            assertEquals(1, result.moved)
            assertEquals("existing photo", destination.resolve("IMG_001.jpg").readText())
            assertEquals("keep me", destination.resolve("keep.txt").readText())
            assertTrue(destination.resolve("nested").isDirectory)
            assertEquals("new photo", destination.resolve("IMG_001_1.jpg").readText())
        } finally {
            dcim.deleteRecursively()
            root.deleteRecursively()
        }
    }
}
