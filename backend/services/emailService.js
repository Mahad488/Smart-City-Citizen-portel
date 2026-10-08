import nodemailer from "nodemailer";

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
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .email-header { background: linear-gradient(135deg, #0d5ea8, #0878e8); padding: 32px 24px; text-align: center; color: #ffffff; }
    .email-header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .email-header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
    .email-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
    .email-body { padding: 32px 28px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
    .highlight-card { background: #f0f7ff; border-left: 4px solid #0878e8; padding: 20px 22px; border-radius: 8px; margin: 20px 0; }
    .highlight-card p { margin: 0; font-size: 16px; line-height: 1.6; color: #0f3d75; font-weight: 700; }
    .highlight-card .sub-text { margin-top: 8px; font-size: 14px; color: #1e40af; font-weight: 600; }
    .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    .details-table td { padding: 12px 14px; border-bottom: 1px solid #edf2f7; font-size: 14px; }
    .details-table td.label { font-weight: 600; color: #64748b; width: 38%; }
    .details-table td.value { font-weight: 700; color: #1e293b; }
    .status-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .sla-badge { display: inline-block; background: #ecfdf5; color: #047857; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .btn-container { text-align: center; margin: 30px 0 10px; }
    .btn { display: inline-block; background: #0878e8; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 3px 10px rgba(8,120,232,0.3); }
    .email-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
    .email-footer p { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="email-badge">Official Civic Notification</div>
      <h1>Smart City Citizen Portal</h1>
      <p>Complaint Registration Confirmation</p>
    </div>
    <div class="email-body">
      <div class="greeting">Assalam-o-Alaikum ${citizenName || "Citizen"},</div>

      <div class="highlight-card">
        <p>Your report is being under process. It will take up to 24 hours to respond by the admin.</p>
        <p class="sub-text">Thanks for contacting us!</p>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Aap ki report receive ho chuki hai aur registered kar li gayi hai. Report ki tafseelat darj zail hain:
      </p>

      <table class="details-table">
        <tr>
          <td class="label">Tracking Reference</td>
          <td class="value" style="color: #0878e8; font-size: 16px;">#${formattedId}</td>
        </tr>
        <tr>
          <td class="label">Issue Title</td>
          <td class="value">${title || "Civic Complaint"}</td>
        </tr>
        <tr>
          <td class="label">Category</td>
          <td class="value">${category || "General"}</td>
        </tr>
        <tr>
          <td class="label">Location / Area</td>
          <td class="value">${area || "Central City"}</td>
        </tr>
        <tr>
          <td class="label">Current Status</td>
          <td class="value"><span class="status-badge">Pending Review</span></td>
        </tr>
        <tr>
          <td class="label">Resolution SLA</td>
          <td class="value"><span class="sla-badge">Within 24 Hours</span></td>
        </tr>
      </table>

      <div class="btn-container">
        <a href="https://smart-city-citizen-portel-a37g.vercel.app/citizen-my-complaints" class="btn">View & Track Complaint</a>
      </div>
    </div>
    <div class="email-footer">
      <p>This is an automated notification from Smart City Municipal Authority.</p>
      <p>Please keep this reference for future correspondence.</p>
    </div>
  </div>
</body>
</html>
`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "Smart City Portal <onboarding@resend.dev>",
          to: [citizenEmail],
          subject: `Complaint Confirmation #${formattedId} - Smart City Citizen Portal`,
          html: htmlContent,
          text: textContent,
        }),
      });

      const resendData = await resendRes.json();
      if (resendRes.ok) {
        console.log(`[EMAIL SERVICE] Email sent via Resend HTTPS API to ${citizenEmail}. ID: ${resendData.id}`);
        return { success: true, messageId: resendData.id, provider: "resend" };
      } else {
        console.error("[EMAIL SERVICE] Resend API error:", resendData);
      }
    } catch (apiErr) {
      console.error("[EMAIL SERVICE] Error calling Resend API:", apiErr.message);
    }
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
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .email-header { background: linear-gradient(135deg, #b91c1c, #e8380a); padding: 32px 24px; text-align: center; color: #ffffff; }
    .email-header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .email-header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
    .email-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
    .email-body { padding: 32px 28px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
    .highlight-card { background: #fff5f5; border-left: 4px solid #e8380a; padding: 20px 22px; border-radius: 8px; margin: 20px 0; }
    .highlight-card p { margin: 0; font-size: 16px; line-height: 1.6; color: #991b1b; font-weight: 700; }
    .highlight-card .sub-text { margin-top: 8px; font-size: 14px; color: #b91c1c; font-weight: 600; }
    .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    .details-table td { padding: 12px 14px; border-bottom: 1px solid #edf2f7; font-size: 14px; }
    .details-table td.label { font-weight: 600; color: #64748b; width: 38%; }
    .details-table td.value { font-weight: 700; color: #1e293b; }
    .status-badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .sla-badge { display: inline-block; background: #ecfdf5; color: #047857; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .btn-container { text-align: center; margin: 30px 0 10px; }
    .btn { display: inline-block; background: #e8380a; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 3px 10px rgba(232,56,10,0.3); }
    .email-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
    .email-footer p { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="email-badge">🚨 Official Emergency Notification</div>
      <h1>Smart City Citizen Portal</h1>
      <p>Emergency Report Confirmation</p>
    </div>
    <div class="email-body">
      <div class="greeting">Assalam-o-Alaikum ${citizenName || "Citizen"},</div>

      <div class="highlight-card">
        <p>Your report is being under process. It will take up to 24 hours to respond by the admin.</p>
        <p class="sub-text">Thanks for contacting us!</p>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Aap ki emergency report register ho kar Emergency Response Team ko assign kar di gayi hai. Report ki tafseelat darj zail hain:
      </p>

      <table class="details-table">
        <tr>
          <td class="label">Reference ID</td>
          <td class="value" style="color: #e8380a; font-size: 16px;">#${formattedId}</td>
        </tr>
        <tr>
          <td class="label">Emergency Type</td>
          <td class="value">${emergencyType || "Emergency"}</td>
        </tr>
        <tr>
          <td class="label">Location</td>
          <td class="value">${location || "Not provided"}</td>
        </tr>
        <tr>
          <td class="label">Current Status</td>
          <td class="value"><span class="status-badge">Under Process</span></td>
        </tr>
        <tr>
          <td class="label">Response Time</td>
          <td class="value"><span class="sla-badge">Within 24 Hours</span></td>
        </tr>
      </table>

      <div class="btn-container">
        <a href="https://smart-city-citizen-portel-a37g.vercel.app/citizen-emergency" class="btn">Track Your Emergency</a>
      </div>
    </div>
    <div class="email-footer">
      <p>This is an automated notification from Smart City Municipal Authority.</p>
      <p>Please keep this reference ID for future correspondence.</p>
    </div>
  </div>
</body>
</html>
`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "Smart City Emergency <onboarding@resend.dev>",
          to: [citizenEmail],
          subject: `Emergency Report Received #${formattedId} - Smart City Citizen Portal`,
          html: htmlContent,
          text: textContent,
        }),
      });

      const resendData = await resendRes.json();
      if (resendRes.ok) {
        console.log(`[EMAIL SERVICE] Emergency email sent via Resend HTTPS API to ${citizenEmail}. ID: ${resendData.id}`);
        return { success: true, messageId: resendData.id, provider: "resend" };
      } else {
        console.error("[EMAIL SERVICE] Resend API error:", resendData);
      }
    } catch (apiErr) {
      console.error("[EMAIL SERVICE] Error calling Resend API for emergency:", apiErr.message);
    }
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
