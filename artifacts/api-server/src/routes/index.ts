import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cashflowRouter from "./cashflow";
import salescostRouter from "./salescost";
import mgmtreportRouter from "./mgmtreport";
import projectdetailRouter from "./projectdetail";
import adminRouter from "./admin";
import fxratesRouter from "./fxrates";
import storageRouter from "./storage";
import pimsvinaSyncRouter from "./pimsvinaSync";
import orgstructureRouter from "./orgstructure";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cashflowRouter);
router.use(salescostRouter);
router.use(mgmtreportRouter);
router.use(projectdetailRouter);
router.use(adminRouter);
router.use(fxratesRouter);
router.use(storageRouter);
router.use(pimsvinaSyncRouter);
router.use(orgstructureRouter);

export default router;
