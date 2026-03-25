import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import reviewRouter from "./review";
import authRouter from "./auth";
import principalsRouter from "./principals";
import mediaRouter from "./media";
import { searchRouter } from "./search";
import { tagsRouter } from "./tags";
import { glossaryRouter } from "./glossary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(principalsRouter);
router.use("/content", contentRouter);
router.use("/content", reviewRouter);
router.use("/search", searchRouter);
router.use("/tags", tagsRouter);
router.use("/glossary", glossaryRouter);
router.use("/media", mediaRouter);

export default router;
