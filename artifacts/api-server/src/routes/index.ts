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
import { connectorsRouter } from "./connectors";
import { sourceRefsRouter } from "./source-refs";
import { aiRouter } from "./ai";
import { qualityRouter } from "./quality";
import { teamsRouter } from "./teams";
import adminRouter from "./admin";
import { backupRouter } from "./backup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use("/admin/backups", backupRouter);
router.use(authRouter);
router.use(principalsRouter);
router.use("/content", contentRouter);
router.use("/content", reviewRouter);
router.use("/search", searchRouter);
router.use("/tags", tagsRouter);
router.use("/glossary", glossaryRouter);
router.use("/media", mediaRouter);
router.use("/connectors", connectorsRouter);
router.use("/content", sourceRefsRouter);
router.use("/ai", aiRouter);
router.use("/quality", qualityRouter);
router.use(teamsRouter);

export default router;
