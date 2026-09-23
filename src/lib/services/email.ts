import nodemailer from 'nodemailer';
import path from 'path';

const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: user || '',
    pass: pass || '',
  },
});

// Paths for embedded logo attachments
const apemdhLogoPath = path.join(process.cwd(), 'public', 'apemdh_logo.jpg');
const psaLogoPath = path.join(process.cwd(), 'public', 'psa_logo.jpg');

const sharedStyles = `
  body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; width: 100% !important; }
  .email-wrapper { width: 100%; background-color: #f8fafc; padding: 24px 0; }
  .container { width: 100%; background-color: #ffffff; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
  
  /* Light Header Styling */
  .header { background-color: #ffffff; border-bottom: 2px solid #e2e8f0; padding: 24px 32px; }
  .header-table { width: 100%; border-collapse: collapse; }
  .header-title-cell { text-align: center; vertical-align: middle; padding: 0 16px; }
  .header h1 { margin: 0; font-size: 18px; color: #0f172a; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
  .header p { margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: 600; }
  .logo-img { height: 60px; width: auto; max-width: 90px; object-fit: contain; }

  .content { padding: 32px; color: #334155; line-height: 1.6; font-size: 14px; }
  .status-badge { display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 12px; font-weight: bold; padding: 6px 12px; border-radius: 9999px; border: 1px solid #a7f3d0; }
  .details-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0; }
  .details-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13.5px; }
  .details-row:last-child { margin-bottom: 0; }
  .label { color: #64748b; font-weight: 500; }
  .value { color: #0f172a; font-weight: 600; }

  /* Compliance & Notice Boxes */
  .notice-box { background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin: 28px 0; color: #1e293b; font-size: 13px; line-height: 1.6; }
  .notice-title { font-size: 15px; font-weight: bold; text-align: center; letter-spacing: 1px; margin-bottom: 12px; color: #0f172a; text-transform: uppercase; }
  .notice-list { margin: 10px 0 0 0; padding-left: 20px; }
  .notice-list li { margin-bottom: 6px; }

  .disclaimer-box { background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 18px; margin: 20px 0; color: #3f3f46; font-size: 12.5px; line-height: 1.5; }
  .disclaimer-title { font-size: 14px; font-weight: bold; text-align: center; letter-spacing: 1px; margin-bottom: 8px; color: #18181b; text-transform: uppercase; }

  .notes-box { background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 16px; margin: 20px 0; color: #991b1b; }
  .notes-title { font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; font-size: 12px; color: #64748b; }
`;

// Shared Light Header HTML Block with Dual Embedded Logos
const lightHeaderHTML = `
  <div class="header">
    <table class="header-table">
      <tr>
        <td style="width: 80px; text-align: left;">
          <img src="cid:apemdh_logo" alt="APEMDH Logo" class="logo-img" />
        </td>
        <td class="header-title-cell">
          <h1>Office of the Local Civil Registrar</h1>
          <p>Official Civil Registry Document Request</p>
        </td>
        <td style="width: 80px; text-align: right;">
          <img src="cid:psa_logo" alt="PSA Logo" class="logo-img" />
        </td>
      </tr>
    </table>
  </div>
`;

// Shared Notice & Disclaimer Block
const noticeAndDisclaimerHTML = `
  <div class="notice-box">
    <div class="notice-title">NOTICE</div>
    <p style="margin: 0 0 10px 0;">
      The <strong>PSA</strong> supports the policy of the State to protect the fundamental right of privacy. In view of the passage of <strong><u>Republic Act No. 10173</u></strong> also known as "<strong><u>Data Privacy Act of 2012</u></strong>", this office cannot issue documents from which the identity of an individual is apparent or can be reasonably and directly ascertained without the consent of the individual whose personal information is processed. <strong>Such consent must be evidenced by written, electronic or recorded means.</strong>
    </p>
    <p style="margin: 10px 0 4px 0;">
      Hence, original and certified true copy of Certificate of Live Birth, Certificate of Marriage and Certificate of Death, and Certificate of No Marriage (<u>CENOMAR</u>) and Advisory on Marriages, can only be issued to:
    </p>
    <ol class="notice-list">
      <li>The owner himself or through a <u>duly authorized representative</u>;</li>
      <li>His/her spouse, parent, direct descendants, guardian or institution legally in-charge of him/her, if minor;</li>
      <li>The court or proper public official whenever absolutely necessary in administrative, judicial or other official proceedings to determine the identity of a person;</li>
      <li>In case of the person's death, the nearest of kin.</li>
    </ol>
    <br>
    <div class="notice-title">DISCLAIMER</div>
    <p style="margin: 10px 0 4px 0;">
      <u>PSA clients have</u> the option to secure certification and copy of <u>civil registry document</u> in any of PSA's accredited partners. These partners may extend their services such as delivery of the requested document/s through their authorized couriers. Any problem encountered in the transaction with the partner is beyond the responsibility of the PSA.
    </p>
  </div>
`;

