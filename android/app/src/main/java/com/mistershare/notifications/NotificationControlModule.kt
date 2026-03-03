package com.mistershare.notifications

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import androidx.work.WorkManager
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.OneTimeWorkRequestBuilder
import java.util.concurrent.TimeUnit
import android.content.Context
import com.mistershare.notifications.NotificationWorker

class NotificationControlModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "NotificationControl"
    }

    @ReactMethod
    fun setDailyNotificationsEnabled(enabled: Boolean, promise: Promise) {
        try {
            val context = reactApplicationContext
            val workManager = WorkManager.getInstance(context)

            if (enabled) {
                // Schedule
                val workRequest = PeriodicWorkRequestBuilder<NotificationWorker>(24, TimeUnit.HOURS)
                    .build()
                
                workManager.enqueueUniquePeriodicWork(
                    "DailyTips",
                    ExistingPeriodicWorkPolicy.KEEP, // Use KEEP to avoid resetting if already scheduled
                    workRequest
                )
            } else {
                // Cancel
                workManager.cancelUniqueWork("DailyTips")
            }
            
            // Save preference
            val prefs = context.getSharedPreferences("MisterSharePrefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("daily_notifs_enabled", enabled).apply()

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun isDailyNotificationsEnabled(promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences("MisterSharePrefs", Context.MODE_PRIVATE)
            val enabled = prefs.getBoolean("daily_notifs_enabled", true) // Default true
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun triggerTestNotification(promise: Promise) {
        try {
            val context = reactApplicationContext
            val workManager = WorkManager.getInstance(context)
            
            // Schedule test notification after 10 seconds to allow time to close app
            val testRequest = OneTimeWorkRequestBuilder<NotificationWorker>()
                .setInitialDelay(15, TimeUnit.SECONDS)
                .addTag("TestNotification")
                .build()
                
            workManager.enqueueUniqueWork(
                "TestNotificationTask_" + System.currentTimeMillis(),
                androidx.work.ExistingWorkPolicy.REPLACE,
                testRequest
            )
            android.util.Log.d("MisterShare", "🔔 Test notification enqueued for 10s delay")
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
