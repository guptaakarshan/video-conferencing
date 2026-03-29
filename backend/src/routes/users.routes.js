import { Router } from "express";
import { addToHistory, getUserHistory, login,register } from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router=Router();

router.route("/login").post(login);
router.route("/register").post(register);
router.route("/add_to_activity").post(requireAuth, addToHistory);
router.route("/get_all_activity").get(requireAuth, getUserHistory);

export default router;