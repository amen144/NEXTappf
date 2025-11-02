import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 2525,            // TLS port (not SSL)
  secure: false,        // must be false for port 587
  auth: {
    user: process.env.EMAIL_USER, // your Gmail
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
  tls: {
    rejectUnauthorized: false,    // prevents some connection rejections
  },
  connectionTimeout: 20000,       // 20 seconds
});
