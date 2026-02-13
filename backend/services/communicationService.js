const nodemailer = require('nodemailer');

const createTransporter = () => {
  const config = {
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  // If using Gmail, it's safer to use the 'service' property
  if (process.env.SMTP_SERVICE === 'gmail' || process.env.SMTP_USER?.endsWith('@gmail.com')) {
    config.service = 'gmail';
  } else {
    config.host = process.env.SMTP_HOST || 'smtp.gmail.com';
    config.port = process.env.SMTP_PORT || 587;
    config.secure = process.env.SMTP_PORT == 465;
  }

  return nodemailer.createTransport(config);
};

const emailTemplates = {
  passwordReset: (name, resetLink) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>You have requested to reset your password. Please click the link below to reset your password:</p>
        <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
        <p>This link will expire in 10 minutes.</p>
        <p>Best regards,<br>Naaya Team</p>
      </div>
    `
  }),

  otpEmail: (name, otp) => ({
    subject: 'Your OTP for Password Reset',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset OTP</h2>
        <p>Hello ${name},</p>
        <p>Your OTP for password reset is:</p>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
          ${otp}
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,<br>Naaya Team</p>
      </div>
    `
  }),

  verificationEmail: (name, verificationUrl) => ({
    subject: 'Verify Your Email - Naaya',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Naaya!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for joining our community. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #E91E63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>Naaya Team</p>
      </div>
    `
  })
};

const sendPasswordResetEmail = async (to, resetLink, name) => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates.passwordReset(name, resetLink);

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: template.subject,
      html: template.html
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

const sendOTPEmail = async (to, otp, name) => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates.otpEmail(name, otp);

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: template.subject,
      html: template.html
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

const sendVerificationEmail = async (to, verificationUrl, name) => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates.verificationEmail(name, verificationUrl);

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: template.subject,
      html: template.html
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  createTransporter,
  emailTemplates,
  sendPasswordResetEmail,
  sendOTPEmail,
  sendVerificationEmail
};
