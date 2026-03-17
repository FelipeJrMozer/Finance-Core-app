import { Router } from "express";
import { parseTransactionText } from "../lib/aiParser.js";
import { addPending } from "../lib/pendingTransactions.js";

const router = Router();

router.post("/ai/parse-transaction", async (req, res) => {
  const { text, source = "manual" } = req.body as { text?: string; source?: string };

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "Campo 'text' é obrigatório" });
    return;
  }

  try {
    const parsed = await parseTransactionText(text);

    if (parsed.isTransaction && parsed.amount > 0) {
      const pending = addPending({
        source: (source as "whatsapp" | "sms" | "manual"),
        rawText: text,
        amount: parsed.amount,
        type: parsed.type,
        description: parsed.description,
        merchant: parsed.merchant,
        category: parsed.category,
        bank: parsed.bank,
      });
      res.json({ parsed, pending, queued: true });
    } else {
      res.json({ parsed, queued: false });
    }
  } catch (err) {
    console.error("AI parse error:", err);
    res.status(500).json({ error: "Erro ao processar mensagem com IA" });
  }
});

export default router;
