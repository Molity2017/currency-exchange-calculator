# تصدير المشروع إلى تطبيق Android

## الخطوات المطلوبة

### 1. إعداد بيئة العمل
1. تثبيت Android Studio
2. تثبيت Android SDK
3. تثبيت Java Development Kit (JDK)

### 2. إنشاء مشروع Android جديد
1. فتح Android Studio
2. اختيار Create New Project
3. اختيار Empty Activity
4. تعبئة معلومات المشروع:
   - Name: Currency Calculator
   - Package name: com.revune.calculator
   - Language: Kotlin
   - Minimum SDK: API 21 (Android 5.0)

### 3. إعداد WebView
في ملف `activity_main.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<WebView xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/webview"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
```

في ملف `MainActivity.kt`:
```kotlin
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val webView = findViewById<WebView>(R.id.webview)
        webView.settings.javaScriptEnabled = true
        webView.webViewClient = WebViewClient()
        
        // تحميل التطبيق من الخادم أو من الملفات المحلية
        webView.loadUrl("file:///android_asset/www/index.html")
    }
}
```

### 4. نسخ ملفات المشروع
1. إنشاء مجلد `assets/www` في `app/src/main`
2. نسخ جميع ملفات المشروع (HTML, CSS, JS) إلى المجلد
3. تعديل المسارات في الملفات لتكون نسبية

### 5. إضافة الأذونات
في ملف `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 6. بناء التطبيق
1. اختيار Build > Build Bundle(s) / APK(s) > Build APK(s)
2. انتظار اكتمال عملية البناء
3. العثور على ملف APK في `app/build/outputs/apk/debug/app-debug.apk`

### 7. اختبار التطبيق
1. تثبيت التطبيق على جهاز Android
2. اختبار جميع الوظائف
3. التأكد من عمل:
   - الحسابات
   - رفع ملفات Excel
   - تصدير النتائج
   - زر WhatsApp

### 8. نشر التطبيق
1. إنشاء حساب مطور على Google Play
2. إعداد صفحة التطبيق
3. رفع ملف APK
4. نشر التطبيق
