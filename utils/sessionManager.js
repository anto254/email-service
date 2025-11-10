// utils/sessionManager.js
const Session = require("../models/Session");
const { v4: uuidv4 } = require("uuid");
const UAParser = require("ua-parser-js");
const axios = require("axios");

// Configuration
const SESSION_CONFIG = {
  MAX_SESSIONS_PER_USER: 5, // Maximum concurrent sessions per user
  SESSION_TIMEOUT_DAYS: 7, // Session expiry in days
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  RISK_FACTORS: {
    NEW_DEVICE: 20,
    NEW_LOCATION: 15,
    UNUSUAL_TIME: 10,
    NEW_IP: 10,
  },
};

// Helper function to get location from IP
const getLocationFromIP = async (ip) => {
  try {
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

    const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
      timeout: 3000,
      headers: { "User-Agent": "SessionManager/1.0" },
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

// Helper function to create device fingerprint
const createDeviceFingerprint = (ip, userAgent, additionalData = {}) => {
  const crypto = require("crypto");
  const fingerprint = `${ip}-${userAgent}-${JSON.stringify(additionalData)}`;
  return crypto.createHash("sha256").update(fingerprint).digest("hex");
};

// Calculate risk score for a login attempt
const calculateRiskScore = async (userId, sessionData, existingSessions) => {
  let riskScore = 0;

  // Check if it's a new device
  const sameDevice = existingSessions.some(
    (session) => session.deviceFingerprint === sessionData.deviceFingerprint
  );
  if (!sameDevice) {
    riskScore += SESSION_CONFIG.RISK_FACTORS.NEW_DEVICE;
  }

  // Check if it's a new location
  const sameLocation = existingSessions.some(
    (session) =>
      session.region.city === sessionData.region.city &&
      session.region.country === sessionData.region.country
  );
  if (!sameLocation) {
    riskScore += SESSION_CONFIG.RISK_FACTORS.NEW_LOCATION;
  }

  // Check if it's a new IP
  const sameIP = existingSessions.some(
    (session) => session.ipAddress === sessionData.ipAddress
  );
  if (!sameIP) {
    riskScore += SESSION_CONFIG.RISK_FACTORS.NEW_IP;
  }

  // Check for unusual login time (outside typical hours)
  const loginHour = new Date().getHours();
  if (loginHour < 6 || loginHour > 22) {
    // Outside 6 AM - 10 PM
    riskScore += SESSION_CONFIG.RISK_FACTORS.UNUSUAL_TIME;
  }

  return Math.min(riskScore, 100); // Cap at 100
};

// Create a new session
const createSession = async (
  userId,
  userEmail,
  refreshToken,
  req,
  loginMethod = "password"
) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.connection?.remoteAddress ||
      req.ip ||
      "127.0.0.1";

    const userAgent = req.headers["user-agent"] || "";
    const { device, browser, os } = parseUserAgent(userAgent);
    const deviceFingerprint = createDeviceFingerprint(ip, userAgent);

    // Get location information
    const region = await getLocationFromIP(ip);

    // Get existing sessions for risk calculation
    const existingSessions = await Session.find({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    // Calculate risk score
    const sessionData = {
      deviceFingerprint,
      region,
      ipAddress: ip,
    };
    const riskScore = await calculateRiskScore(
      userId,
      sessionData,
      existingSessions
    );

    // Check session limit
    if (existingSessions.length >= SESSION_CONFIG.MAX_SESSIONS_PER_USER) {
      // Remove the oldest session
      const oldestSession = existingSessions.sort(
        (a, b) => a.lastActivity - b.lastActivity
      )[0];
      await oldestSession.terminate("device_limit");
    }

    // Create new session
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + SESSION_CONFIG.SESSION_TIMEOUT_DAYS
    );

    const newSession = new Session({
      userId,
      userEmail,
      sessionId,
      refreshToken,
      ipAddress: ip,
      userAgent,
      device: device.charAt(0).toUpperCase() + device.slice(1),
      browser,
      os,
      deviceFingerprint,
      region,
      expiresAt,
      loginMethod,
      riskScore,
      isSuspicious: riskScore > 50,
    });

    await newSession.save();

    return {
      success: true,
      sessionId,
      riskScore,
      isSuspicious: riskScore > 50,
      activeSessionsCount: existingSessions.length + 1,
    };
  } catch (error) {
    console.error("Error creating session:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Update session activity
const updateSessionActivity = async (sessionId) => {
  try {
    const session = await Session.findOne({ sessionId, isActive: true });
    if (session) {
      await session.updateActivity();
      return { success: true };
    }
    return { success: false, error: "Session not found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get active sessions for a user
const getActiveSessions = async (userId) => {
  try {
    const sessions = await Session.getActiveSessions(userId);

    return {
      success: true,
      sessions: sessions.map((session) => ({
        sessionId: session.sessionId,
        device: session.device,
        browser: session.browser,
        os: session.os,
        ipAddress: session.ipAddress,
        location: `${session.region.city}, ${session.region.country}`,
        loginTime: session.loginTime,
        lastActivity: session.lastActivity,
        isCurrent: false, // This should be set by the calling function
        isSuspicious: session.isSuspicious,
        riskScore: session.riskScore,
        isActive: true,
      })),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Terminate a session
const terminateSession = async (sessionId, reason = "user_logout") => {
  try {
    const session = await Session.findOne({ sessionId, isActive: true });
    if (session) {
      await session.terminate(reason);
      return { success: true };
    }
    return { success: false, error: "Session not found or already terminated" };
  } catch (error) {
    console.log(error)
    return { success: false, error: error.message };
  }
};

// Terminate all sessions for a user except current
const terminateAllUserSessions = async (
  userId,
  excludeSessionId = null,
  reason = "user_logout"
) => {
  try {
    const filter = {
      userId,
      isActive: true,
    };

    if (excludeSessionId) {
      filter.sessionId = { $ne: excludeSessionId };
    }

    const sessions = await Session.find(filter);

    for (const session of sessions) {
      await session.terminate(reason);
    }

    return {
      success: true,
      terminatedCount: sessions.length,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Clean up expired sessions
const cleanupExpiredSessions = async () => {
  try {
    const result = await Session.cleanExpiredSessions();
    console.log(`Cleaned up ${result.modifiedCount} expired sessions`);
    return { success: true, cleanedCount: result.modifiedCount };
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
    return { success: false, error: error.message };
  }
};

// Get session statistics
const getSessionStats = async (userId = null) => {
  try {
    const matchStage = userId
      ? { userId: mongoose.Types.ObjectId(userId) }
      : {};

    const stats = await Session.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          activeSessions: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isActive", true] },
                    { $gt: ["$expiresAt", new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          expiredSessions: {
            $sum: { $cond: [{ $lt: ["$expiresAt", new Date()] }, 1, 0] },
          },
          suspiciousSessions: {
            $sum: { $cond: [{ $eq: ["$isSuspicious", true] }, 1, 0] },
          },
          avgRiskScore: { $avg: "$riskScore" },
        },
      },
    ]);

    // Get device breakdown
    const deviceStats = await Session.aggregate([
      {
        $match: {
          ...matchStage,
          isActive: true,
          expiresAt: { $gt: new Date() },
        },
      },
      {
        $group: {
          _id: "$device",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get location breakdown
    const locationStats = await Session.aggregate([
      {
        $match: {
          ...matchStage,
          isActive: true,
          expiresAt: { $gt: new Date() },
        },
      },
      {
        $group: {
          _id: {
            city: "$region.city",
            country: "$region.country",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return {
      success: true,
      stats: stats[0] || {
        totalSessions: 0,
        activeSessions: 0,
        expiredSessions: 0,
        suspiciousSessions: 0,
        avgRiskScore: 0,
      },
      deviceBreakdown: deviceStats,
      locationBreakdown: locationStats,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Validate session
const validateSession = async (sessionId, refreshToken) => {
  try {
    const session = await Session.findOne({
      sessionId,
      refreshToken,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return { success: false, error: "Invalid or expired session" };
    }

    // Update last activity
    await session.updateActivity();

    return { success: true, session };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Initialize cleanup scheduler
const initializeSessionCleanup = () => {
  console.log("Initializing session cleanup scheduler...");

  // Run cleanup immediately
  cleanupExpiredSessions();

  // Schedule periodic cleanup
  setInterval(cleanupExpiredSessions, SESSION_CONFIG.CLEANUP_INTERVAL);
};

module.exports = {
  createSession,
  updateSessionActivity,
  getActiveSessions,
  terminateSession,
  terminateAllUserSessions,
  cleanupExpiredSessions,
  getSessionStats,
  validateSession,
  initializeSessionCleanup,
  SESSION_CONFIG,
};
