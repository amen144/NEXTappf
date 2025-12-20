const MAILER_SERVICE_URL = process.env.MAILER_SERVICE_URL || "http://localhost:5001";

/**
 * Send verification code email for user signup
 * Forwards the request to the mailer service
 */
export async function sendVerificationEmail(email: string, name: string, code: string): Promise<void> {
  try {
    const response = await fetch(`${MAILER_SERVICE_URL}/sigverifemail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, name, code }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailer service error: ${error}`);
    }
  } catch (error) {
    console.error("Failed to send verification email via mailer service:", error);
    throw error;
  }
}

/**
 * Send login code email for 2FA
 * Forwards the request to the mailer service
 */
export async function sendLoginCodeEmail(email: string, name: string, code: string): Promise<void> {
  try {
    const response = await fetch(`${MAILER_SERVICE_URL}/loginverifemail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, name, code }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailer service error: ${error}`);
    }
  } catch (error) {
    console.error("Failed to send login code email via mailer service:", error);
    throw error;
  }
}

/**
 * Send password reset email
 * Forwards the request to the mailer service
 */
export async function sendPasswordResetEmail(email: string, name: string, resetLink: string): Promise<void> {
  try {
    const response = await fetch(`${MAILER_SERVICE_URL}/resetpassemail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, name, resetLink }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailer service error: ${error}`);
    }
  } catch (error) {
    console.error("Failed to send password reset email via mailer service:", error);
    throw error;
  }
}

//vois sur ton chemin