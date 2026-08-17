const emailConfig = require('../../config/emailConfig');

const generateCustomMessageEmail = (options = {}) => {
  const recipientTitle = options.recipientTitle || '';
  const recipientName = options.recipientName;
  const emailBody = options.emailBody;
  
  // Relationship Manager Details
  const rmName = options.rmName;
  const rmTitle = options.rmTitle;
  const rmDepartment = options.rmDepartment;
  const rmPhone = options.rmPhone;
  const rmEmail = options.rmEmail;
  
  const businessName = "إميراترست | EmiraTrust Bank";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 4px; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
        .header { background: #0f172a; color: #d4a373; padding: 35px 40px; text-align: left; border-bottom: 4px solid #a67c00; }
        .header h1 { margin: 0; font-size: 26px; color: #ffffff; font-weight: 500; letter-spacing: 0.5px; }
        .header h2 { margin: 12px 0 0 0; font-size: 13px; font-weight: 600; color: #d4a373; letter-spacing: 2.5px; text-transform: uppercase; }
        .content { padding: 45px 40px; background-color: #ffffff; }
        .email-body { margin-bottom: 35px; font-size: 15px; color: #334155; line-height: 1.8; }
        .email-body p { margin-bottom: 16px; }
        .signature { margin-top: 40px; padding-top: 25px; border-top: 1px solid #f1f5f9; }
        .signature-name { font-weight: 600; font-size: 16px; color: #0f172a; margin-bottom: 3px; }
        .signature-title { font-size: 14px; color: #64748b; margin: 2px 0; }
        .signature-div { font-size: 14px; color: #a67c00; margin: 2px 0; font-weight: 600; }
        
        .contact-info { background-color: #f8fafc; padding: 35px 40px; border-top: 1px solid #e2e8f0; }
        .contact-info p { margin: 6px 0; font-size: 13px; color: #475569; }
        .contact-info .icon { color: #a67c00; font-weight: 600; margin-right: 8px; width: 16px; display: inline-block; }
        
        .footer { background-color: #0f172a; padding: 35px 40px; text-align: left; font-size: 11px; color: #94a3b8; line-height: 1.6; }
        .footer strong { color: #cbd5e1; font-weight: 600; letter-spacing: 0.5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${businessName}</h1>
          <h2>Private Banking | Wealth Management<br>UAE</h2>
        </div>
        
        <div class="content">
          <div class="email-body">
            <p>Dear ${recipientTitle} ${recipientName},</p>
            
            ${emailBody}
            
          </div>
          
          <div class="signature">
            <p style="margin-bottom: 12px; color: #334155;">Regards,</p>
            <div class="signature-name">${rmName}</div>
            <div class="signature-title">${rmTitle}</div>
            <div class="signature-div">${rmDepartment}</div>
          </div>
        </div>
        
        <div class="contact-info">
          <div class="signature-name" style="margin-bottom: 12px; font-size: 15px;">${rmName}</div>
          <div class="signature-title">${rmTitle}</div>
          <div class="signature-div" style="margin-bottom: 18px;">${rmDepartment}</div>
          
          <p><span class="icon">T:</span> ${rmPhone}</p>
          <p><span class="icon">E:</span> ${rmEmail}</p>
          <p><span class="icon">W:</span> www.emiratrustgroup.com</p>
        </div>
        
        <div class="footer">
          <p style="margin-bottom: 12px; font-size: 12px;"><strong>LEGAL DISCLAIMER</strong></p>
          <p style="margin-bottom: 20px;">This email and any attachments are confidential and intended solely for the recipient. If you have received this email in error, please notify the sender and delete it immediately.</p>
          
          <p><strong>Bank EmiraTrust PJSC</strong><br>Licensed by the Central Bank of the UAE</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { generateCustomMessageEmail };
