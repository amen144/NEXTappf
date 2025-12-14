// ...existing code...
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  authMiddleware,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  removeFriend,
  shareNote,
} from "./controllers/share";

import {
  addNote as addnote,
  getNotes as getnote,
  deleteNote as deletenote,
  updateNote as updatenote,
  getNoteById,
} from "./controllers/noteCtrl";
import { forgotPassword, resetPassword ,vrflogin,vrfsingnup } from "./controllers/authCtrl";

import { login, signup } from "./controllers/userCtrl";

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http:/myapp11.ddns.net";

app.use(cors());
app.use(express.json());




// POST /signup
app.post("/signup",signup);
// POST /verify-signup
app.post("/verify-signup", vrfsingnup);

// POST /login -> generate login code and return tempToken when 2FA required
app.post("/login",login);
// POST /verify-login -> validate code + tempToken and return final auth token
app.post("/verify-login",vrflogin); 

// Notes and auth routes (controllers)
app.post("/auth/forgot-password", forgotPassword);
app.post("/auth/reset-password", resetPassword);
app.get("/search", authMiddleware, searchUsers);
app.post("/friends/request", authMiddleware, sendFriendRequest);
app.post("/friends/accept", authMiddleware, acceptFriendRequest);
app.get("/friends", authMiddleware, getFriends);
app.delete("/friends/:friendId", authMiddleware, removeFriend);
app.post("/share", authMiddleware, shareNote);

app.post("/notes", addnote);
app.get("/notes/:userID", getnote);
app.delete("/notes/:id", deletenote);
app.put("/notes/:id", updatenote);
app.get("/notes/note/:id", getNoteById);
const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));