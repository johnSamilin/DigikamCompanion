package ru.example.ninexfifteen

import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.TextView

object PunkStyle {
    private const val INK = 0xFF1A1A1A.toInt()
    private const val ACID_GREEN = 0xFF00FF00.toInt()
    private const val BRICK = 0xFFB44A35.toInt()

    fun screen(view: View) {
        view.setBackgroundColor(Color.WHITE)
    }

    fun outlined(view: View, fill: Int = Color.WHITE) {
        view.background = GradientDrawable().apply {
            setColor(fill)
            setStroke(view.context.dp(2), INK)
        }
    }

    fun panel(view: View) {
        view.background = GradientDrawable().apply {
            setColor(Color.WHITE)
            setStroke(view.context.dp(3), Color.BLACK)
        }
    }

    fun button(button: Button, primary: Boolean = true) {
        button.background = GradientDrawable().apply {
            setColor(if (primary) ACID_GREEN else BRICK)
            setStroke(button.context.dp(3), Color.BLACK)
        }
        button.setTextColor(Color.BLACK)
        button.isAllCaps = true
        button.typeface = Typeface.DEFAULT_BOLD
        button.letterSpacing = 0.12f
        button.rotation = -1f
    }

    fun title(textView: TextView) {
        label(textView)
        textView.typeface = Typeface.DEFAULT_BOLD
        textView.letterSpacing = 0.06f
    }

    fun label(textView: TextView) {
        textView.setTextColor(Color.BLACK)
    }

    fun input(input: EditText) {
        outlined(input)
        input.setPadding(input.context.dp(12), 0, input.context.dp(12), 0)
        input.minHeight = input.context.dp(64)
        input.textSize = 20f
        title(input)
    }

    fun checkBox(checkBox: CheckBox) {
        checkBox.buttonTintList = ColorStateList(
            arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()),
            intArrayOf(ACID_GREEN, Color.WHITE),
        )
        checkBox.rotation = -2f
    }

    private fun android.content.Context.dp(value: Int) =
        (value * resources.displayMetrics.density).toInt()
}
