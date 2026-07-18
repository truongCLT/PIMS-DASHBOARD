import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cashflowRouter from "./cashflow";
import salescostRouter from "./salescost";
import mgmtreportRouter from "./mgmtreport";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cashflowRouter);
router.use(salescostRouter);
router.use(mgmtreportRouter);

export default router;
