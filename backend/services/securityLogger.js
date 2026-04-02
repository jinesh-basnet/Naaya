const fs = require('fs').promises;
const path = require('path');

const logPath = path.join(__dirname, '../logs');
const logFile = path.join(logPath, 'security.log');


const securityLogger = {
  async _write(type, msg, ip = 'unknown', ua = 'unknown') {
    const time = new Date().toISOString();
    const line = `[${time}] [${type}] ${msg} | IP: ${ip} | UA: ${ua}\n`;
    
    console.log(`[security] ${type}: ${msg}`);
    
    try {
      await fs.mkdir(logPath, { recursive: true });
    } catch (e) {
    }
    try {
      await fs.appendFile(logFile, line, 'utf8');
    } catch (err) {
      console.error('[security] failed to write to log file:', err.message);
    }
  },

  failedLogin(id, reason, ip, ua) {
    this._write('FAIL_LOGIN', `user ${id} - ${reason}`, ip, ua);
  },

  lockout(id, ip, ua) {
    this._write('LOCKOUT', `account locked: ${id}`, ip, ua);
  },

  suspicious(type, data, ip, ua) {
    this._write('SUSPICIOUS', `${type} | ${JSON.stringify(data)}`, ip, ua);
  },

  passwordChange(userId, ip, ua) {
    this._write('PW_CHANGE', `user ${userId}`, ip, ua);
  },

  generic(type, data, ip, ua) {
    this._write(type, JSON.stringify(data), ip, ua);
  }
};

module.exports = securityLogger;

