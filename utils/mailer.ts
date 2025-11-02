import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail", // or use SMTP for custom domains
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address
    pass: process.env.EMAIL_PASS, // your Gmail App Password
  },
    tls: { rejectUnauthorized: false },
  connectionTimeout: 20000
});
