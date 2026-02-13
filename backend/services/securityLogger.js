const fs = require('fs');
const path = require('path');

class SecurityLogger {
  constructor() {
    this.logFile = path.join(__dirname, '../logs/security.log');
  }

  _logEntry(type, message, ip, userAgent) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${type}] ${message} | IP: ${ip} | User-Agent: ${userAgent}\n`;
    fs.appendFileSync(this.logFile, entry);
  }

  logFailedLogin(identifier, reason, ip, userAgent) {
    const message = `Failed login attempt for ${identifier}: ${reason}`;
    this._logEntry('FAILED_LOGIN', message, ip, userAgent);
  }

  logAccountLockout(identifier, ip, userAgent) {
    const message = `Account lockout for ${identifier}`;
    this._logEntry('ACCOUNT_LOCKOUT', message, ip, userAgent);
  }

  logLoginAttempt(identifier, success, ip, userAgent) {
    const status = success ? 'SUCCESS' : 'FAILED';
    const message = `Login attempt for ${identifier}: ${status}`;
    this._logEntry('LOGIN_ATTEMPT', message, ip, userAgent);
  }

  logSuspiciousActivity(type, data, ip, userAgent) {
    const message = `Suspicious activity: ${type} | Data: ${JSON.stringify(data)}`;
    this._logEntry('SUSPICIOUS_ACTIVITY', message, ip, userAgent);
  }

  logPasswordChange(userId, ip, userAgent) {
    const message = `Password change for user ${userId}`;
    this._logEntry('PASSWORD_CHANGE', message, ip, userAgent);
  }

  log(type, data, ip, userAgent) {
    const message = `${type}: ${JSON.stringify(data)}`;
    this._logEntry(type, message, ip, userAgent);
  }
}

module.exports = SecurityLogger;
