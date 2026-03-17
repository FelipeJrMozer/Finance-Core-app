package com.financecore.notificationlistener

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.SmsMessage
import java.net.URLEncoder
import java.util.regex.Pattern

class FinanceSmsReceiver : BroadcastReceiver() {

    companion object {
        private const val CHANNEL_ID = "finance_core_alerts"
        private const val SMS_NOTIFICATION_ID_BASE = 800000

        private val MONEY_PATTERN: Pattern = Pattern.compile(
            "R\\$\\s*[\\d.,]+|[\\d.,]+\\s*reais",
            Pattern.CASE_INSENSITIVE
        )

        private val BANK_SENDER_PATTERNS = listOf(
            "nubank", "itau", "bradesco", "santander", "caixa", "inter",
            "c6bank", "picpay", "mercadopago", "pagseguro", "stone",
            "sicoob", "sicredi", "safra", "btg", "xp invest",
        )

        private val TRANSACTION_KEYWORDS = listOf(
            "compra", "débito", "crédito", "pix", "transferência",
            "pagamento", "debitado", "creditado", "aprovad",
            "transação", "saque", "depósito", "fatura", "parcela",
        )
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "android.provider.Telephony.SMS_RECEIVED") return

        try {
            val bundle = intent.extras ?: return
            val pdus = bundle.get("pdus") as? Array<*> ?: return
            val format = bundle.getString("format") ?: "3gpp"

            for (pdu in pdus) {
                val msg = SmsMessage.createFromPdu(pdu as ByteArray, format)
                val sender = msg.originatingAddress ?: ""
                val body = msg.messageBody ?: ""

                val isBankSender = BANK_SENDER_PATTERNS.any { p ->
                    sender.contains(p, ignoreCase = true)
                }
                val hasMoney = MONEY_PATTERN.matcher(body).find()
                val hasKeyword = TRANSACTION_KEYWORDS.any { kw ->
                    body.contains(kw, ignoreCase = true)
                }

                if (hasMoney && (isBankSender || hasKeyword)) {
                    val matcher = MONEY_PATTERN.matcher(body)
                    val amount = if (matcher.find()) matcher.group(0) ?: "" else ""
                    showSmsAlert(context, body, amount, sender)
                }
            }
        } catch (e: Exception) {
            // Never crash
        }
    }

    private fun showSmsAlert(context: Context, body: String, amount: String, sender: String) {
        createNotificationChannel(context)

        val encodedText = URLEncoder.encode(body.take(500), "UTF-8")
        val encodedAmount = URLEncoder.encode(amount, "UTF-8")
        val deepLink = "finance-core://transaction?text=$encodedText&amount=$encodedAmount&source=sms&sender=$sender"

        val mainIntent = Intent(Intent.ACTION_VIEW).apply {
            data = android.net.Uri.parse(deepLink)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            body.hashCode(),
            mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val shortAmount = amount.ifEmpty { "Valor detectado" }
        val notifText = "SMS de $sender: ${body.take(100)}"

        val notification = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("📱 Pilar Financeiro – SMS $shortAmount")
            .setContentText(notifText)
            .setStyle(Notification.BigTextStyle().bigText(body.take(300)))
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

        val notifManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notifManager.notify(SMS_NOTIFICATION_ID_BASE + (sender.hashCode() % 1000), notification)
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (manager.getNotificationChannel(CHANNEL_ID) != null) return
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Pilar Financeiro – Transações Detectadas",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alertas de transações detectadas automaticamente via SMS"
                enableVibration(true)
            }
            manager.createNotificationChannel(channel)
        }
    }
}
