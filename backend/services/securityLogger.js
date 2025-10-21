const fs = require('fs').promises;
const path = require('path');

class SecurityLogger {
  constructor() {
    this.logFile = path.join(__dirname, '..', 'logs', 'security.log');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    try {
      require('fs').accessSync(logDir);
    } catch {
      require('fs').mkdirSync(logDir, { recursive: true });
    }
  }

  async log(event, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      ...details
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    const formattedDetails = Object.entries(details).map(([key, value]) => {
      const formattedValue = typeof value === 'string' ? `'${value}'` : value;
      return `  ${key}: ${formattedValue}`;
    }).join(',\n');

    try {
      await fs.appendFile(this.logFile, logLine);
      console.log(`🔐 Security Event: ${event} {\n${formattedDetails}\n}`);
    } catch (error) {
      console.error('Failed to write security log:', error);
    }
  }

  async logLoginAttempt(identifier, success, ip, userAgent) {
    await this.log('LOGIN_ATTEMPT', {
      identifier: this.maskIdentifier(identifier),
      success,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  async logFailedLogin(identifier, reason, ip, userAgent) {
    await this.log('FAILED_LOGIN', {
      identifier: this.maskIdentifier(identifier),
      reason,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  async logAccountLockout(identifier, ip, userAgent) {
    await this.log('ACCOUNT_LOCKOUT', {
      identifier: this.maskIdentifier(identifier),
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  async logSuspiciousActivity(activity, details, ip, userAgent) {
    await this.log('SUSPICIOUS_ACTIVITY', {
      activity,
      details,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  async logTokenRefresh(userId, ip, userAgent) {
    await this.log('TOKEN_REFRESH', {
      userId,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  async logPasswordChange(userId, ip, userAgent) {
    await this.log('PASSWORD_CHANGE', {
      userId,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  async logCSRFAttempt(url, ip, userAgent) {
    await this.log('CSRF_ATTEMPT', {
      url,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  async logRateLimitExceeded(endpoint, ip, userAgent) {
    await this.log('RATE_LIMIT_EXCEEDED', {
      endpoint,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  maskIdentifier(identifier) {
    if (identifier.includes('@')) {
      const [local, domain] = identifier.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    }
    if (/^\+?\d+$/.test(identifier)) {
      return `***${identifier.slice(-3)}`;
    }
    return identifier;
  }

  async getRecentLogs(hours = 24) {
    try {
      const logContent = await fs.readFile(this.logFile, 'utf8');
      const lines = logContent.trim().split('\n');
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      return lines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(entry => entry && new Date(entry.timestamp) > cutoffTime)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Failed to read security logs:', error);
      return [];
    }
  }
}

module.exports = SecurityLogger;
