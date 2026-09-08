package com.agriflow.app

import android.content.Context
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

object OneSignalManager {

    fun initialize(context: Context, appId: String) {
        OneSignal.Debug.logLevel = LogLevel.VERBOSE
        OneSignal.initWithContext(context, appId)
    }

    /**
     * Links the current device subscription to the farmer's ID
     */
    fun login(farmerId: String) {
        OneSignal.login(farmerId)
        OneSignal.User.addTag("farmerId", farmerId)
        OneSignal.User.addTag("role", "FARMER")
    }

    /**
     * Unlinks the farmer identity on logout
     */
    fun logout() {
        OneSignal.logout()
    }

    /**
     * Requests push notification permissions (Android 13+)
     */
    fun requestNotificationPermission(fallbackToSettings: Boolean = true) {
        CoroutineScope(Dispatchers.IO).launch {
            OneSignal.Notifications.requestPermission(fallbackToSettings)
        }
    }
}
