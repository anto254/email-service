const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AuditLogger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs', 'audit');
    this.initializeLogDirectory();
    this.currentDate = new Date().toISOString().split('T')[0];
    this.logBuffer = [];
    this.bufferSize = 100;
    this.flushInterval = 30000; // 30 seconds
    this.setupPeriodicFlush();
  }

  async initializeLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create audit log directory:', error);
    }
  }

  setupPeriodicFlush() {
    setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);

    // Flush on process exit
    process.on('SIGINT', () => this.flushLogs());
    process.on('SIGTERM', () => this.flushLogs());
  }

  generateLogEntry(type, action, details, req) {
    const timestamp = new Date().toISOString();
    const logId = crypto.randomUUID();
    
    const baseEntry = {
      log_id: logId,
      timestamp,
      type,
      action,
      details,
      session_id: req.sessionId || 'unknown',
      request_id: req.id || crypto.randomBytes(8).toString('hex')
    };

    // User information
    if (req.user) {
      baseEntry.user = {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role
      };
    }

    // Request information
    baseEntry.request = {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      referrer: req.get('Referrer')
    };

    // Additional security context
    baseEntry.security = {
      authenticated: !!req.user,
      rate_limited: req.rateLimited || false,
      suspicious_activity: this.detectSuspiciousActivity(req, action),
      geo_location: req.geoLocation || null
    };

    return baseEntry;
  }

  detectSuspiciousActivity(req, action) {
    const suspiciousPatterns = [
      // Multiple failed login attempts
      action === 'auth.login_failed',
      // Unauthorized access attempts
      req.statusCode === 403 || req.statusCode === 401,
      // Unusual request patterns
      req.originalUrl?.includes('../') || req.originalUrl?.includes('..\\'),
      // High-frequency requests (if rate limited)
      req.rateLimited,
      // SQL injection patterns in query parameters
      JSON.stringify(req.query || {}).match(/(\b(union|select|insert|update|delete|drop|create|alter)\b)/i),
      // XSS patterns
      JSON.stringify(req.body || {}).match(/(<script|javascript:|on\w+\s*=)/i)
    ];

    return suspiciousPatterns.some(pattern => pattern);
  }

  async logAuthentication(action, details, req) {
    const logEntry = this.generateLogEntry('authentication', action, details, req);
    
    // Add authentication-specific fields
    logEntry.auth_details = {
      method: details.method || 'unknown',
      success: details.success || false,
      failure_reason: details.failure_reason || null,
      two_factor_used: details.two_factor_used || false,
      password_strength: details.password_strength || null
    };

    this.addToBuffer(logEntry);
  }

  async logDataAccess(action, details, req) {
    const logEntry = this.generateLogEntry('data_access', action, details, req);
    
    // Add data access-specific fields
    logEntry.data_details = {
      resource_type: details.resource_type,
      resource_id: details.resource_id,
      operation: details.operation, // CREATE, READ, UPDATE, DELETE
      fields_accessed: details.fields_accessed || [],
      record_count: details.record_count || 1,
      sensitive_data: details.sensitive_data || false
    };

    this.addToBuffer(logEntry);
  }

  async logSystemChange(action, details, req) {
    const logEntry = this.generateLogEntry('system_change', action, details, req);
    
    // Add system change-specific fields
    logEntry.change_details = {
      component: details.component,
      old_value: details.old_value,
      new_value: details.new_value,
      change_reason: details.change_reason || null,
      approved_by: details.approved_by || null,
      rollback_possible: details.rollback_possible || false
    };

    this.addToBuffer(logEntry);
  }

  async logSecurityEvent(action, details, req) {
    const logEntry = this.generateLogEntry('security_event', action, details, req);
    
    // Add security event-specific fields
    logEntry.security_details = {
      severity: details.severity || 'medium', // low, medium, high, critical
      attack_type: details.attack_type || 'unknown',
      source_ip: req.ip,
      blocked: details.blocked || false,
      evidence: details.evidence || {},
      automated_response: details.automated_response || null
    };

    // Log security events immediately
    this.addToBuffer(logEntry);
    await this.flushLogs(); // Immediate flush for security events
  }

  async logBusinessEvent(action, details, req) {
    const logEntry = this.generateLogEntry('business_event', action, details, req);
    
    // Add business event-specific fields
    logEntry.business_details = {
      entity_type: details.entity_type, // lead, booking, client, etc.
      entity_id: details.entity_id,
      workflow_stage: details.workflow_stage || null,
      business_impact: details.business_impact || 'low',
      stakeholders: details.stakeholders || [],
      revenue_impact: details.revenue_impact || null
    };

    this.addToBuffer(logEntry);
  }

  async logApiAccess(action, details, req, res) {
    const logEntry = this.generateLogEntry('api_access', action, details, req);
    
    // Add API access-specific fields
    logEntry.api_details = {
      endpoint: req.route?.path || req.path,
      response_status: res?.statusCode,
      response_time: details.response_time,
      payload_size: details.payload_size || 0,
      api_version: details.api_version || 'v1',
      client_type: details.client_type || 'web',
      rate_limit_remaining: details.rate_limit_remaining || null
    };

    this.addToBuffer(logEntry);
  }

  addToBuffer(logEntry) {
    this.logBuffer.push(logEntry);
    
    // Check if we need to rotate log file
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.currentDate) {
      this.currentDate = today;
    }

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushLogs();
    }
  }

  async flushLogs() {
    if (this.logBuffer.length === 0) {
      return;
    }

    try {
      const logFile = path.join(this.logDir, `audit-${this.currentDate}.jsonl`);
      const logData = this.logBuffer.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      
      await fs.appendFile(logFile, logData, 'utf8');
      
      // Clear buffer
      this.logBuffer = [];
      
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Keep logs in buffer for retry
    }
  }

  // Middleware function for automatic request logging
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Capture original res.end to log response details
      const originalEnd = res.end;
      res.end = function(...args) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Log API access
        auditLogger.logApiAccess('api.request', {
          response_time: responseTime,
          payload_size: req.get('content-length') || 0,
          client_type: req.get('X-Client-Type') || 'web'
        }, req, res);
        
        // Call original end function
        originalEnd.apply(this, args);
      };

      next();
    };
  }

  // Search and query methods
  async searchLogs(criteria) {
    const { 
      startDate, 
      endDate, 
      type, 
      action, 
      userId, 
      ip, 
      severity,
      limit = 100 
    } = criteria;

    try {
      const logs = [];
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();
      
      // Get all log files in date range
      const logFiles = await this.getLogFilesInRange(start, end);
      
      for (const file of logFiles) {
        const filePath = path.join(this.logDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const logEntry = JSON.parse(line);
            
            // Apply filters
            if (type && logEntry.type !== type) continue;
            if (action && logEntry.action !== action) continue;
            if (userId && logEntry.user?.id !== userId) continue;
            if (ip && logEntry.request?.ip !== ip) continue;
            if (severity && logEntry.security_details?.severity !== severity) continue;
            
            logs.push(logEntry);
            
            if (logs.length >= limit) break;
          } catch (parseError) {
            // Skip malformed log entries
            continue;
          }
        }
        
        if (logs.length >= limit) break;
      }
      
      return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
    } catch (error) {
      console.error('Error searching logs:', error);
      throw error;
    }
  }

  async getLogFilesInRange(startDate, endDate) {
    try {
      const files = await fs.readdir(this.logDir);
      const auditFiles = files.filter(file => file.startsWith('audit-') && file.endsWith('.jsonl'));
      
      return auditFiles.filter(file => {
        const dateStr = file.match(/audit-(\d{4}-\d{2}-\d{2})\.jsonl/);
        if (!dateStr) return false;
        
        const fileDate = new Date(dateStr[1]);
        return fileDate >= startDate && fileDate <= endDate;
      });
      
    } catch (error) {
      console.error('Error reading log directory:', error);
      return [];
    }
  }

  async getAuditSummary(days = 7) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const logs = await this.searchLogs({ 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString(),
        limit: 10000 
      });
      
      const summary = {
        total_events: logs.length,
        date_range: { start: startDate, end: endDate },
        by_type: {},
        by_action: {},
        by_user: {},
        security_events: 0,
        suspicious_activity: 0,
        top_ips: {},
        error_rate: 0
      };
      
      logs.forEach(log => {
        // Count by type
        summary.by_type[log.type] = (summary.by_type[log.type] || 0) + 1;
        
        // Count by action
        summary.by_action[log.action] = (summary.by_action[log.action] || 0) + 1;
        
        // Count by user
        if (log.user?.id) {
          const userKey = `${log.user.firstName} ${log.user.lastName}`;
          summary.by_user[userKey] = (summary.by_user[userKey] || 0) + 1;
        }
        
        // Count security events
        if (log.type === 'security_event') {
          summary.security_events++;
        }
        
        // Count suspicious activity
        if (log.security?.suspicious_activity) {
          summary.suspicious_activity++;
        }
        
        // Count IPs
        if (log.request?.ip) {
          summary.top_ips[log.request.ip] = (summary.top_ips[log.request.ip] || 0) + 1;
        }
        
        // Count errors (4xx, 5xx responses)
        if (log.api_details?.response_status >= 400) {
          summary.error_rate++;
        }
      });
      
      // Calculate error rate percentage
      const apiRequests = logs.filter(log => log.type === 'api_access').length;
      summary.error_rate = apiRequests > 0 ? (summary.error_rate / apiRequests * 100).toFixed(2) + '%' : '0%';
      
      return summary;
      
    } catch (error) {
      console.error('Error generating audit summary:', error);
      throw error;
    }
  }
}

const auditLogger = new AuditLogger();

module.exports = auditLogger;