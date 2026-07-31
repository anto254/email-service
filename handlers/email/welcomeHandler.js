const emailService = require('../../services/emailService');
const { generateWelcomeEmail } = require('../../templates/email/welcomeTemplate');

const sendWelcomeEmail = async (email, options) => {
  if (!email) throw new Error('Email address is required');
  const htmlContent = generateWelcomeEmail(options);
  const subject = `Welcome to EmiraTrust Bank, ${options.recipientName}!`;
  return await emailService.sendBrevoEmail(subject, email, htmlContent);
};

module.exports = { sendWelcomeEmail };
