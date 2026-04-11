
const mockSend = async ({ to, label, data }) => {
  console.log(`\n SIMULATED EMAIL `);
  console.log(`[Email] To: ${to}`);
  console.log(`[Type]: ${label}`);
  if (data) console.log(`[Data]: ${JSON.stringify(data, null, 2)}`);
  console.log(`\n`);

  return { success: true, simulated: true };
};

const communicationService = {
  async sendPasswordReset(to, resetLink, name) {
    return mockSend({
      to,
      label: 'password reset',
      data: { resetLink, name }
    });
  },

  async sendOTP(to, otp, name) {
    return mockSend({
      to,
      label: 'OTP',
      data: { otp, name }
    });
  },

  async sendVerification(to, url, name) {
    return mockSend({
      to,
      label: 'verification',
      data: { url, name }
    });
  }
};

module.exports = communicationService;

