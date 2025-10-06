const nodemailer = require('nodemailer');

const createTransporter = async () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
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
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const secure = port === 465; 
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
  },

  otp: (otp, userName = 'User') => {
    return {
      subject: 'Password Reset OTP - Naaya',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">नाया (Naaya)</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Nepal's Hyper-Local Social Network</p>
          </div>

          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Verification</h2>

            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Hello ${userName},
            </p>

            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your Naaya account. Please use the following OTP to verify your identity:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <div style="background: linear-gradient(45deg, #667eea 30%, #764ba2 90%);
                          color: white;
                          padding: 20px;
                          border-radius: 8px;
                          font-size: 32px;
                          font-weight: bold;
                          letter-spacing: 5px;
                          display: inline-block;">
                ${otp}
              </div>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Important:</strong> This OTP will expire in 10 minutes for security reasons.
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
  }
};



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

const sendOTPEmail = async (email, otp, userName = 'User') => {
  try {
    const transporter = await createTransporter();
    const template = emailTemplates.otp(otp, userName);

    const mailOptions = {
      from: `"Naaya Team" <${process.env.SMTP_USER || 'noreply@naaya.com'}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

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

module.exports = {
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendOTPEmail,
  sendNotificationEmail,

  emailTemplates,
  createTransporter
};
