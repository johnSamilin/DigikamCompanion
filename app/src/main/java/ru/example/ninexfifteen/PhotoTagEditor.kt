package ru.example.ninexfifteen

import android.app.Activity
import android.app.AlertDialog
import android.widget.Toast

internal object PhotoTagEditor {
    fun open(activity: Activity, paths: List<String>, onSaved: () -> Unit) {
        if (paths.isEmpty()) return
        Thread {
            val result = runCatching { DigikamLibrary(activity).loadPhotoTags(paths) }
            activity.runOnUiThread {
                result.onSuccess { selection -> showDialog(activity, paths, selection, onSaved) }
                    .onFailure { showError(activity, "Unable to load tags", it) }
            }
        }.start()
    }

    private fun showDialog(
        activity: Activity,
        paths: List<String>,
        selection: DigikamLibrary.PhotoTagSelection,
        onSaved: () -> Unit,
    ) {
        val tags = visibleTags(selection.tags)
        val common = PhotoTags.common(selection.tagsByPhoto).intersect(tags.map { it.id }.toSet())
        val selected = common.toMutableSet()
        val parents = selection.tags.associateBy { it.id }
        val names = tags.map { tag ->
            var depth = 0
            var parent = tag.parentId
            val visited = mutableSetOf<Long>()
            while (parent != null && visited.add(parent)) {
                depth++
                parent = parents[parent]?.parentId
            }
            "  ".repeat(depth) + tag.name
        }.toTypedArray()
        AlertDialog.Builder(activity)
            .setTitle(if (paths.size == 1) "Photo tags" else "Common tags (${paths.size} photos) · Other tags kept")
            .setMultiChoiceItems(names, BooleanArray(tags.size) { tags[it].id in common }) { _, index, checked ->
                if (checked) selected.add(tags[index].id) else selected.remove(tags[index].id)
            }
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Save") { _, _ ->
                val changes = PhotoTags.changes(common, selected)
                if (changes.added.isEmpty() && changes.removed.isEmpty()) return@setPositiveButton
                Thread {
                    val result = runCatching { DigikamLibrary(activity).updatePhotoTags(paths, changes) }
                    activity.runOnUiThread {
                        result.onSuccess { onSaved() }
                            .onFailure { showError(activity, "Unable to save tags", it) }
                    }
                }.start()
            }
            .show()
    }

    private fun visibleTags(tags: List<DigikamLibrary.Tag>): List<DigikamLibrary.Tag> {
        val byId = tags.associateBy { it.id }
        fun isSystem(tag: DigikamLibrary.Tag): Boolean {
            var current: DigikamLibrary.Tag? = tag
            val visited = mutableSetOf<Long>()
            while (current != null && visited.add(current.id)) {
                if (current.name.startsWith("_Digikam_", ignoreCase = true)) return true
                current = current.parentId?.let(byId::get)
            }
            return false
        }
        return tags.filterNot(::isSystem)
    }

    private fun showError(activity: Activity, message: String, error: Throwable) {
        Toast.makeText(activity, "$message: ${error.message}", Toast.LENGTH_LONG).show()
    }
}
