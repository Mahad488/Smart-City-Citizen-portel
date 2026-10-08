import nodemailer from "nodemailer";

/**
 * Helper to construct an RFC 2822 base64url encoded email for Google Gmail REST API.
 */
const makeRawEmail = ({ to, from, subject, html, text }) => {
  const boundary = `__boundary_smart_city_${Date.now()}__`;
  const utf8Subject = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;

  const base64Text = Buffer.from(text || "", "utf-8").toString("base64");
  const base64Html = Buffer.from(html || "", "utf-8").toString("base64");

  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    base64Text,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    base64Html,
    ``,
    `--${boundary}--`,
  ];

  const rawMessage = messageParts.join("\r\n");
  return Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/**
 * Dispatch an email via official Google Gmail REST API (OAuth 2.0).
 * Runs over HTTPS port 443 (never blocked by Railway).
 * Sends directly from muhammadmahad2021@gmail.com to ANY recipient without any custom domain!
 */
const sendViaGmailApi = async ({ to, subject, html, text }) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        refresh_token: refreshToken.trim(),
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[EMAIL SERVICE] Failed to refresh Gmail access token:", tokenData);
      return null;
    }

    const fromEmail = process.env.EMAIL_USER || "muhammadmahad2021@gmail.com";
    const fromHeader = `"${process.env.EMAIL_FROM_NAME || "Smart City Citizen Portal"}" <${fromEmail}>`;

    const raw = makeRawEmail({
      to,
      from: fromHeader,
      subject,
      html,
      text,
    });

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    const sendData = await sendRes.json();
    if (sendRes.ok) {
      console.log(`[EMAIL SERVICE] Email successfully delivered via Gmail API to ${to}. Message ID: ${sendData.id}`);
      return { success: true, messageId: sendData.id, provider: "gmail-api" };
    } else {
      console.error("[EMAIL SERVICE] Gmail API send error:", sendData);
    }
  } catch (err) {
    console.error("[EMAIL SERVICE] Exception calling Gmail API:", err.message);
  }

  return null;
};

/**
 * Dispatch an email via Resend HTTPS REST API.
 * In Resend's free sandbox mode (using onboarding@resend.dev), emails can only be sent
 * to the registered account owner (muhammadmahad2021@gmail.com).
 * If a citizen files with another email and Resend returns 403, we automatically
 * forward the notification to muhammadmahad2021@gmail.com with clear context so
 * testing emails are never lost.
 */
const sendViaResend = async ({ from, to, subject, html, text }) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return null;

  const defaultFrom = from || process.env.RESEND_FROM || "Smart City Portal <onboarding@resend.dev>";
  const sandboxOwner = "muhammadmahad2021@gmail.com";

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: defaultFrom,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    const resendData = await resendRes.json();
    if (resendRes.ok) {
      console.log(`[EMAIL SERVICE] Email successfully delivered via Resend to ${to}. ID: ${resendData.id}`);
      return { success: true, messageId: resendData.id, provider: "resend" };
    }

    // Handle 403 sandbox limitation
    if (resendData.statusCode === 403 && to.toLowerCase() !== sandboxOwner.toLowerCase()) {
      console.warn(`[EMAIL SERVICE] Resend sandbox restriction (403): Testing emails only allowed to owner (${sandboxOwner}). Forwarding notification for ${to} to owner inbox...`);

      const noticeHtml = `<div style="background:#fff3cd;padding:12px 16px;border:1px solid #ffeeba;border-radius:8px;margin-bottom:16px;color:#856404;font-size:13px;font-family:sans-serif;"><strong>Resend Sandbox Notice:</strong> This notification was addressed to <strong>${to}</strong>. Delivered to your registered Resend developer account (${sandboxOwner}). To send directly to any public email, verify a custom domain at resend.com/domains.</div>`;

      const fallbackRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: defaultFrom,
          to: [sandboxOwner],
          subject: `[For: ${to}] ${subject}`,
          html: noticeHtml + html,
          text: `[Notification intended for: ${to}]\n\n` + text,
        }),
      });

      const fallbackData = await fallbackRes.json();
      if (fallbackRes.ok) {
        console.log(`[EMAIL SERVICE] Notification delivered to owner ${sandboxOwner} (intended for ${to}). ID: ${fallbackData.id}`);
        return { success: true, messageId: fallbackData.id, provider: "resend", redirected: true };
      } else {
        console.error("[EMAIL SERVICE] Resend sandbox fallback error:", fallbackData);
      }
    } else {
      console.error("[EMAIL SERVICE] Resend API error:", resendData);
    }
  } catch (err) {
    console.error("[EMAIL SERVICE] Exception contacting Resend API:", err.message);
  }

  return null;
};

