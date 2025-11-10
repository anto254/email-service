const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { updateSessionActivity } = require('../utils/sessionManager');

const verifyJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token required',
                statusCode: 401
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify the JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET);

        // Get user from database
        const user = await User.findById(decoded.id).select('-password -refreshToken');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
                statusCode: 401
            });
        }

        // Check if user is active
        if (user.status !== 'Active' || user.isDeleted || !user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated',
                statusCode: 403
            });
        }

        // Update session activity if session ID is available
        if (decoded.sessionId) {
            req.sessionId = decoded.sessionId;
            try {
                await updateSessionActivity(decoded.sessionId);
            } catch (sessionError) {
                // Don't fail the request if session update fails
                console.error('Session update error:', sessionError);
            }
        }

        // Add user to request object
        req.user = user;

        // Also add for backward compatibility
        req.userName = user.email;
        req.roles = user.role || user.roles;

        next();
    } catch (error) {
        let message = 'Invalid or expired token';
        let statusCode = 401;

        if (error.name === 'TokenExpiredError') {
            message = 'Token has expired';
        } else if (error.name === 'JsonWebTokenError') {
            message = 'Invalid token format';
        }

        return res.status(statusCode).json({
            success: false,
            message,
            statusCode
        });
    }
};

module.exports = verifyJWT; 