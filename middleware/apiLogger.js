// middleware/apiLogger.js
const ApiLog = require("../models/ApiLog");
const axios = require("axios");
const UAParser = require("ua-parser-js");

// Helper function to get location from IP
const getLocationFromIP = async (ip) => {
  try {
    // Skip local/private IPs
    if (
      ip === "::1" ||
      ip === "127.0.0.1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.")
    ) {
      return {
        country: "Local",
        countryCode: "LC",
        region: "Local",
        city: "Local",
        timezone: "Local",
        isp: "Local",
      };
    }

    // Use ipapi.co for geolocation (free tier: 1000 requests/day)
    const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
      timeout: 3000,
      headers: {
        "User-Agent": "API-Logger/1.0",
      },
    });

    const data = response.data;

    return {
      country: data.country_name || "Unknown",
      countryCode: data.country_code || "XX",
      region: data.region || "Unknown",
      city: data.city || "Unknown",
      timezone: data.timezone || "Unknown",
      isp: data.org || "Unknown",
    };
  } catch (error) {
    console.warn("Failed to get location for IP:", ip, error.message);
    return {
      country: "Unknown",
      countryCode: "XX",
      region: "Unknown",
      city: "Unknown",
      timezone: "Unknown",
      isp: "Unknown",
    };
  }
};

// Helper function to parse user agent
const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return {
      device: "Unknown",
      browser: "Unknown",
      os: "Unknown",
    };
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    device: result.device.type || result.device.model || "Desktop",
    browser: `${result.browser.name || "Unknown"} ${
      result.browser.version || ""
    }`.trim(),
    os: `${result.os.name || "Unknown"} ${result.os.version || ""}`.trim(),
  };
};

// Helper function to get real IP address
const getRealIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.headers["cf-connecting-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "127.0.0.1"
  );
};

// Helper function to sanitize sensitive data
const sanitizeData = (data) => {
  if (!data || typeof data !== "object") return data;

  const sensitiveFields = [
    "password",
    "currentPassword",
    "newPassword",
    "token",
    "refreshToken",
    "authorization",
  ];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
};

// Main API logging middleware
const apiLogger = (options = {}) => {
  const {
    excludePaths = [
      "/api/health",
      "/favicon.ico",
      "/api/super-admin-auth/*",
      "/api/super-admins/*",
      "/api/platform/*",
    ],
    includeRequestBody = true,
    includeHeaders = false,
    logOnlyErrors = false,
    enableGeolocation = true,
  } = options;

  return async (req, res, next) => {
    // Skip logging for excluded paths
    if (
      excludePaths.some((pattern) => {
        // Convert wildcard patterns (like /api/super-admins/*) to regex
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        return regex.test(req.path);
      })
    ) {
      return next();
    }
    const startTime = Date.now();
    const ipAddress = getRealIP(req);
    const userAgent = req.headers["user-agent"] || "";
    const { device, browser, os } = parseUserAgent(userAgent);

    // Store original res.json to capture response
    const originalJson = res.json;
    let responseBody = null;

    res.json = function (body) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    // Continue with the request
    next();

    // Log after response is sent
    res.on("finish", async () => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;

      // Skip logging successful requests if logOnlyErrors is true
      if (logOnlyErrors && success) {
        return;
      }

      try {
        // Get location information if enabled
        let region = null;
        if (enableGeolocation) {
          region = await getLocationFromIP(ipAddress);
        }

        // Prepare log data
        const logData = {
          method: req.method,
          endpoint: req.path,
          fullUrl: req.originalUrl,

          // User information (if authenticated)
          userId: req.user?.id || req.user?._id || null,
          userEmail: req.user?.email || null,

          // Request details
          requestBody: includeRequestBody ? sanitizeData(req.body) : {},
          queryParams: req.query || {},
          headers: includeHeaders ? sanitizeData(req.headers) : {},

          // Client information
          ipAddress,
          userAgent,
          device: device.charAt(0).toUpperCase() + device.slice(1),
          browser,
          os,

          // Location information
          region,

          // Response information
          statusCode: res.statusCode,
          success,
          responseTime,

          // Authentication information
          isAuthenticated: !!req.user,
          authMethod: req.user ? "jwt" : "none",

          // Session information
          sessionId: req.sessionId || null,
          referrer: req.headers.referer || req.headers.referrer || null,
        };

        // Add error information if request failed
        if (!success && responseBody) {
          logData.error = {
            message: responseBody.message || "Request failed",
            name: responseBody.error || "UnknownError",
          };
        }

        // Save log to database (non-blocking)
        const apiLog = new ApiLog(logData);
        await apiLog.save();
      } catch (error) {
        console.error("Failed to log API request:", error.message);
        // Don't throw error to avoid disrupting the response
      }
    });

    // Handle uncaught errors
    res.on("error", async (error) => {
      try {
        const logData = {
          method: req.method,
          endpoint: req.path,
          fullUrl: req.originalUrl,
          userId: req.user?.id || req.user?._id || null,
          userEmail: req.user?.email || null,
          ipAddress,
          userAgent,
          device: device.charAt(0).toUpperCase() + device.slice(1),
          browser,
          os,
          statusCode: 500,
          success: false,
          responseTime: Date.now() - startTime,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          isAuthenticated: !!req.user,
          authMethod: req.user ? "jwt" : "none",
        };

        if (enableGeolocation) {
          logData.region = await getLocationFromIP(ipAddress);
        }

        const apiLog = new ApiLog(logData);
        await apiLog.save();
      } catch (logError) {
        console.error("Failed to log API error:", logError.message);
      }
    });
  };
};

// Middleware to get API logs for admin users
const getApiLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      success,
      method,
      endpoint,
      startDate,
      endDate,
      ipAddress,
    } = req.query;

    // Build filter
    const filter = {};

    if (userId) filter.userId = userId;
    if (success !== undefined) filter.success = success === "true";
    if (method) filter.method = method.toUpperCase();
    if (endpoint) filter.endpoint = { $regex: endpoint, $options: "i" };
    if (ipAddress) filter.ipAddress = ipAddress;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await ApiLog.find(filter)
      .populate("userId", "email firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ApiLog.countDocuments(filter);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch API logs",
      error: error.message,
    });
  }
};

// Get API statistics
const getApiStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await ApiLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            success: "$success",
          },
          count: { $sum: 1 },
          avgResponseTime: { $avg: "$responseTime" },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    // Get top endpoints
    const topEndpoints = await ApiLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$endpoint",
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] },
          },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.json({
      success: true,
      data: {
        dailyStats: stats,
        topEndpoints,
        period: `${days} days`,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch API statistics",
      error: error.message,
    });
  }
};

module.exports = {
  apiLogger,
  getApiLogs,
  getApiStats,
};
