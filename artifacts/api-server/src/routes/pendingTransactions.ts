import { Router } from "express";
import {
  listPending,
  approvePending,
  rejectPending,
  addPending,
  getPending,
} from "../lib/pendingTransactions.js";

const router = Router();

router.get("/pending-transactions", (_req, res) => {
  res.json({ transactions: listPending() });
});

router.post("/pending-transactions", (req, res) => {
  const { source, rawText, amount, type, description, merchant, category, bank } = req.body;
  if (!rawText || !amount || !type || !description || !category) {
    res.status(400).json({ error: "Campos obrigatórios: rawText, amount, type, description, category" });
    return;
  }
  const tx = addPending({ source: source ?? "manual", rawText, amount, type, description, merchant, category, bank });
  res.status(201).json({ transaction: tx });
});

router.put("/pending-transactions/:id/approve", (req, res) => {
  const tx = approvePending(req.params.id);
  if (!tx) {
    res.status(404).json({ error: "Transação não encontrada" });
    return;
  }
  res.json({ transaction: tx });
});

router.delete("/pending-transactions/:id", (req, res) => {
  const tx = rejectPending(req.params.id);
  if (!tx) {
    res.status(404).json({ error: "Transação não encontrada" });
    return;
  }
  res.json({ transaction: tx });
});

export default router;
