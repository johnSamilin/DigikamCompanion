package ru.example.ninexfifteen

import org.junit.Assert.assertEquals
import org.junit.Test

class PhotoTagsTest {
    @Test fun onlyTagsPresentOnEveryPhotoAreCommon() {
        val tags = mapOf("one" to setOf(1L, 2L), "two" to setOf(1L, 3L))
        assertEquals(setOf(1L), PhotoTags.common(tags))
    }

    @Test fun emptySelectionHasNoCommonTags() {
        assertEquals(emptySet<Long>(), PhotoTags.common(emptyMap()))
    }

    @Test fun changesOnlyAddSelectedTagsAndRemoveOriginallyCommonTags() {
        val changes = PhotoTags.changes(setOf(1L), setOf(2L))
        assertEquals(setOf(2L), changes.added)
        assertEquals(setOf(1L), changes.removed)
        val firstPhoto = setOf(1L, 3L)
        val secondPhoto = setOf(1L, 4L)
        assertEquals(setOf(2L, 3L), (firstPhoto - changes.removed) + changes.added)
        assertEquals(setOf(2L, 4L), (secondPhoto - changes.removed) + changes.added)
    }
}
