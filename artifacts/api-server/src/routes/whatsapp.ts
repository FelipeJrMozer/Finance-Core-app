import { Router } from "express";
import { parseTransactionText } from "../lib/aiParser.js";
import { addPending } from "../lib/pendingTransactions.js";

const router = Router();

router.post("/whatsapp/webhook", async (req, res) => {
  try {
    let messageText: string | undefined;
    let fromNumber: string | undefined;

    if (req.body.Body) {
      messageText = req.body.Body as string;
      fromNumber = req.body.From as string;
    } else if (req.body.entry) {
      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];
      if (message?.type === "text") {
        messageText = message.text.body as string;
        fromNumber = message.from as string;
      }
    }

    if (!messageText) {
      res.status(200).send("OK");
      return;
    }

    console.log(`[WhatsApp] Mensagem recebida de ${fromNumber}: ${messageText.slice(0, 100)}`);

    const parsed = await parseTransactionText(messageText);

    if (parsed.isTransaction && parsed.amount > 0) {
      addPending({
        source: "whatsapp",
        rawText: messageText,
        fromNumber,
        amount: parsed.amount,
        type: parsed.type,
        description: parsed.description,
        merchant: parsed.merchant,
        category: parsed.category,
        bank: parsed.bank,
      });
      console.log(`[WhatsApp] Transação detectada: R$${parsed.amount} - ${parsed.description}`);
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("[WhatsApp] Erro ao processar webhook:", err);
    res.status(200).send("OK");
  }
});

router.get("/whatsapp/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "finance-core-verify";
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WhatsApp] Webhook verificado com sucesso");
    res.status(200).send(challenge);
  } else {
    res.status(403).send("Forbidden");
  }
});

export default router;
