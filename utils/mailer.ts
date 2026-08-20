/**
 * IMPORTANT: The mailer service has been moved to a separate project.
 * 
 * To use the separate mailer service:
 * 1. Build the mailer-service: cd ../mailer-service && npm install && npm run build
 * 2. Install dependencies in main project: npm install
 * 3. Replace this file content with: export { sendEmail, transporter } from "mailer-service";
 * 4. Update imports in controllers to: import { sendEmail } from "../utils/mailer";
 * 
 * For now, this file contains the original implementation for backward compatibility.
 * See SETUP_MAILER_SERVICE.md for complete setup instructions.
 */

import nodemailer from "nodemailer";

// Create transporter instance
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "465"),
  secure: process.env.EMAIL_SECURE !== "false",
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
  },
  connectionTimeout: parseInt(process.env.EMAIL_CONNECTION_TIMEOUT || "15000"),
});

/**
 * Send an email using the configured transporter
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - Email body in HTML format
 * @returns Promise that resolves when email is sent
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    if (transporter) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER || "amenjaballi08@gmail.com",
        to,
        subject,
        html,
      });
    } else {
      // Fallback for development/testing when transporter is not configured
      console.log(`[EMAIL to ${to}] ${subject}\n${html}`);
    }
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

// Export transporter for direct access if needed
export { transporter };

