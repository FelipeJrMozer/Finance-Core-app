import { Router, type IRouter } from "express";
import healthRouter from "./health";
import preferencesRouter from "./preferences";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(preferencesRouter);
router.use(authRouter);

export default router;
