import {PrismaClient} from '@prisma/client'
import crypto from "crypto";
const prisma = new PrismaClient();
import bcrypt from 'bcryptjs';
import  {Request,Response} from 'express';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { transporter } from "../utils/mailer";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http:/myapp11.ddns.net";
async function sendEmail(to: string, subject: string, text: string) {
  if (transporter) {
    await transporter.sendMail({
      from: process.env.EMAIL_USER || "amenjaballi08@gmail.com",
      to,
      subject,
      html: text, 
    });
  } else {
    console.log(`[EMAIL to ${to}] ${subject}\n${text}`);
  }
}
export const signup =  async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "Missing fields" });

  try {
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      if (existing.isVerified)
        return res.status(400).json({ message: "User already exists" });
      // else fallthrough to resend verification
    }

    const passHash = await bcrypt.hash(password, 10);
    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const user = existing
      ? await prisma.users.update({
          where: { email },
          data: {
            name,
            password: passHash,
            verificationCode: code,
            verificationExpires: expires,
            isVerified: false,
          },
        })
      : await prisma.users.create({
          data: {
            name,
            email,
            password: passHash,
            isVerified: false,
            verificationCode: code,
            verificationExpires: expires,
          },
        });

    const tempToken = jwt.sign(
      { userId: user.id, purpose: "signup" },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    await sendEmail(email, "Your verification code", `
      <h1>Dear ${name},</h1>
      <p>Thank you for signing up. Please use the following code to verify your account:</p>
      <h2>${code}</h2>
      <p>This code will expire in 15 minutes.</p>
      <p>If you did not sign up, please ignore this email.</p>
      <br/>
      <p>Best regards,</p>
      <p>MyNotes Team</p>
    `);

    return res
      .status(200)
      .json({ requiresVerification: true, tempToken, message: "Verification code sent to email" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}
export const login = async (req: Request, res: Response) => {
  const { name, password } = req.body;
  if (!name || !password) return res.status(400).json({ message: "Missing fields" });
  try {
    const user = await prisma.users.findFirst({ where: { name } });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const loginCode = crypto.randomInt(100000, 999999).toString();
    const loginExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await prisma.users.update({
      where: { id: user.id },
      data: { loginCode, loginCodeExpires: loginExpires },
    });

    await sendEmail(user.email, "Your login code",`
      <h1>Dear ${user.name},</h1>
      <h2>You have requested to log in to your account. Please use the following code to complete your login</h2>
      <p>Your login code is:</p>
      <h2>${loginCode}</h2>
      <h3 style="color:red;">This code will expire in 10 minutes.</h3>
      <p>If you did not request this code, please ignore this email and change your password</p>
      <br/>
      <p>Best regards,</p>
      <p>MyNotes Team</p>
    `,);

    const tempToken = jwt.sign({ userId: user.id, purpose: "login" }, JWT_SECRET, { expiresIn: "10m" });
    return res.json({ requires2FA: true, tempToken, message: "Login code sent to your email" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};


