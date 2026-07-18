import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cashflowRouter from "./cashflow";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cashflowRouter);

export default router;
