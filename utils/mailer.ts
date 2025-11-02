import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
 sservice: "gmail"// STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    ciphers: "SSLv3",
  },
  connectionTimeout: 15000,
});
