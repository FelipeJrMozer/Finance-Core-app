import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import preferencesRouter from "./preferences.js";
import authRouter from "./auth.js";
import aiParseRouter from "./aiParse.js";
import pendingTransactionsRouter from "./pendingTransactions.js";
import whatsappRouter from "./whatsapp.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(preferencesRouter);
router.use(authRouter);
router.use(aiParseRouter);
router.use(pendingTransactionsRouter);
router.use(whatsappRouter);

export default router;
