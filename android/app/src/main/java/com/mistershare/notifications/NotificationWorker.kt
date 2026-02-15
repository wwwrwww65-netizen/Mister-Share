package com.mistershare.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.mistershare.filetransfer.MainActivity
import com.mistershare.filetransfer.R
import java.util.Calendar

class NotificationWorker(appContext: Context, workerParams: WorkerParameters) :
    Worker(appContext, workerParams) {

    private val CHANNEL_ID = "MisterShare_Tips_v3"
    private val NOTIFICATION_ID = 2026

    override fun doWork(): Result {
        android.util.Log.d("MisterShare", "🔔 NotificationWorker started")
        return try {
            // Calculate which message to show based on day of year (0, 1, 2 rotating)
            val dayOfYear = Calendar.getInstance().get(Calendar.DAY_OF_YEAR)
            val messageIndex = dayOfYear % 3
            
            android.util.Log.d("MisterShare", "🔔 Showing notification with index: $messageIndex")
            showNotification(messageIndex)
            Result.success()
        } catch (e: Exception) {
            android.util.Log.e("MisterShare", "❌ NotificationWorker Error: ${e.message}")
            Result.retry()
        }
    }

    private fun showNotification(index: Int) {
        val messages = listOf(
            Pair(
                "⚡ سرعة خيالية!",
                "انقل 1 جيجا في أقل من دقيقة! جرب تقنية 5GHz الآن 🚀"
            ),
            Pair(
                "🎁 شارك بدون حدود",
                "تطبيقات، ألعاب، أفلام - كل شيء بنقرة واحدة وبدون إنترنت!"
            ),
            Pair(
                "🔐 خصوصيتك أولاً",
                "لا سحابة، لا إنترنت، لا تتبع - نقل مباشر وآمن 100%"
            ),
            Pair(
                "💾 حرر مساحة هاتفك",
                "انقل صورك وفيديوهاتك للكمبيوتر واسترجع جيجابايتات!"
            ),
            Pair(
                "🎮 شارك ألعابك المفضلة",
                "وفر على أصدقائك باقة الإنترنت - شارك الألعاب مباشرة!"
            )
        )

        val (title, message) = messages[index % messages.size]

        createNotificationChannel()

        val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse("mistershare://notifications")).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        
        val pendingIntent: PendingIntent = PendingIntent.getActivity(
            applicationContext, 
            0, 
            intent, 
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val builder = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        val notificationManager =
            applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        android.util.Log.d("MisterShare", "🔔 Finalizing notification dispatch...")
        notificationManager.notify(NOTIFICATION_ID, builder.build())
        android.util.Log.d("MisterShare", "🔔 Notification sent successfully!")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Daily Tips"
            val descriptionText = "Daily tips and reminders from Mister Share"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager =
                applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
