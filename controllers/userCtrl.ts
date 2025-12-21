import {PrismaClient} from '@prisma/client'
import crypto from "crypto";
const prisma = new PrismaClient();
import bcrypt from 'bcryptjs';
import  {Request,Response} from 'express';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { sendVerificationEmail, sendLoginCodeEmail } from "../utils/emailService";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http:/myapp11.ddns.net";
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

    await sendVerificationEmail(email, name, code);

    return res
      .status(200)
      .json({ requiresVerification: true, tempToken, message: "Verification code sent to email" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "could not send verification email" });
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

    await sendLoginCodeEmail(user.email, user.name, loginCode);

    const tempToken = jwt.sign({ userId: user.id, purpose: "login" }, JWT_SECRET, { expiresIn: "10m" });
    return res.json({ requires2FA: true, tempToken, message: "Login code sent to your email" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "could not send login code email" });
  }
};


