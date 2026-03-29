const nodemailer = require('nodemailer');

const getTransporter = () => {
  const config = {
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  if (process.env.SMTP_SERVICE === 'gmail' || process.env.SMTP_USER?.endsWith('@gmail.com')) {
    config.service = 'gmail';
  } else {
    config.host = process.env.SMTP_HOST || 'smtp.gmail.com';
    config.port = process.env.SMTP_PORT || 587;
    config.secure = process.env.SMTP_PORT == 465;
  }

  return nodemailer.createTransport(config);
};

// generic sender to avoid repeating the same try-catch everywhere
const sendCore = async ({ to, subject, html, label }) => {
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html
    });
    console.log(`[email] sent: ${label} to ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[email] failed: ${label}`, error.message);
    return { success: false, error: error.message };
  }
};

const communicationService = {
  async sendPasswordReset(to, resetLink, name) {
    return sendCore({
      to,
      label: 'password reset',
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2>Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>Click the link below to reset your password. It expires in 10 minutes.</p>
          <a href="${resetLink}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          <p>Best,<br>Naaya Team</p>
        </div>
      `
    });
  },

  async sendOTP(to, otp, name) {
    return sendCore({
      to,
      label: 'OTP',
      subject: 'Your OTP for Password Reset',
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2>Your OTP</h2>
          <p>Hello ${name}, your code is:</p>
          <h1 style="background: #f4f4f4; padding: 20px; text-align: center;">${otp}</h1>
          <p>Expires in 10 mins.</p>
        </div>
      `
    });
  },

  async sendVerification(to, url, name) {
    return sendCore({
      to,
      label: 'verification',
      subject: 'Verify Your Email - Naaya',
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2>Welcome to Naaya!</h2>
          <p>Hi ${name}, please verify your email to get started:</p>
          <a href="${url}" style="background: #E91E63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email</a>
          <p>Best,<br>Naaya Team</p>
        </div>
      `
    });
  }
};

module.exports = communicationService;

