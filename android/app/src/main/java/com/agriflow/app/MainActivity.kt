package com.agriflow.app

import android.os.Bundle
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.onesignal.OneSignal
import com.onesignal.user.subscriptions.IPushSubscriptionObserver
import com.onesignal.user.subscriptions.PushSubscriptionChangedState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    // Retain observer for the lifetime of the Activity (OneSignal stores observers weakly)
    private var pushSubscriptionObserver: IPushSubscriptionObserver? = null
    private var isVerificationDialogShown = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Setup Push Subscription Verification Observer per OneSignal AI Prompt Specification
        setupPushSubscriptionObserver()
    }

    private fun setupPushSubscriptionObserver() {
        val prefs = getSharedPreferences("onesignal_integration_prefs", MODE_PRIVATE)
        isVerificationDialogShown = prefs.getBoolean("verification_dialog_shown", false)

        // 1. Evaluate current subscription ID immediately at registration time
        val currentSubId = OneSignal.User.pushSubscription.id
        evaluateSubscriptionId(currentSubId)

        // 2. Register retained push subscription observer for state transitions
        pushSubscriptionObserver = object : IPushSubscriptionObserver {
            override fun onPushSubscriptionChange(state: PushSubscriptionChangedState) {
                val newSubId = state.current.id
                evaluateSubscriptionId(newSubId)
            }
        }

        OneSignal.User.pushSubscription.addObserver(pushSubscriptionObserver!!)
    }

    /**
     * Checks if the device is registered with a real server-assigned ID (not local-)
     * and shows the verification dialog exactly once.
     */
    private fun evaluateSubscriptionId(subscriptionId: String?) {
        if (isVerificationDialogShown) return

        // Must be non-empty and NOT prefixed with "local-"
        if (!subscriptionId.isNullOrEmpty() && !subscriptionId.startsWith("local-")) {
            isVerificationDialogShown = true
            getSharedPreferences("onesignal_integration_prefs", MODE_PRIVATE)
                .edit()
                .putBoolean("verification_dialog_shown", true)
                .apply()

            runOnUiThread {
                showVerificationDialog()
            }
        }
    }

    /**
     * Shows required OneSignal SDK Integration Verification Dialog
     */
    private fun showVerificationDialog() {
        if (isFinishing || isDestroyed) return

        AlertDialog.Builder(this)
            .setTitle("Your OneSignal SDK integration is complete!")
            .setMessage("You can now send Push Notifications & In-App Messages through OneSignal. Tap below to enable push notifications.")
            .setPositiveButton("Got it") { dialog, _ ->
                dialog.dismiss()
                // Request push notification permission upon tapping "Got it"
                CoroutineScope(Dispatchers.IO).launch {
                    OneSignal.Notifications.requestPermission(true)
                }
            }
            .setCancelable(false)
            .show()
    }

    override fun onDestroy() {
        super.onDestroy()
        // Unregister observer
        pushSubscriptionObserver?.let {
            OneSignal.User.pushSubscription.removeObserver(it)
        }
    }
}
