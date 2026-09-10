package ru.example.ninexfifteen

import android.app.Activity
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.SpannableString
import android.text.Spanned
import android.text.TextWatcher
import android.text.style.BackgroundColorSpan
import android.view.Gravity
import android.view.View
import android.widget.CheckBox
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.tabs.TabLayout

class FilterActivity : Activity() {
    private lateinit var tagsView: RecyclerView
    private lateinit var albumsView: RecyclerView
    private lateinit var statusView: TextView
    private var selectedTagIds = mutableSetOf<Long>()
    private var selectedAlbumIds = mutableSetOf<Long>()
    private var childrenById = emptyMap<Long?, List<DigikamLibrary.Tag>>()
    private var childrenByAlbumId = emptyMap<Long?, List<DigikamLibrary.Album>>()
    private var tagAdapter: TagAdapter? = null
    private var albumAdapter: AlbumAdapter? = null
    private val searchHandler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        selectedTagIds = AppSettings.selectedTagIds(this).toMutableSet()
        selectedAlbumIds = AppSettings.selectedAlbumIds(this).toMutableSet()

        tagsView = RecyclerView(this).apply {
            layoutManager = LinearLayoutManager(this@FilterActivity)
        }
        albumsView = RecyclerView(this).apply {
            layoutManager = LinearLayoutManager(this@FilterActivity)
        }
        statusView = TextView(this).apply {
            gravity = Gravity.CENTER
            text = "Loading tags..."
            PunkStyle.label(this)
        }
        val content = FrameLayout(this).apply {
            addView(
                searchContainer("Search tags", tagsView) { query ->
                    tagAdapter?.updateQuery(query)?.let(tagsView::scrollToPosition)
                },
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            )
            addView(
                searchContainer("Search albums", albumsView) { query ->
                    albumAdapter?.updateQuery(query)?.let(albumsView::scrollToPosition)
                }.apply { visibility = View.GONE },
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            )
            addView(statusView, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        }
        val tabs = TabLayout(this).apply {
            setBackgroundColor(Color.WHITE)
            setSelectedTabIndicatorColor(Color.rgb(26, 26, 26))
            setSelectedTabIndicatorHeight((3 * resources.displayMetrics.density).toInt())
            setTabTextColors(ColorStateList.valueOf(Color.rgb(26, 26, 26)))
            addTab(newTab().setText("Tags"), true)
            addTab(newTab().setText("Albums"))
            addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
                override fun onTabSelected(tab: TabLayout.Tab) {
                    val showingTags = tab.position == TAGS_TAB
                    (tagsView.parent as View).visibility = if (showingTags) View.VISIBLE else View.GONE
                    (albumsView.parent as View).visibility = if (showingTags) View.GONE else View.VISIBLE
                }

                override fun onTabUnselected(tab: TabLayout.Tab) = Unit
                override fun onTabReselected(tab: TabLayout.Tab) = Unit
            })
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            PunkStyle.screen(this)
            addView(tabs)
            addView(
                content,
                LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f),
            )
        })
        loadTags()
    }

    private fun loadTags() {
        Thread {
            val result = runCatching {
                DigikamLibrary(this).run { loadTags() to loadAlbums() }
            }
            runOnUiThread {
                val (tags, albums) = result.getOrElse {
                    statusView.text = "Unable to load filters: ${it.message}"
                    return@runOnUiThread
                }
                val allChildrenById = tags.groupBy { it.parentId }
                val systemTagIds = systemTagIds(tags, allChildrenById)
                selectedTagIds.removeAll(systemTagIds)
                AppSettings.saveSelectedTagIds(this, selectedTagIds)
                val visibleTags = tags.filter { it.id !in systemTagIds }
                childrenById = visibleTags.groupBy { it.parentId }
                tagAdapter = TagAdapter(flattenTags(visibleTags), selectedTagIds, ::toggleTag)
                tagsView.adapter = tagAdapter
                childrenByAlbumId = albumChildren(albums)
                albumAdapter = AlbumAdapter(flattenAlbums(albums), selectedAlbumIds, ::toggleAlbum)
                albumsView.adapter = albumAdapter
                statusView.visibility = View.GONE
            }
        }.start()
    }

    private fun flattenTags(tags: List<DigikamLibrary.Tag>): List<TreeTag> = buildList {
        val tagIds = tags.mapTo(mutableSetOf()) { it.id }
        fun addBranch(tag: DigikamLibrary.Tag, depth: Int) {
            add(TreeTag(tag, depth))
            childrenById[tag.id].orEmpty().forEach { addBranch(it, depth + 1) }
        }
        tags.filter { it.parentId !in tagIds }.forEach { addBranch(it, 0) }
    }

    private fun systemTagIds(
        tags: List<DigikamLibrary.Tag>,
        allChildrenById: Map<Long?, List<DigikamLibrary.Tag>>,
    ): Set<Long> = buildSet {
        fun addBranch(tag: DigikamLibrary.Tag) {
            add(tag.id)
            allChildrenById[tag.id].orEmpty().forEach(::addBranch)
        }
        tags.filter { it.name.startsWith("_Digikam_", ignoreCase = true) }.forEach(::addBranch)
    }

    private fun toggleTag(tag: DigikamLibrary.Tag) {
        val subtree = buildSet {
            fun addChildren(current: DigikamLibrary.Tag) {
                add(current.id)
                childrenById[current.id].orEmpty().forEach(::addChildren)
            }
            addChildren(tag)
        }
        if (tag.id in selectedTagIds) {
            selectedTagIds.removeAll(subtree)
        } else {
            selectedTagIds.addAll(subtree)
        }
        AppSettings.saveSelectedTagIds(this, selectedTagIds)
        tagsView.adapter?.notifyDataSetChanged()
    }

    private fun albumChildren(albums: List<DigikamLibrary.Album>): Map<Long?, List<DigikamLibrary.Album>> {
        val albumsByPath = albums.associateBy { it.rootId to it.relativePath.trim('/') }
        return albums.groupBy { album ->
            val path = album.relativePath.trim('/')
            if (path.isEmpty()) {
                null
            } else {
                val parentPath = path.substringBeforeLast('/', "")
                albumsByPath[album.rootId to parentPath]?.id
            }
        }
    }

    private fun flattenAlbums(albums: List<DigikamLibrary.Album>): List<TreeAlbum> = buildList {
        fun addBranch(album: DigikamLibrary.Album, depth: Int) {
            add(TreeAlbum(album, depth))
            childrenByAlbumId[album.id].orEmpty().forEach { addBranch(it, depth + 1) }
        }
        childrenByAlbumId[null].orEmpty().forEach { addBranch(it, 0) }
    }

    private fun toggleAlbum(album: DigikamLibrary.Album) {
        val subtree = buildSet {
            fun addChildren(current: DigikamLibrary.Album) {
                add(current.id)
                childrenByAlbumId[current.id].orEmpty().forEach(::addChildren)
            }
            addChildren(album)
        }
        if (album.id in selectedAlbumIds) {
            selectedAlbumIds.removeAll(subtree)
        } else {
            selectedAlbumIds.addAll(subtree)
        }
        AppSettings.saveSelectedAlbumIds(this, selectedAlbumIds)
        albumsView.adapter?.notifyDataSetChanged()
    }

    private fun searchContainer(
        hint: String,
        list: RecyclerView,
        onQueryChanged: (String) -> Unit,
    ): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        val input = EditText(this@FilterActivity).apply {
            this.hint = hint
            PunkStyle.input(this)
        }
        addView(input, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        addView(list, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
        input.addTextChangedListener(object : TextWatcher {
            private var pendingSearch: Runnable? = null

            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit

            override fun afterTextChanged(editable: android.text.Editable?) {
                pendingSearch?.let(searchHandler::removeCallbacks)
                pendingSearch = Runnable { onQueryChanged(editable?.toString().orEmpty()) }
                searchHandler.postDelayed(pendingSearch!!, SEARCH_DEBOUNCE_MS)
            }
        })
    }

    private data class TreeTag(val tag: DigikamLibrary.Tag, val depth: Int)
    private data class TreeAlbum(val album: DigikamLibrary.Album, val depth: Int)

    private class TagAdapter(
        private val tags: List<TreeTag>,
        private val selectedTagIds: Set<Long>,
        private val onTagClick: (DigikamLibrary.Tag) -> Unit,
    ) : RecyclerView.Adapter<TagViewHolder>() {
        private var query = ""

        fun updateQuery(value: String): Int? {
            query = value
            notifyDataSetChanged()
            return tags.indexOfFirst { it.tag.name.contains(query, ignoreCase = true) }.takeIf { it >= 0 }
        }

        override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): TagViewHolder {
            val rowHeight = (56 * parent.resources.displayMetrics.density).toInt()
            val label = TextView(parent.context).apply {
                gravity = Gravity.CENTER_VERTICAL
                textSize = 16f
                PunkStyle.title(this)
            }
            val checkBox = CheckBox(parent.context).apply { PunkStyle.checkBox(this) }
            return TagViewHolder(LinearLayout(parent.context).apply {
                gravity = Gravity.CENTER_VERTICAL
                layoutParams = RecyclerView.LayoutParams(
                    RecyclerView.LayoutParams.MATCH_PARENT,
                    rowHeight,
                )
                PunkStyle.outlined(this)
                addView(label, LinearLayout.LayoutParams(0, rowHeight, 1f))
                addView(checkBox, LinearLayout.LayoutParams.WRAP_CONTENT, rowHeight)
            }, label, checkBox)
        }

        override fun onBindViewHolder(holder: TagViewHolder, position: Int) {
            val treeTag = tags[position]
            holder.label.apply {
                text = highlightedText(treeTag.tag.name, query)
                val density = resources.displayMetrics.density
                setPadding(((24 + treeTag.depth * 32) * density).toInt(), 0, 0, 0)
                setOnClickListener { onTagClick(treeTag.tag) }
            }
            holder.checkBox.apply {
                isChecked = treeTag.tag.id in selectedTagIds
                setOnClickListener { onTagClick(treeTag.tag) }
            }
        }

        override fun getItemCount() = tags.size
    }

    private class AlbumAdapter(
        private val albums: List<TreeAlbum>,
        private val selectedAlbumIds: Set<Long>,
        private val onAlbumClick: (DigikamLibrary.Album) -> Unit,
    ) : RecyclerView.Adapter<AlbumViewHolder>() {
        private var query = ""

        fun updateQuery(value: String): Int? {
            query = value
            notifyDataSetChanged()
            return albums.indexOfFirst { albumName(it.album).contains(query, ignoreCase = true) }.takeIf { it >= 0 }
        }

        override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): AlbumViewHolder {
            val rowHeight = (56 * parent.resources.displayMetrics.density).toInt()
            val label = TextView(parent.context).apply {
                gravity = Gravity.CENTER_VERTICAL
                textSize = 16f
                PunkStyle.title(this)
            }
            val checkBox = CheckBox(parent.context).apply { PunkStyle.checkBox(this) }
            return AlbumViewHolder(LinearLayout(parent.context).apply {
                layoutParams = RecyclerView.LayoutParams(RecyclerView.LayoutParams.MATCH_PARENT, rowHeight)
                gravity = Gravity.CENTER_VERTICAL
                PunkStyle.outlined(this)
                addView(label, LinearLayout.LayoutParams(0, rowHeight, 1f))
                addView(checkBox, LinearLayout.LayoutParams.WRAP_CONTENT, rowHeight)
            }, label, checkBox)
        }

        override fun onBindViewHolder(holder: AlbumViewHolder, position: Int) {
            val treeAlbum = albums[position]
            holder.label.apply {
                text = highlightedText(albumName(treeAlbum.album), query)
                val density = resources.displayMetrics.density
                setPadding(((24 + treeAlbum.depth * 32) * density).toInt(), 0, 0, 0)
                setOnClickListener { onAlbumClick(treeAlbum.album) }
            }
            holder.checkBox.apply {
                isChecked = treeAlbum.album.id in selectedAlbumIds
                setOnClickListener { onAlbumClick(treeAlbum.album) }
            }
        }

        override fun getItemCount() = albums.size

        private fun albumName(album: DigikamLibrary.Album) =
            album.relativePath.trim('/').substringAfterLast('/').ifEmpty { "/" }
    }

    private class TagViewHolder(
        view: View,
        val label: TextView,
        val checkBox: CheckBox,
    ) : RecyclerView.ViewHolder(view)

    private class AlbumViewHolder(
        view: View,
        val label: TextView,
        val checkBox: CheckBox,
    ) : RecyclerView.ViewHolder(view)

    private companion object {
        const val TAGS_TAB = 0
        const val SEARCH_DEBOUNCE_MS = 300L

        fun highlightedText(text: String, query: String): CharSequence {
            if (query.isBlank()) return text

            val result = SpannableString(text)
            var start = text.indexOf(query, ignoreCase = true)
            while (start >= 0) {
                result.setSpan(
                    BackgroundColorSpan(Color.YELLOW),
                    start,
                    start + query.length,
                    Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
                )
                start = text.indexOf(query, start + query.length, ignoreCase = true)
            }
            return result
        }
    }
}
