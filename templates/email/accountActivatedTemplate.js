const emailConfig = require('../../config/emailConfig');

const generateAccountActivatedEmail = (options = {}) => {
  const recipientName = options.recipientName || 'Valued Client';
  const username = options.username || '';
  const accountNo = options.accountNo || '';
  const maskedAccount = accountNo.length > 4 ? '****' + accountNo.slice(-4) : accountNo;
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
        .welcome-box { background-color: #fcfaf8; border: 2px dashed #a67c00; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
        .welcome-value { font-size: 24px; font-weight: bold; color: #8a2208; margin: 10px 0; }
        .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .details-table th, .details-table td { padding: 12px 15px; border-bottom: 1px solid #eee; text-align: left; }
        .details-table th { color: #6c757d; font-weight: normal; width: 40%; }
        .details-table td { font-weight: bold; }
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
          <h2>Account Successfully Activated!</h2>
          <p>Dear ${recipientName},</p>
          <p>We are pleased to inform you that your EmiraTrust Bank account has been successfully verified and activated. You now have full access to our premium banking services.</p>

          <div class="welcome-box">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">Your Official Username</p>
            <div class="welcome-value">${username}</div>
          </div>

          <table class="details-table">
            <tr>
              <th>Account Number</th>
              <td>${maskedAccount}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td style="color: #28a745;">Active</td>
            </tr>
          </table>

          <p>You can now log in to your account to manage your finances, make transfers, and more. If you require any assistance, please contact our support team at <a href="mailto:support@emiratrustgroup.com" style="color: #a67c00;">support@emiratrustgroup.com</a>.</p>
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

module.exports = { generateAccountActivatedEmail };
