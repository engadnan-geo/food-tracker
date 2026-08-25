import Express from "express";
import { getUser, login, register } from "../controller/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
const router = Express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getUser);

export default router;