export async function sendApprovalEmail(
  recipientEmail: string,
  requesterName: string,
  pdfBuffer: Buffer,
  recordType: 'BIRTH' | 'DEATH'
) {
  if (!user || !pass) {
    throw new Error('Email credentials (EMAIL_USER / EMAIL_PASS) are missing in environment variables.');
  }

  const documentTitle = recordType === 'BIRTH' ? 'Certificate of Live Birth' : 'Certificate of Death';

  return transporter.sendMail({
    from: `"Office of the Local Civil Registrar" <${user}>`,
    to: recipientEmail,
    subject: `Official Copy Request - ${documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${sharedStyles}</style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            ${lightHeaderHTML}
            
            <div class="content">
              <p>Dear <strong>${requesterName}</strong>,</p>
              <p>We are pleased to inform you that your request for an official electronic copy of the <strong>${documentTitle}</strong> has been processed and verified by our office. Your official electronic certificate has been generated and attached directly to this email in PDF format. <br>Note: Please save a copy of the attached document for your personal records.</p>
              
              <div class="details-box">
                <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-weight: 500; width: 140px; vertical-align: middle;">
                      Document Type:
                    </td>
                    <td style="padding: 4px 0; color: #0f172a; font-weight: 600; vertical-align: middle;">
                      ${documentTitle}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-weight: 500; width: 140px; vertical-align: middle;">
                      Status:
                    </td>
                    <td style="padding: 4px 0; vertical-align: middle;">
                      <span class="status-badge" style="margin-bottom: 0;">✓ Approved & Issued</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-weight: 500; width: 140px; vertical-align: middle;">
                      Date Processed:
                    </td>
                    <td style="padding: 4px 0; color: #0f172a; font-weight: 600; vertical-align: middle;">
                      ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                </table>
              </div>

              ${noticeAndDisclaimerHTML}
            </div>

            <div class="footer">
              <p style="margin: 0 0 4px 0;"><strong>Office of the Local Civil Registrar</strong></p>
              <p style="margin: 0;">This is an automated operational email. Please do not reply directly to this email message.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: `${recordType}_Certificate.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
      {
        filename: 'apemdh_logo.jpg',
        path: apemdhLogoPath,
        cid: 'apemdh_logo',
      },
      {
        filename: 'psa_logo.jpg',
        path: psaLogoPath,
        cid: 'psa_logo',
      },
    ],
  });
}

export async function sendDenialEmail(
  recipientEmail: string,
  requesterName: string,
  adminNotes: string,
  recordType: 'BIRTH' | 'DEATH'
) {
  if (!user || !pass) {
    throw new Error('Email credentials (EMAIL_USER / EMAIL_PASS) are missing in environment variables.');
  }

  const documentTitle = recordType === 'BIRTH' ? 'Certificate of Live Birth' : 'Certificate of Death';

  return transporter.sendMail({
    from: `"Office of the Local Civil Registrar" <${user}>`,
    to: recipientEmail,
    subject: `Document Request Status - ${documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${sharedStyles}</style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            ${lightHeaderHTML}

            <div class="content">
              <p>Dear <strong>${requesterName}</strong>,</p>
              <p>Thank you for submitting your request for an official copy of the <strong>${documentTitle}</strong>.</p>
              <p>Following a review of your submission, we regret to inform you that your request could not be approved at this time due to the following reason:</p>
              
              <div class="notes-box">
                <div class="notes-title">Reason for Rejection / Evaluator Remarks</div>
                <p style="margin: 0; font-size: 13.5px;">${adminNotes || 'Supporting documentation submitted was insufficient or incomplete.'}</p>
              </div>

              <p><strong>Next Steps:</strong></p>
              <p>If you wish to re-apply, please ensure that all necessary authorization documents, government-issued IDs, and required supporting records are attached before re-submitting through our portal.</p>

              ${noticeAndDisclaimerHTML}
            </div>

            <div class="footer">
              <p style="margin: 0 0 4px 0;"><strong>Office of the Local Civil Registrar</strong></p>
              <p style="margin: 0;">This is an automated operational email. Please do not reply directly to this email message.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: 'apemdh_logo.jpg',
        path: apemdhLogoPath,
        cid: 'apemdh_logo',
      },
      {
        filename: 'psa_logo.jpg',
        path: psaLogoPath,
        cid: 'psa_logo',
      },
    ],
  });
}