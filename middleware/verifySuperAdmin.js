const jwt = require("jsonwebtoken");
const SuperAdmin = require("../models/SuperAdmin");
const AuditLog = require("../models/AuditLog");

const verifySuperAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No token provided" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        console.error("JWT verification error:", err, authHeader);
        return res.status(403).json({ message: "Forbidden - Invalid token" });
      }

      console.log(decoded);

      // Check if this is a super admin token
      if (decoded.role !== "super_admin") {
        return res
          .status(403)
          .json({ message: "Forbidden - Super admin access required" });
      }

      const superAdmin = await SuperAdmin.findById(decoded.id).select(
        "-password -refreshToken"
      );

      if (!superAdmin) {
        return res.status(401).json({ message: "Super admin not found" });
      }

      if (superAdmin.status !== "active") {
        return res
          .status(403)
          .json({ message: "Super admin account is suspended or inactive" });
      }

      // Attach super admin to request
      req.superAdmin = superAdmin;
      next();
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error during authentication" });
  }
};

const authenticateAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // ✅ Verify token synchronously using async/await style
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Fetch SuperAdmin from DB
    const superAdmin = await SuperAdmin.findById(decoded.id).select(
      "-password -refreshToken"
    );

    if (!superAdmin) {
      return res.status(401).json({ message: "Super admin not found" });
    }

    if (superAdmin.status !== "active") {
      return res
        .status(403)
        .json({ message: "Super admin account is suspended or inactive" });
    }

    // ✅ Attach decoded data and admin info to req object
    req.adminTokenData = decoded;
    req.user = superAdmin;
    req.user.id = superAdmin._id; // Ensure id field is present
    req.superAdmin = superAdmin; // Attach the full superAdmin object

    next();
  } catch (err) {
    console.error("JWT authentication error:", err);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized - Token expired" });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Forbidden - Invalid token" });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Middleware to check specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.superAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.superAdmin.hasPermission(permission)) {
      // Log unauthorized access attempt
      AuditLog.log({
        userId: req.superAdmin._id,
        userName: `${req.superAdmin.firstName} ${req.superAdmin.lastName}`,
        userRole: req.superAdmin.role,
        action: "read",
        resourceType: "Platform",
        status: "failure",
        errorMessage: `Unauthorized access attempt - Missing permission: ${permission}`,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        method: req.method,
        endpoint: req.originalUrl,
      });

      return res.status(403).json({
        message: "Forbidden - Insufficient permissions",
        requiredPermission: permission,
      });
    }

    next();
  };
};

// Middleware to check if super admin can perform specific action
const requireAction = (action) => {
  return (req, res, next) => {
    if (!req.superAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.superAdmin.canPerformAction(action)) {
      return res.status(403).json({
        message: "Forbidden - Cannot perform this action",
        requiredAction: action,
      });
    }

    next();
  };
};

// Middleware to log all super admin actions
const logSuperAdminAction = async (req, res, next) => {
  // Store original json function
  const originalJson = res.json;

  // Override json function to log after response
  res.json = function (data) {
    // Log the action
    if (req.superAdmin) {
      AuditLog.log({
        userId: req.superAdmin._id,
        userName: `${req.superAdmin.firstName} ${req.superAdmin.lastName}`,
        userRole: req.superAdmin.role,
        action:
          req.method === "GET"
            ? "read"
            : req.method === "POST"
            ? "create"
            : req.method === "PUT"
            ? "update"
            : "delete",
        resourceType: "Platform",
        status: res.statusCode < 400 ? "success" : "failure",
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        method: req.method,
        endpoint: req.originalUrl,
        metadata: {
          statusCode: res.statusCode,
          params: req.params,
          query: req.query,
        },
      });
    }

    // Call original json function
    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  verifySuperAdmin,
  requirePermission,
  requireAction,
  logSuperAdminAction,
  authenticateAdminToken,
};