/**
 * Send complaint registration confirmation email to the citizen.
 *
 * @param {Object} params
 * @param {string} params.citizenName
 * @param {string} params.citizenEmail
 * @param {number|string} params.complaintId
 * @param {string} params.title
 * @param {string} params.category
 * @param {string} params.area
 */
export const sendComplaintConfirmationEmail = async ({
  citizenName,
  citizenEmail,
  complaintId,
  title,
  category,
  area,
}) => {
  if (!citizenEmail) {
    console.warn("[EMAIL SERVICE] No citizen email provided. Skipping email notification.");
    return { success: false, reason: "No recipient email" };
  }

  const emailUser =
    process.env.EMAIL_USER ||
    process.env.SMTP_USER ||
    "muhammadmahad2021@gmail.com";
  const emailPass =
    process.env.EMAIL_PASS ||
    process.env.SMTP_PASS ||
    "tqbl rvld orck dctq";

  const formattedId = `CMP-${String(complaintId).padStart(5, "0")}`;

  const textContent = `
Assalam-o-Alaikum ${citizenName || "Citizen"},

Your report is being under process. It will take up to 24 hours to respond by the admin. Thanks for contacting us!

Aap ki report par kaam jari hai. Admin ki taraf se 24 ghanton ke andar response diya jaye ga. Hum se rabta karne ka shukriya!

Complaint Details:
- Tracking ID: #${formattedId} (ID: ${complaintId})
- Title: ${title || "Civic Complaint"}
- Category: ${category || "General"}
- Location: ${area || "Not provided"}
- Current Status: Under Process
- Response Time: Within 24 hours

Aap Smart City Citizen Portal par ja kar apni complaint track kar saktay hain:
https://smart-city-citizen-portel-a37g.vercel.app/citizen-my-complaints

Helpline: +92 42 111 123 456
Email: support@smartcity.gov

Thanks for contacting us,
Smart City Citizen Portal Administration
`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 24px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0d5ea8, #0878e8); background-color: #0878e8; padding: 32px 24px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: #ffffff;">Official Civic Notification</div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">Smart City Citizen Portal</h1>
      <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95; color: #ffffff;">Complaint Registration Confirmation</p>
    </div>
    
    <!-- Body -->
    <div style="padding: 32px 28px;">
      <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">Assalam-o-Alaikum ${citizenName || "Citizen"},</div>

      <!-- Highlight Card -->
      <div style="background-color: #f0f7ff; border-left: 5px solid #0878e8; padding: 18px 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #0f3d75; font-weight: 700;">Your report is being under process. It will take up to 24 hours to respond by the admin.</p>
        <p style="margin: 8px 0 0; font-size: 14px; color: #1e40af; font-weight: 600;">Thanks for contacting us!</p>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 16px 0;">
        Aap ki report receive ho chuki hai aur registered kar li gayi hai. Report ki tafseelat darj zail hain:
      </p>

      <!-- Details Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 14px; font-weight: 600; color: #64748b; font-size: 14px; width: 40%;">Tracking Reference</td>
          <td style="padding: 12px 14px; font-weight: 800; color: #0878e8; font-size: 16px;">#${formattedId}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 14px; font-weight: 600; color: #64748b; font-size: 14px;">Issue Title</td>
          <td style="padding: 12px 14px; font-weight: 700; color: #1e293b; font-size: 14px;">${title || "Civic Complaint"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 14px; font-weight: 600; color: #64748b; font-size: 14px;">Category</td>
          <td style="padding: 12px 14px; font-weight: 700; color: #1e293b; font-size: 14px;">${category || "General"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 14px; font-weight: 600; color: #64748b; font-size: 14px;">Location / Area</td>
          <td style="padding: 12px 14px; font-weight: 700; color: #1e293b; font-size: 14px;">${area || "Central City"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 14px; font-weight: 600; color: #64748b; font-size: 14px;">Current Status</td>
          <td style="padding: 12px 14px; font-size: 14px;"><span style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700;">Under Process</span></td>
        </tr>
        <tr>
          <td style="padding: 12px 14px; font-weight: 600; color: #64748b; font-size: 14px;">Resolution SLA</td>
          <td style="padding: 12px 14px; font-size: 14px;"><span style="display: inline-block; background-color: #ecfdf5; color: #047857; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700;">Within 24 Hours</span></td>
        </tr>
      </table>

      <!-- Button -->
      <div style="text-align: center; margin: 32px 0 12px;">
        <a href="https://smart-city-citizen-portel-a37g.vercel.app/citizen-my-complaints" style="display: inline-block; background-color: #0878e8; color: #ffffff !important; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(8,120,232,0.35);">View & Track Complaint</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      <p style="margin: 4px 0;">This is an automated official notification from Smart City Municipal Authority.</p>
      <p style="margin: 4px 0;">Helpline: +92 42 111 123 456 | Email: support@smartcity.gov</p>
    </div>
  </div>
</body>
</html>
`;

  // 1. Send via Google Gmail REST API (sends to ANY email, 100% free, no domain needed)
  const gmailResult = await sendViaGmailApi({
    to: citizenEmail,
    subject: `Complaint Confirmation #${formattedId} - Smart City Citizen Portal`,
    html: htmlContent,
    text: textContent,
  });
  if (gmailResult && gmailResult.success) {
    return gmailResult;
  }

  // 2. Fallback to Resend HTTPS API
  const resendResult = await sendViaResend({
    from: process.env.RESEND_FROM || "Smart City Portal <onboarding@resend.dev>",
    to: citizenEmail,
    subject: `Complaint Confirmation #${formattedId} - Smart City Citizen Portal`,
    html: htmlContent,
    text: textContent,
  });
  if (resendResult && resendResult.success) {
    return resendResult;
  }

  if (emailUser && emailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        family: 4,
        auth: {
          user: emailUser,
          pass: emailPass.replace(/\s+/g, ""),
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || "Smart City Citizen Portal"}" <${emailUser}>`,
        to: citizenEmail,
        subject: `Complaint Confirmation #${formattedId} - Smart City Citizen Portal`,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[EMAIL SERVICE] Email sent successfully to ${citizenEmail}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error("[EMAIL SERVICE] Error sending email via SMTP:", err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log("================================================================================");
    console.log(`[EMAIL SERVICE - NOTIFICATION SENT]`);
    console.log(`To: ${citizenEmail} (${citizenName})`);
    console.log(`Subject: Complaint Confirmation #${formattedId} - Smart City Citizen Portal`);
    console.log(`Message: "Aap ki report hum tak pohanch chuki hai. Aap ke report karne ka shukriya! Aap ki report par 24 hours mein kaam shuru kiya jaye ga."`);
    console.log(`Tracking ID: #${formattedId}`);
    console.log(`[NOTE: To dispatch live emails to real inboxes, add EMAIL_USER and EMAIL_PASS to backend .env]`);
    console.log("================================================================================");
    return { success: true, simulated: true };
  }
};

/**
 * Send emergency report confirmation email to the citizen.
 *
 * @param {Object} params
 * @param {string} params.citizenName
 * @param {string} params.citizenEmail
 * @param {number|string} params.emergencyId
 * @param {string} params.emergencyType
 * @param {string} params.location
 */
export const sendEmergencyConfirmationEmail = async ({
  citizenName,
  citizenEmail,
  emergencyId,
  emergencyType,
  location,
}) => {
  if (!citizenEmail) {
    console.warn("[EMAIL SERVICE] No citizen email provided for emergency. Skipping.");
    return { success: false, reason: "No recipient email" };
  }

  const emailUser =
    process.env.EMAIL_USER ||
    process.env.SMTP_USER ||
    "muhammadmahad2021@gmail.com";
  const emailPass =
    process.env.EMAIL_PASS ||
    process.env.SMTP_PASS ||
    "tqbl rvld orck dctq";

  const formattedId = `EM-${String(emergencyId).padStart(4, "0")}`;

  const textContent = `
Assalam-o-Alaikum ${citizenName || "Citizen"},

Your report is being under process. It will take up to 24 hours to respond by the admin. Thanks for contacting us!

Aap ki emergency report par foran kaam shuru kar diya gaya hai. Admin team 24 ghanton ke andar response kare gi. Hum se rabta karne ka shukriya!

Emergency Details:
- Reference ID: #${formattedId} (ID: ${emergencyId})
- Emergency Type: ${emergencyType || "Emergency"}
- Location: ${location || "Not provided"}
- Current Status: Under Process (Priority Response)
- Response Time: Within 24 hours

Aap Smart City Citizen Portal par ja kar apni emergency report track kar saktay hain:
https://smart-city-citizen-portel-a37g.vercel.app/citizen-emergency

Emergency Helpline: +92 42 111 123 456
Rescue: 1122

Thanks for contacting us,
Smart City Citizen Portal Emergency Team
`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 24px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #b91c1c, #e8380a); background-color: #e8380a; padding: 32px 24px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: #ffffff;">Official Emergency Notification</div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">Smart City Citizen Portal</h1>
      <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95; color: #ffffff;">Emergency Report Confirmation</p>
    </div>
    
    <!-- Body -->
    <div style="padding: 32px 28px;">
      <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">Assalam-o-Alaikum ${citizenName || "Citizen"},</div>

      <!-- Highlight Card -->
      <div style="background-color: #fff5f5; border-left: 5px solid #e8380a; padding: 18px 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #991b1b; font-weight: 700;">Your report is being under process. It will take up to 24 hours to respond by the admin.</p>
        <p style="margin: 8px 0 0; font-size: 14px; color: #b91c1c; font-weight: 600;">Thanks for contacting us!</p>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 16px 0;">
        Aap ki emergency report register ho kar Emergency Response Team ko assign kar di gayi hai. Report ki tafseelat darj zail hain:
      </p>

      <!-- Details Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 14px; font-weight: 600; color: #64748b; font-size: 14px; width: 40%;">Reference ID</td>
          <td style="padding: 12px 14px; font-weight: 800; color: #e8380a; font-size: 16px;">#${formattedId}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 14px; font-weight: 600; color: #64748b; font-size: 14px;">Emergency Type</td>
          <td style="padding: 12px 14px; font-weight: 700; color: #1e293b; font-size: 14px;">${emergencyType || "Emergency"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 14px; font-weight: 600; color: #64748b; font-size: 14px;">Location</td>
          <td style="padding: 12px 14px; font-weight: 700; color: #1e293b; font-size: 14px;">${location || "Not provided"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 14px; font-weight: 600; color: #64748b; font-size: 14px;">Current Status</td>
          <td style="padding: 12px 14px; font-size: 14px;"><span style="display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700;">Under Process</span></td>
        </tr>
        <tr>
          <td style="padding: 12px 14px; font-weight: 600; color: #64748b; font-size: 14px;">Response Time</td>
          <td style="padding: 12px 14px; font-size: 14px;"><span style="display: inline-block; background-color: #ecfdf5; color: #047857; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700;">Within 24 Hours</span></td>
        </tr>
      </table>

      <!-- Button -->
      <div style="text-align: center; margin: 32px 0 12px;">
        <a href="https://smart-city-citizen-portel-a37g.vercel.app/citizen-emergency" style="display: inline-block; background-color: #e8380a; color: #ffffff !important; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(232,56,10,0.35);">Track Your Emergency</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      <p style="margin: 4px 0;">This is an automated official notification from Smart City Municipal Authority.</p>
      <p style="margin: 4px 0;">Emergency Helpline: +92 42 111 123 456 | Rescue: 1122</p>
    </div>
  </div>
</body>
</html>
`;

  // 1. Send via Google Gmail REST API (sends to ANY email, 100% free, no domain needed)
  const gmailResult = await sendViaGmailApi({
    to: citizenEmail,
    subject: `Emergency Report Received #${formattedId} - Smart City Citizen Portal`,
    html: htmlContent,
    text: textContent,
  });
  if (gmailResult && gmailResult.success) {
    return gmailResult;
  }

  // 2. Fallback to Resend HTTPS API
  const resendResult = await sendViaResend({
    from: process.env.RESEND_FROM || "Smart City Emergency <onboarding@resend.dev>",
    to: citizenEmail,
    subject: `Emergency Report Received #${formattedId} - Smart City Citizen Portal`,
    html: htmlContent,
    text: textContent,
  });
  if (resendResult && resendResult.success) {
    return resendResult;
  }

  if (emailUser && emailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        family: 4,
        auth: {
          user: emailUser,
          pass: emailPass.replace(/\s+/g, ""),
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || "Smart City Citizen Portal"}" <${emailUser}>`,
        to: citizenEmail,
        subject: `Emergency Report Received #${formattedId} - Smart City Citizen Portal`,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[EMAIL SERVICE] Emergency email sent to ${citizenEmail}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error("[EMAIL SERVICE] Error sending emergency email:", err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log("================================================================================");
    console.log(`[EMAIL SERVICE - EMERGENCY NOTIFICATION]`);
    console.log(`To: ${citizenEmail} (${citizenName})`);
    console.log(`Subject: Emergency Report Received #${formattedId}`);
    console.log(`Message: "Your report is being under process. It will take 24 hours to respond."`);
    console.log("================================================================================");
    return { success: true, simulated: true };
  }
};
