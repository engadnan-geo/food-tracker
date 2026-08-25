import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getDailyReport,
  getMonthlyReports,
  getWeeklyReports,
} from "../controller/reports.controller.js";

const router = express.Router();

router.get("/daily", protect, getDailyReport);
router.get("/weekly", protect, getWeeklyReports);
router.get("/monthly", protect, getMonthlyReports);

export default router;
