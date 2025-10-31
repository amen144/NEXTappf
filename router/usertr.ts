import { Router } from "express";
import express from "express";
import { signup, login } from "../controllers/userCtrl";
const router = express.Router();
router.post('/signup', signup);
router.post('/login', login);
export default router;