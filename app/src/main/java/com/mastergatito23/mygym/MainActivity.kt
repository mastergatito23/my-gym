package com.mastergatito23.mygym

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var errorView: TextView

    companion object {
        private const val APP_HOST = "enzogp-mygym.vercel.app"
        private const val REQUEST_POST_NOTIFICATIONS = 4102
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(16, 21, 16)
        window.navigationBarColor = Color.rgb(16, 21, 16)
        MyGymNotifications.createChannel(this)

        val root = FrameLayout(this)
        webView = WebView(this)
        errorView = TextView(this).apply {
            text = "No se pudo conectar con My GYM.\nComprueba tu conexión e inténtalo de nuevo."
            textSize = 17f
            gravity = android.view.Gravity.CENTER
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.rgb(16, 21, 16))
            visibility = View.GONE
            setOnClickListener { webView.reload(); visibility = View.GONE }
        }
        root.addView(webView, FrameLayout.LayoutParams(-1, -1))
        root.addView(errorView, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        webView.settings.loadsImagesAutomatically = true
        webView.settings.javaScriptCanOpenWindowsAutomatically = false
        webView.settings.setSupportMultipleWindows(false)
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = false
        webView.settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        webView.addJavascriptInterface(AndroidBridge(), "MyGymNative")
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return true
                if (uri.scheme == "https" && uri.host == APP_HOST) return false
                if (uri.scheme == "https" || uri.scheme == "http") {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                }
                return true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                errorView.visibility = View.GONE
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                if (request?.isForMainFrame == true) errorView.visibility = View.VISIBLE
            }
        }

        if (savedInstanceState == null) {
            webView.loadUrl("https://enzogp-mygym.vercel.app/")
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    private inner class AndroidBridge {
        @JavascriptInterface
        fun requestNotificationPermission() {
            runOnUiThread {
                if (Build.VERSION.SDK_INT >= 33 &&
                    checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                ) {
                    requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_POST_NOTIFICATIONS)
                } else {
                    notifyWebPermissionResult(true)
                }
            }
        }

        @JavascriptInterface
        fun showTestNotification(): Boolean {
            if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) return false
            runOnUiThread {
                MyGymNotifications.show(this@MainActivity, "My GYM", "¡Notificaciones activadas correctamente!")
            }
            return true
        }

        @JavascriptInterface
        fun scheduleDailyReminder(hour: Int, minute: Int) {
            if (hour !in 0..23 || minute !in 0..59) return
            if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) return
            MyGymNotifications.scheduleDaily(this@MainActivity, hour, minute)
        }

        @JavascriptInterface
        fun cancelDailyReminder() {
            MyGymNotifications.cancelDaily(this@MainActivity)
        }
    }

    private fun notifyWebPermissionResult(granted: Boolean) {
        if (!this::webView.isInitialized) return
        webView.evaluateJavascript(
            "if(window.onMyGymNotificationPermission){window.onMyGymNotificationPermission($granted);}",
            null
        )
    }

    @Deprecated("Deprecated in Android 13; retained for compatibility with the current Activity API")
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_POST_NOTIFICATIONS) {
            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            notifyWebPermissionResult(granted)
            if (granted) MyGymNotifications.rescheduleFromPreferences(this)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (this::webView.isInitialized && webView.canGoBack()) webView.goBack()
        else super.onBackPressed()
    }

    override fun onDestroy() {
        if (this::webView.isInitialized) webView.destroy()
        super.onDestroy()
    }
}
