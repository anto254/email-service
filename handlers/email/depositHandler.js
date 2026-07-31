const emailService = require('../../services/emailService');
const { generateDepositEmail } = require('../../templates/email/depositTemplate');

const sendDepositEmail = async (email, options) => {
  if (!email) throw new Error('Email address is required');

  const htmlContent = generateDepositEmail(options);
  
  const subject = `Deposit Confirmation - $${options.amount}`;

  return await emailService.sendBrevoEmail(subject, email, htmlContent);
};

module.exports = { sendDepositEmail };
