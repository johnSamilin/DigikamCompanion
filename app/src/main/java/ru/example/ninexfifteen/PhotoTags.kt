package ru.example.ninexfifteen

internal object PhotoTags {
    fun common(tagsByPhoto: Map<String, Set<Long>>): Set<Long> =
        tagsByPhoto.values.reduceOrNull { common, tags -> common intersect tags }.orEmpty()

    fun changes(originalCommon: Set<Long>, selected: Set<Long>): Changes = Changes(
        added = selected - originalCommon,
        removed = originalCommon - selected,
    )

    data class Changes(val added: Set<Long>, val removed: Set<Long>)
}
