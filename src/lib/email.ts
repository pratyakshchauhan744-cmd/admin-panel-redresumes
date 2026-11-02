/**
 * Institutional Email Dispatcher for Super Admin Panel
 */

export type InstitutionEmailResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

export function getInstitutionLoginUrl(): string {
  const portalUrl = process.env.INSTITUTION_PORTAL_URL?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!portalUrl && !appUrl && process.env.NODE_ENV === "production") {
    throw new Error("Configure INSTITUTION_PORTAL_URL or NEXT_PUBLIC_APP_URL with the institution portal URL.");
  }

  let url: URL;
  try {
    url = portalUrl
      ? new URL(portalUrl)
      : new URL("/login?portal=enterprise", appUrl || "http://localhost:3001");
  } catch {
    throw new Error("INSTITUTION_PORTAL_URL or NEXT_PUBLIC_APP_URL is not a valid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("The institution portal URL must use HTTP or HTTPS.");
  }

  const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || url.hostname.endsWith(".localhost");
  if (process.env.NODE_ENV === "production" && (isLocalhost || url.protocol !== "https:")) {
    throw new Error("Configure a public HTTPS institution portal URL; production emails cannot link to localhost.");
  }

  return url.toString();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

export async function sendInstitutionWelcomeEmail({
  to,
  loginEmail,
  recipientName,
  collegeName,
  collegeCode,
  password,
  loginUrl,
}: {
  to: string[];
  loginEmail: string;
  recipientName: string;
  collegeName: string;
  collegeCode: string;
  password: string;
  loginUrl: string;
}): Promise<InstitutionEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.EMAIL_FROM?.trim();
  const missingConfig = [
    !resendApiKey && "RESEND_API_KEY",
    !fromEmail && "EMAIL_FROM",
  ].filter(Boolean);

  if (missingConfig.length > 0) {
    const error = `Email is not configured: set ${missingConfig.join(" and ")} in the deployment environment.`;
    console.error("[INSTITUTION EMAIL ERROR]", error);
    return { success: false, error };
  }

  const recipients = [...new Set(to.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (recipients.length === 0) {
    return { success: false, error: "No institution email recipients were provided." };
  }

  const subject = `Welcome to RedResumes Enterprise — ${collegeName} Campus Access`;
  const safeRecipientName = escapeHtml(recipientName);
  const safeCollegeName = escapeHtml(collegeName);
  const safeCollegeCode = escapeHtml(collegeCode);
  const safeLoginUrl = escapeHtml(loginUrl);
  const safeLoginEmail = escapeHtml(loginEmail);
  const safePassword = escapeHtml(password);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #090d16; color: #f1f5f9; padding: 40px 24px; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="color: #f43f5e; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">RedResumes<span style="color: #fff; font-size: 14px; font-weight: 500; margin-left: 8px; background-color: #e11d48; padding: 3px 8px; border-radius: 6px;">Enterprise</span></h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">Institutional Placement & AI Mock Interview SaaS Platform</p>
      </div>

      <div style="background-color: #0f172a; padding: 28px; border-radius: 12px; border: 1px solid #1e293b; margin-bottom: 24px;">
        <h2 style="color: #fff; font-size: 18px; margin-top: 0;">Welcome, ${safeRecipientName}!</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Your institution <strong>${safeCollegeName}</strong> (Code: <code style="color: #f43f5e; background: #1e293b; padding: 2px 6px; border-radius: 4px;">${safeCollegeCode}</code>) has been onboarded to RedResumes Enterprise.
        </p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          You have been designated as the <strong>Main Faculty Administrator</strong>. You can now access your college dashboard to invite faculty colleagues, enroll student cohorts via Excel, distribute interview credits, and track performance reports.
        </p>

        <div style="background-color: #090d16; border: 1px dashed #334155; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Your Institutional Login Credentials</p>
          <div style="margin-top: 10px;">
            <p style="margin: 4px 0; font-size: 14px; color: #f8fafc;"><strong>Portal URL:</strong> <a href="${safeLoginUrl}" style="color: #38bdf8; text-decoration: underline;">${safeLoginUrl}</a></p>
            <p style="margin: 4px 0; font-size: 14px; color: #f8fafc;"><strong>Login ID (Main Faculty Email):</strong> <code style="color: #38bdf8; font-size: 14px;">${safeLoginEmail}</code></p>
            <p style="margin: 4px 0; font-size: 14px; color: #f8fafc;"><strong>Password:</strong> <code style="color: #f43f5e; font-size: 15px; font-weight: bold; background: #1e293b; padding: 2px 6px; border-radius: 4px;">${safePassword}</code></p>
          </div>
        </div>

        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="${safeLoginUrl}" style="display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; padding: 13px 32px; font-weight: 700; font-size: 14px; border-radius: 8px; box-shadow: 0 4px 14px rgba(225, 29, 72, 0.4);">
            Log In to Enterprise Campus Portal &rarr;
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 20px;">
          <strong>Security Note:</strong> Please change your password upon initial login if required by your institutional IT security policy.
        </p>
      </div>

      <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
        This email was dispatched by RedResumes Platform Administration.<br/>
        &copy; ${new Date().getFullYear()} RedResumes Inc. All rights reserved.
      </p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject,
        html,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = typeof data?.message === "string" ? data.message : "Check the Resend API logs for details.";
      console.error(`[INSTITUTION EMAIL ERROR] Resend rejected the request (HTTP ${response.status}).`);
      return { success: false, error: `Resend rejected the email (HTTP ${response.status}): ${detail}` };
    }

    if (typeof data?.id !== "string" || !data.id.trim()) {
      console.error("[INSTITUTION EMAIL ERROR] Resend did not return an email ID.");
      return { success: false, error: "Resend did not return an email ID, so email submission could not be confirmed." };
    }

    console.info(`[INSTITUTION EMAIL ACCEPTED] ID: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (err: unknown) {
    const timedOut = err instanceof Error && ["TimeoutError", "AbortError"].includes(err.name);
    const error = timedOut
      ? "The Resend request timed out. Email submission could not be confirmed."
      : "Could not connect to Resend. Email submission could not be confirmed.";
    console.error("[INSTITUTION EMAIL ERROR]", error);
    return { success: false, error };
  }
}
