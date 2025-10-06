const axios = require('axios');

const BASE_URL = 'http://localhost:5000'; 

async function testPasswordResetEndpoints() {
  console.log('🔍 Testing Password Reset Endpoints...\n');

  try {
    console.log('📤 Test 1: Requesting OTP for password reset...');
    const requestResponse = await axios.post(`${BASE_URL}/api/password-reset/request`, {
      email: 'test@example.com' 
    });

    console.log('✅ Request OTP Response:', requestResponse.data);

    console.log('\n📋 Test 2: Verifying OTP...');
    try {
      const verifyResponse = await axios.post(`${BASE_URL}/api/password-reset/verify-otp`, {
        email: 'test@example.com',
        otp: '123456' 
      });
      console.log('✅ Verify OTP Response:', verifyResponse.data);
    } catch (error) {
      console.log('❌ Verify OTP Error (expected for dummy OTP):', error.response?.data || error.message);
    }

    console.log('\n🔑 Test 3: Resetting password with OTP...');
    try {
      const resetResponse = await axios.post(`${BASE_URL}/api/password-reset/reset-with-otp`, {
        email: 'test@example.com',
        otp: '123456', 
        newPassword: 'newpassword123'
      });
      console.log('✅ Reset Password Response:', resetResponse.data);
    } catch (error) {
      console.log('❌ Reset Password Error (expected for dummy OTP):', error.response?.data || error.message);
    }

    console.log('\n✅ All endpoint tests completed!');

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
  }
}

async function checkBackendStatus() {
  try {
    await axios.get(`${BASE_URL}/api/welcome`);
    console.log('✅ Backend server is running');
    return true;
  } catch (error) {
    console.log('❌ Backend server is not running. Please start it first with: npm start');
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Password Reset API Tests...\n');

  const isRunning = await checkBackendStatus();
  if (!isRunning) {
    return;
  }

  await testPasswordResetEndpoints();
}

main().catch(console.error);
