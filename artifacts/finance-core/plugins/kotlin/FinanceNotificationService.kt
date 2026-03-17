package com.financecore.notificationlistener

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.net.URLEncoder
import java.util.regex.Pattern

class FinanceNotificationService : NotificationListenerService() {

    companion object {
        private const val CHANNEL_ID = "finance_core_alerts"
        private const val CHANNEL_NAME = "Pilar Financeiro – Transações Detectadas"
        private const val NOTIFICATION_ID_BASE = 900000

        // Regex: matches "R$ 1.234,56" or "R$1234.56" or "1.234,56 reais" etc.
        private val MONEY_PATTERN: Pattern = Pattern.compile(
            "R\\$\\s*[\\d.,]+|[\\d.,]+\\s*reais",
            Pattern.CASE_INSENSITIVE
        )

        // Banks and financial apps to monitor (package name fragments)
        private val BANK_PACKAGES = setOf(
            "com.nu.production",           // Nubank
            "com.itau",                     // Itaú
            "com.bradesco",                 // Bradesco
            "br.com.bradesco",
            "com.santander",                // Santander
            "br.com.santander",
            "br.com.bb.android",            // Banco do Brasil
            "br.com.bb",
            "br.gov.caixa",                 // Caixa
            "br.com.intermedium",           // Inter
            "com.bancointer",
            "com.c6bank",                   // C6 Bank
            "br.com.xp.cartao",             // XP
            "com.btgpactual.personal",      // BTG
            "com.sicredi",                  // Sicredi
            "com.picpay",                   // PicPay
            "br.com.meliuz",               // Méliuz
            "com.mercadopago",              // Mercado Pago
            "br.com.stone",                 // Stone
            "com.pagseguro",                // PagSeguro
        )

        // Keywords that indicate a monetary transaction notification
        private val TRANSACTION_KEYWORDS = listOf(
            "compra", "débito", "crédito", "pix", "transferência",
            "pagamento", "debitado", "creditado", "aprovad",
            "transação", "movimentação", "saque", "depósito",
            "fatura", "parcela", "cashback", "recebeu", "enviou",
        )
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        try {
            val extras: Bundle = sbn.notification.extras ?: return
            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
            val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""

            val fullText = "$title $text $bigText".trim()
            val packageName = sbn.packageName ?: ""

            // Only process bank/financial app notifications, OR any notification with R$
            val isBankApp = BANK_PACKAGES.any { pkg -> packageName.contains(pkg, ignoreCase = true) }
            val hasMoney = MONEY_PATTERN.matcher(fullText).find()
            val hasKeyword = TRANSACTION_KEYWORDS.any { kw -> fullText.contains(kw, ignoreCase = true) }

            if (!hasMoney) return
            if (!isBankApp && !hasKeyword) return

            // Extract amount
            val matcher = MONEY_PATTERN.matcher(fullText)
            val amountStr = if (matcher.find()) matcher.group(0) ?: "" else ""

            showTransactionAlert(fullText, amountStr, packageName, sbn.id)
        } catch (e: Exception) {
            // Never crash the service
        }
    }

    private fun showTransactionAlert(
        rawText: String,
        amount: String,
        sourcePackage: String,
        sourceId: Int
    ) {
        val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Build deep link that opens Pilar Financeiro with pre-filled data
        val encodedText = URLEncoder.encode(rawText.take(500), "UTF-8")
        val encodedAmount = URLEncoder.encode(amount, "UTF-8")
        val deepLink = "finance-core://transaction?text=$encodedText&amount=$encodedAmount&source=notification"

        val mainIntent = Intent(Intent.ACTION_VIEW).apply {
            data = android.net.Uri.parse(deepLink)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            sourceId,
            mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Short description for notification
        val shortAmount = amount.ifEmpty { "Valor detectado" }
        val notifText = rawText.take(120)

        val notification = Notification.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("💰 Pilar Financeiro – $shortAmount")
            .setContentText(notifText)
            .setStyle(Notification.BigTextStyle().bigText(notifText))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .addAction(
                Notification.Action.Builder(
                    null,
                    "Registrar Transação",
                    pendingIntent
                ).build()
            )
            .build()

        val notifId = NOTIFICATION_ID_BASE + (sourceId % 1000)
        notifManager.notify(notifId, notification)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alertas de transações detectadas automaticamente"
                enableVibration(true)
            }
            manager.createNotificationChannel(channel)
        }
    }
}
