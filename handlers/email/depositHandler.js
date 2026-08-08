const emailService = require('../../services/emailService');
const emailConfig = require('../../config/emailConfig');
const { generateDepositEmail } = require('../../templates/email/depositTemplate');

const sendDepositEmail = async (email, options) => {
  if (!email) throw new Error('Email address is required');

  const htmlContent = generateDepositEmail(options);
  
  const subject = `Deposit Confirmation - $${options.amount}`;

  return await emailService.sendBrevoEmail(subject, email, htmlContent, {
    senderName: emailConfig.senderName || emailConfig.businessName || "EmiraTrust Bank"
  });
};

module.exports = { sendDepositEmail };
