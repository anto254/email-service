const emailConfig = require('../../config/emailConfig');

const generateAccountRejectedEmail = (options = {}) => {
  const recipientName = options.recipientName || 'Valued Client';
  const reason = options.reason || 'Information provided did not meet our verification requirements.';
  const websiteUrl = "https://emiratrustgroup.com";
  const businessName = "إميراترست | EmiraTrust Bank";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #a67c00 0%, #d4a373 100%); color: #ffffff; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 40px 30px; }
        .warning-box { background-color: #fff3cd; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
        .footer a { color: #a67c00; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${businessName}</h1>
        </div>
        <div class="content">
          <h2>Update on Your Account Application</h2>
          <p>Dear ${recipientName},</p>
          <p>Thank you for your interest in opening an account with EmiraTrust Bank.</p>
          <p>After carefully reviewing your application and the submitted documents, we regret to inform you that we are unable to approve your account at this time.</p>

          <div class="warning-box">
            <strong>Reason for Rejection:</strong>
            <p style="margin: 10px 0 0 0;">${reason}</p>
          </div>

          <p>If you believe this was in error, or if you have new documentation that resolves the issue stated above, please contact our support team at <a href="mailto:support@emiratrustgroup.com" style="color: #a67c00;">support@emiratrustgroup.com</a>.</p>
          <p>Best regards,<br><strong>EmiraTrust Bank Team</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
          <p><a href="${websiteUrl}">Visit our website</a></p>
          <p style="margin-top: 15px; color: #999;">This is an automated transaction alert. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { generateAccountRejectedEmail };
