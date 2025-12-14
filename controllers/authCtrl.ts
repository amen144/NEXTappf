// controllers/authCtrl.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { transporter } from "../utils/mailer"; // your nodemailer config
import bcrypt from 'bcryptjs';
import { login } from "./userCtrl";
import jwt from "jsonwebtoken";
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http:/myapp11.ddns.net";

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1h expiry
const API_URL = process.env.NEXT_PUBLIC_API_URL;
    // Save token to user
    await prisma.users.update({ 
      where: { email },
      data: { resetToken, resetTokenExpiry },
    });

    // Send email
    const resetLink = `${FRONTEND_URL}/reset-password/${resetToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset",
      html: `<h1>Password Reset Request from ${user.name}</h1> 
             <p>Click this link to reset your password:</p>  
             <a href="${resetLink}">${resetLink}</a>`,
    });

    res.json({ message: "Recovery email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};
export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token and new password are required" });
  }

  try {
    const user = await prisma.users.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
console.log(hashedPassword);  
    // Update user with hashed password
    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};
export const vrflogin= async (req: Request, res: Response) => {
  const { code, tempToken } = req.body;
  if (!code || !tempToken) return res.status(400).json({ message: "Missing fields" });
  try {
    const payload: any = jwt.verify(tempToken, JWT_SECRET);
    if (!payload || payload.purpose !== "login")
      return res.status(400).json({ message: "Invalid token" });

    const user = await prisma.users.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (!user.loginCode || !user.loginCodeExpires)
      return res.status(400).json({ message: "No login code found" });
    if (new Date() > user.loginCodeExpires) return res.status(400).json({ message: "Code expired" });
    if (user.loginCode !== code) return res.status(400).json({ message: "Invalid code" });

    const token = jwt.sign({ userId: user.id, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    await prisma.users.update({ where: { id: user.id }, data: { loginCode: null, loginCodeExpires: null } });

    return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err: any) {
    console.error(err);
    if (err.name === "TokenExpiredError") return res.status(400).json({ message: "Temp token expired" });
    return res.status(500).json({ message: err.message || "Server error" });
  }
};
export const vrfsingnup=async (req: Request, res: Response) => {
  const { email, code, tempToken } = req.body;
  if (!email || !code) return res.status(400).json({ message: "Missing fields" });

  try {
    if (tempToken) {
      try {
        jwt.verify(tempToken, JWT_SECRET);
      } catch {
        /* ignore - still validate via DB */
      }
    }

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: "No such user" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });
    if (!user.verificationCode || !user.verificationExpires)
      return res.status(400).json({ message: "No verification code found" });
    if (new Date() > user.verificationExpires) return res.status(400).json({ message: "Code expired" });
    if (user.verificationCode !== code) return res.status(400).json({ message: "Invalid code" });

    await prisma.users.update({
      where: { email },
      data: { isVerified: true, verificationCode: null, verificationExpires: null },
    });

    return res.json({ success: true, message: "Account verified" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};