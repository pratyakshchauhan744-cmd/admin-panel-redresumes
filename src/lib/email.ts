/**
 * Institutional Email Dispatcher for Super Admin Panel
 */

export async function sendInstitutionWelcomeEmail({
  to,
  recipientName,
  collegeName,
  collegeCode,
  password,
  loginUrl,
}: {
  to: string;
  recipientName: string;
  collegeName: string;
  collegeCode: string;
  password: string;
  loginUrl: string;
}): Promise<{ success: boolean; error?: string; simulated?: boolean; messageId?: string }> {
  const subject = `Welcome to RedResumes Enterprise — ${collegeName} Campus Access`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #090d16; color: #f1f5f9; padding: 40px 24px; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="color: #f43f5e; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">RedResumes<span style="color: #fff; font-size: 14px; font-weight: 500; margin-left: 8px; background-color: #e11d48; padding: 3px 8px; border-radius: 6px;">Enterprise</span></h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">Institutional Placement & AI Mock Interview SaaS Platform</p>
      </div>

      <div style="background-color: #0f172a; padding: 28px; border-radius: 12px; border: 1px solid #1e293b; margin-bottom: 24px;">
        <h2 style="color: #fff; font-size: 18px; margin-top: 0;">Welcome, ${recipientName}!</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Your institution <strong>${collegeName}</strong> (Code: <code style="color: #f43f5e; background: #1e293b; padding: 2px 6px; border-radius: 4px;">${collegeCode}</code>) has been onboarded to RedResumes Enterprise.
        </p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          You have been designated as the <strong>Main Faculty Administrator</strong>. You can now access your college dashboard to invite faculty colleagues, enroll student cohorts via Excel, distribute interview credits, and track performance reports.
        </p>

        <div style="background-color: #090d16; border: 1px dashed #334155; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Your Institutional Login Credentials</p>
          <div style="margin-top: 10px;">
            <p style="margin: 4px 0; font-size: 14px; color: #f8fafc;"><strong>Portal URL:</strong> <a href="${loginUrl}" style="color: #38bdf8; text-decoration: underline;">${loginUrl}</a></p>
            <p style="margin: 4px 0; font-size: 14px; color: #f8fafc;"><strong>Login ID (Email):</strong> <code style="color: #38bdf8; font-size: 14px;">${to}</code></p>
            <p style="margin: 4px 0; font-size: 14px; color: #f8fafc;"><strong>Password:</strong> <code style="color: #f43f5e; font-size: 15px; font-weight: bold; background: #1e293b; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
          </div>
        </div>

        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="${loginUrl}" style="display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; padding: 13px 32px; font-weight: 700; font-size: 14px; border-radius: 8px; box-shadow: 0 4px 14px rgba(225, 29, 72, 0.4);">
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

  const resendApiKey = process.env.RESEND_API_KEY || "re_7yzwRKNz_LbFkNLCUq6A3uU6QueaQpASA";
  const fromEmail = process.env.EMAIL_FROM || "RedResumes Enterprise <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[INSTITUTION EMAIL DISPATCHED] To: ${to} | ID: ${data?.id}`);
      return { success: true, messageId: data?.id };
    } else {
      const errorText = await response.text();
      console.warn(`[INSTITUTION EMAIL WARNING] Resend returned status ${response.status}: ${errorText}`);
      // Fallback: log for development/testing
      console.log(`[INSTITUTION CREDENTIALS DISPATCH LOGGED] To: ${to} | Password: ${password} | Portal: ${loginUrl}`);
      return { success: true, simulated: true };
    }
  } catch (err: any) {
    console.error("[INSTITUTION EMAIL ERROR] Failed to send email via Resend:", err?.message || err);
    console.log(`[INSTITUTION CREDENTIALS DISPATCH LOGGED] To: ${to} | Password: ${password} | Portal: ${loginUrl}`);
    return { success: true, simulated: true };
  }
}
