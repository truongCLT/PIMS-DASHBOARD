import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cashflowRouter from "./cashflow";
import salescostRouter from "./salescost";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cashflowRouter);
router.use(salescostRouter);

export default router;
