import { Request, Response } from "express";
import User from "../models/User.js";
import {
  getDailySummary,
  getMonthlySummary,
  getWeeklySummary,
} from "../services/colories.js";

export const getDailyReport = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized. Please log in." });
      return;
    }

    const { date } = req.query;

    const targetDate =
      date && typeof date === "string" ? new Date(date) : new Date();

    //fech the food entries for the user for the target date
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    //get daily summary service
    // get Daily summry service

    const summary = await getDailySummary(user._id, targetDate);

    console.log(summary);

    const remainingCalories = user.dailyColorieGoal - summary.totalCalories;

    // percnetage goal

    const percentComplete = Math.round(
      (summary.totalCalories / user.dailyColorieGoal) * 100,
    );

    // send response

    res.json({
      date: targetDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
      goal: user.dailyColorieGoal,
      consumed: summary.totalCalories,
      remaining: remainingCalories > 0 ? remainingCalories : 0, // Don't show negative remaining
      percentComplete,
      isOverGoal: summary.totalCalories > user.dailyColorieGoal, // Flag if user exceeded goal
      macros: summary.macros,
      mealBreakdown: summary.mealBreakdown, // Calories by meal type (breakfast, lunch, dinner, snack)
      entriesCount: summary.entries, // Total number of food entries today
    });
  } catch (error) {
    console.error("Error fetching daily reports:", error);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
};

export const getWeeklyReports = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const today = new Date();

    today.setHours(23, 59, 59, 999);

    // get date 6 days ago

    const weekAgo = new Date();

    weekAgo.setDate(weekAgo.getDate() - 6);

    weekAgo.setHours(0, 0, 0, 0);

    // get weekly summary service

    const summary = await getWeeklySummary(user._id, weekAgo, today);

    // send response

    /*

{
    dailyData: {
        "2024-01-15": { calories: 1300, protein: 70, carbs: 160, fat: 40, count: 2 },
        "2024-01-16": { calories: 600, protein: 35, carbs: 70, fat: 18, count: 1 },
        "2024-01-17": { calories: 700, protein: 50, carbs: 80, fat: 20, count: 1 }
    },
    totalEntries: 4,
    totalCalories: 2600,
    totalProtein: 155,
    totalCarbs: 310,
    totalFat: 78,
    avgCalories: 650,
    macros: {
        protein: { grams: 155, calories: 620, percentage: 23.85 },
        carbs: { grams: 310, calories: 1240, percentage: 47.69 },
        fat: { grams: 78, calories: 702, percentage: 28.46 }
    }
}
*/

    // build 7 days data structure

    const dailySummry: Array<{
      date: string;
      dayName: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      entriesCount: number;
      goal: number;
      percentComplete: number;
    }> = [];

    const todayUTC = new Date(); // 2026-01-10T00:00:00.000Z;

    const todayDateStr = todayUTC.toISOString().split("T")[0]; // 2026-01-10;

    const [year, month, day] = todayDateStr.split("-").map(Number); // ['2026', '01', '10'];

    const startDate = new Date(Date.UTC(year, month - 1, day - 6)); // 2026-01-04T00:00:00.000Z;

    // 1 - 0 = january 0 = 0
    // 2 - 0 = february 0 = 1
    // 3 - 0 = march 0 = 2

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate); // 2026-01-04T00:00:00.000Z;

      date.setDate(startDate.getUTCDate() + i); // 2026-01-05T00:00:00.000Z;

      const dateStr = date.toISOString().split("T")[0]; // 2026-01-05;

      const dayData = summary.dailyData[dateStr] || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        count: 0,
      };

      dailySummry.push({
        date: dateStr,
        // date.toLocaleDateString() // 2026-01-05 Sunday 04:00:00 GMT
        dayName: date.toLocaleDateString("en-US", {
          weekday: "short",
          timeZone: "UTC",
        }), // 'Mon',,
        calories: dayData.calories,
        protein: dayData.protein,
        carbs: dayData.carbs,
        fat: dayData.fat,
        entriesCount: dayData.count,
        goal: user.dailyColorieGoal,
        percentComplete: Math.round(
          (dayData.calories / user.dailyColorieGoal) * 100,
        ),
      });
    }

    res.json({
      week: dailySummry,
      totalEntries: summary.totalEntries,
      totalCalories: summary.totalCalories,
      avgCalories: summary.avgCalories,
      goal: user.dailyColorieGoal,
      macros: summary.macros,
    });
  } catch (error) {
    console.error("Error fetching weekly reports:", error);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
};

export const getMonthlyReports = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const { year, month } = req.query;
    const targetYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();
    const targetMonth = month
      ? parseInt(month as string)
      : new Date().getMonth() + 1; // JS months are 0-based

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const summary = await getMonthlySummary(
      req.user._id.toString(),
      targetYear,
      targetMonth,
    );

    // Send monthly report response (macros already calculated in service)
    res.json({
      year: targetYear,
      month: targetMonth,
      totalEntries: summary.totalEntries,
      totalCalories: summary.totalCalories,
      avgCalories: summary.avgCalories,
      highestDay: summary.highestDay,
      daysTracked: summary.daysTracked,
      dailyGoal: user.dailyColorieGoal,
      macros: summary.macros,
      chartData: summary.dailyData,
    });
  } catch (error) {
    console.error("Monthly report error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: errorMessage });
  }
};
