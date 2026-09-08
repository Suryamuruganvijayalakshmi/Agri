package com.agriflow.app

import android.app.Application
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel

class MainApplication : Application() {

    companion object {
        const val ONESIGNAL_APP_ID = "67abcb09-7a13-4c19-85d3-223a44d887c0"
    }

    override fun onCreate() {
        super.onCreate()

        // Enable verbose logging during development (remove in production)
        OneSignal.Debug.logLevel = LogLevel.VERBOSE

        // OneSignal Initialization with App ID
        OneSignal.initWithContext(this, ONESIGNAL_APP_ID)
    }
}
