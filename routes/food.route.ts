import Express from "express";
import {
  analyzeFood,
  saveFoodEntry,
  scanfood,
  discardanalyzedFood,
} from "../controller/food.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Express.Router();

router.post("/scan", protect, upload.single("image"), scanfood);
router.post("/analyze", protect, upload.single("image"), analyzeFood);
router.post("/save", protect, saveFoodEntry);
router.delete("/discard", protect, discardanalyzedFood);

export default router;
