const nodemailer = require('nodemailer');
const telerivet = require('telerivet');

// Email service configuration
const createTransporter = async () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // If SMTP credentials not provided, use test account for development/testing
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } else {
    // Use real SMTP settings if credentials are provided
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const secure = port === 465; // true for 465, false for other ports
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: port,
      secure: secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
};

// Telerivet configuration
const apiKey = process.env.TELERIVET_API_KEY;
const projectId = process.env.TELERIVET_PROJECT_ID;
const fromPhoneNumber = process.env.TELERIVET_PHONE_ID;

const tr = apiKey && projectId ? new telerivet.API({ apiKey: apiKey }) : null;
const project = tr ? tr.initProjectById(projectId) : null;

// Helper function to promisify Telerivet sendMessage
const sendMessagePromise = (options) => {
  return new Promise((resolve, reject) => {
    project.sendMessage(options, (err, message) => {
      if (err) {
        reject(err);
      } else {
        resolve(message);
      }
    });
  });
};

// Email Templates
const emailTemplates = {
  passwordReset: (resetToken, userName = 'User') => {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;

    return {
      subject: 'Password Reset Request - Naaya',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">नाया (Naaya)</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Nepal's Hyper-Local Social Network</p>
          </div>

          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>

            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Hello ${userName},
            </p>

            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your Naaya account. If you made this request,
              click the button below to reset your password:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background: linear-gradient(45deg, #667eea 30%, #764ba2 90%);
                        color: white;
                        padding: 15px 30px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: bold;
                        display: inline-block;">
                Reset My Password
              </a>
            </div>

            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Or copy and paste this link into your browser:
            </p>

            <p style="color: #667eea; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>

            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Important:</strong> This link will expire in 10 minutes for security reasons.
                If you didn't request this password reset, please ignore this email.
              </p>
            </div>

            <p style="color: #666; line-height: 1.6; margin-top: 30px;">
              Best regards,<br>
              The Naaya Team
            </p>
          </div>

          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">
              © 2024 Naaya - Nepal's Hyper-Local Social Network<br>
              This email was sent to ${process.env.SMTP_USER || 'noreply@naaya.com'}
            </p>
          </div>
        </div>
      `,
    };
  },

  emailVerification: (verificationToken, userName = 'User') => {
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3001'}/verify-email?token=${verificationToken}`;

    return {
      subject: 'Verify Your Email - Naaya',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">नाया (Naaya)</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Nepal's Hyper-Local Social Network</p>
          </div>

          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome to Naaya!</h2>

            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Hello ${userName},
            </p>

            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thank you for joining Naaya! To complete your registration and start connecting with your local community,
              please verify your email address by clicking the button below:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="background: linear-gradient(45deg, #667eea 30%, #764ba2 90%);
                        color: white;
                        padding: 15px 30px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: bold;
                        display: inline-block;">
                Verify My Email
              </a>
            </div>

            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Or copy and paste this link into your browser:
            </p>

            <p style="color: #667eea; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px;">
              ${verificationUrl}
            </p>

            <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="color: #0c5460; margin: 0; font-size: 14px;">
                <strong>Note:</strong> This verification link will expire in 24 hours.
                If you didn't create an account with Naaya, please ignore this email.
              </p>
            </div>

            <p style="color: #666; line-height: 1.6; margin-top: 30px;">
              Welcome to the Naaya community!<br>
              The Naaya Team
            </p>
          </div>

          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">
              © 2024 Naaya - Nepal's Hyper-Local Social Network<br>
              This email was sent to ${process.env.SMTP_USER || 'noreply@naaya.com'}
            </p>
          </div>
        </div>
      `,
    };
  }
};

// SMS Templates
const smsTemplates = {
  passwordReset: (resetToken, userName = 'User') => {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
    return `Naaya Password Reset\n\nHello ${userName},\n\nWe received a request to reset your password. Click the link to reset: ${resetUrl}\n\nThis link expires in 10 minutes.\n\nIf you didn't request this, ignore this message.`;
  },

  verification: (verificationToken, userName = 'User') => {
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3001'}/verify-phone?token=${verificationToken}`;
    return `Naaya Phone Verification\n\nHello ${userName},\n\nVerify your phone number: ${verificationUrl}\n\nThis link expires in 24 hours.`;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userName = 'User') => {
  try {
    const transporter = await createTransporter();
    const template = emailTemplates.passwordReset(resetToken, userName);

    const mailOptions = {
      from: `"Naaya Team" <${process.env.SMTP_USER || 'noreply@naaya.com'}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Send email verification email
const sendEmailVerificationEmail = async (email, verificationToken, userName = 'User') => {
  try {
    const transporter = await createTransporter();
    const template = emailTemplates.emailVerification(verificationToken, userName);

    const mailOptions = {
      from: `"Naaya Team" <${process.env.SMTP_USER || 'noreply@naaya.com'}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Error sending email verification:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset SMS
const sendPasswordResetSMS = async (phone, resetToken, userName = 'User') => {
  try {
    if (!project) {
      console.error('Telerivet not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    const message = smsTemplates.passwordReset(resetToken, userName);

    const result = await sendMessagePromise({
      to_number: phone,
      content: message,
      from_number: fromPhoneNumber
    });

    return { success: true, messageId: result.id };

  } catch (error) {
    console.error('Error sending password reset SMS:', error);
    return { success: false, error: error.message };
  }
};

// Send SMS verification
const sendSMSVerification = async (phone, verificationToken, userName = 'User') => {
  try {
    if (!project) {
      console.error('Telerivet not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    const message = smsTemplates.verification(verificationToken, userName);

    const result = await sendMessagePromise({
      to_number: phone,
      content: message,
      from_number: fromPhoneNumber
    });

    return { success: true, messageId: result.id };

  } catch (error) {
    console.error('Error sending SMS verification:', error);
    return { success: false, error: error.message };
  }
};

// Send notification email
const sendNotificationEmail = async (email, subject, content, userName = 'User') => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Naaya Team" <${process.env.SMTP_USER || 'noreply@naaya.com'}>`,
      to: email,
      subject: subject,
      html: content,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Error sending notification email:', error);
    return { success: false, error: error.message };
  }
};

// Send custom SMS
const sendCustomSMS = async (phone, message) => {
  try {
    if (!project) {
      console.error('Telerivet not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    const result = await sendMessagePromise({
      to_number: phone,
      content: message,
      from_number: fromPhoneNumber
    });

    return { success: true, messageId: result.id };

  } catch (error) {
    console.error('Error sending custom SMS:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  // Email functions
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendNotificationEmail,

  // SMS functions
  sendPasswordResetSMS,
  sendSMSVerification,
  sendCustomSMS,

  // Utility functions
  emailTemplates,
  smsTemplates
};
