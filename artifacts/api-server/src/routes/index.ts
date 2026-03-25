import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import authRouter from "./auth";
import principalsRouter from "./principals";
import mediaRouter from "./media";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(principalsRouter);
router.use("/content", contentRouter);
router.use("/media", mediaRouter);

export default router;
