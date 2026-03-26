const webpush = require('web-push');
const fs = require('fs');

const keys = webpush.generateVAPIDKeys();
const envLines = [
  '',
  'VAPID_PUBLIC_KEY=' + keys.publicKey,
  'VAPID_PRIVATE_KEY=' + keys.privateKey
].join('\n');

fs.appendFileSync('.env', envLines);
console.log('Successfully appended VAPID keys to .env');
console.log('Public Key:', keys.publicKey);
console.log('Private Key:', keys.privateKey);
