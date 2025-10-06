require('dotenv').config();
const { sendOTPEmail, createTransporter } = require('./services/communicationService');

async function testEmailConfiguration() {
  console.log('🔍 Checking email configuration...\n');

  console.log('📋 Environment Variables:');
  console.log(`SMTP_USER: ${process.env.SMTP_USER ? '✅ Set' : '❌ Not set'}`);
  console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '✅ Set' : '❌ Not set'}`);
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST || 'smtp.gmail.com (default)'}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT || '587 (default)'}\n`);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('⚠️  SMTP credentials not found. Using test account (Ethereal Email) for development.');
    console.log('📧 Emails will be sent to Ethereal test inbox, not real Gmail.\n');

    try {
      const transporter = await createTransporter();
      console.log('✅ Test transporter created successfully');

      console.log('📤 Sending test OTP email...');
      const result = await sendOTPEmail('test@example.com', '123456', 'Test User');

      if (result.success) {
        console.log('✅ Test email sent successfully!');
        console.log(`📧 Message ID: ${result.messageId}`);
        console.log('🔗 Check your Ethereal inbox: https://ethereal.email');
      } else {
        console.log('❌ Failed to send test email:', result.error);
      }
    } catch (error) {
      console.log('❌ Error creating transporter:', error.message);
    }
  } else {
    console.log('✅ SMTP credentials found. Attempting to send real email...\n');

    try {
      const transporter = await createTransporter();
      console.log('✅ Real SMTP transporter created successfully');

      const testEmail = process.env.SMTP_USER; 
      console.log(`📤 Sending test OTP to: ${testEmail}`);

      const result = await sendOTPEmail(testEmail, '123456', 'Test User');

      if (result.success) {
        console.log('✅ Test email sent to real Gmail successfully!');
        console.log(`📧 Message ID: ${result.messageId}`);
        console.log('📬 Check your Gmail inbox (and spam folder)');
      } else {
        console.log('❌ Failed to send email:', result.error);
      }
    } catch (error) {
      console.log('❌ Error with real SMTP:', error.message);
      console.log('💡 For Gmail, make sure:');
      console.log('   1. Less secure app access is enabled, OR');
      console.log('   2. Use an App Password instead of your regular password');
      console.log('   3. 2FA might be required for App Passwords');
    }
  }
}

testEmailConfiguration().catch(console.error);
