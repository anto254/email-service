const emailService = require('../../services/emailService');
const emailConfig = require('../../config/emailConfig');
const { generateCustomMessageEmail } = require('../../templates/email/customMessageTemplate');

const sendCustomMessageEmail = async (email, options) => {
  if (!email) throw new Error('Email address is required');
  if (!options.subject) throw new Error('Subject is required for custom messages');
  
  const htmlContent = generateCustomMessageEmail(options);
  
  return await emailService.sendBrevoEmail(options.subject, email, htmlContent, {
    senderName: options.rmName,
    senderEmail: options.senderEmail || emailConfig.senderOmar
  });
};

module.exports = { sendCustomMessageEmail };
