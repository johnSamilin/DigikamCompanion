package ru.example.ninexfifteen

import android.content.res.Configuration
import org.junit.Assert.assertEquals
import org.junit.Test

class PhotoGridSpanCountTest {
    @Test
    fun `uses eight columns in landscape orientation`() {
        assertEquals(8, photoGridSpanCount(Configuration.ORIENTATION_LANDSCAPE))
    }

    @Test
    fun `uses four columns in portrait orientation`() {
        assertEquals(4, photoGridSpanCount(Configuration.ORIENTATION_PORTRAIT))
    }
}
