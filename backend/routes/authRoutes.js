import express from "express";
import  registerUser from "../controllers/authController.js";
import loginUser from "../controllers/loginController.js";

const router = express.Router()
router.post("/register", registerUser);
router.post("/login", loginUser);
export default router;