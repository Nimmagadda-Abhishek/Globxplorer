const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const isConfigured = process.env.SMTP_HOST && 
                      process.env.SMTP_USER && 
                      !process.env.SMTP_USER.includes('your_');

  // Fallback function to log to console
  const logToConsole = () => {
    console.warn('--- Email Mock Notification (SMTP Not Configured or Failed) ---');
    console.warn(`To: ${options.email}`);
    console.warn(`Subject: ${options.subject}`);
    console.warn(`Message: ${options.message}`);
    console.warn('---------------------------------------------------------------');
  };

  if (!isConfigured) {
    return logToConsole();
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
    };

    const info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('SMTP Error, falling back to console log:', error.message);
    logToConsole();
    // We don't re-throw here so the user can still see the reset link in the console 
    // and the API response remains "Success" (Email sent/logged).
  }
};

module.exports = sendEmail;
