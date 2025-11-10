// middleware/subscriptionLimits.js
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Location = require('../models/Location');

/**
 * Check if business can add more employees
 */
const canAddEmployee = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID not found'
      });
    }

    // Get business subscription
    const subscription = await Subscription.findOne({
      businessId,
      subscriberType: 'business'
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found for this business'
      });
    }

    // Check if subscription is active
    if (!['trial', 'active'].includes(subscription.status)) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please renew to add employees.',
        subscriptionStatus: subscription.status
      });
    }

    // Count current active employees
    const activeEmployees = await User.countDocuments({
      businessId,
      isActive: true,
      isDeleted: false
    });

    // Check against limit
    if (activeEmployees >= subscription.maxEmployees) {
      return res.status(403).json({
        success: false,
        message: `Employee limit reached. Your ${subscription.planName} plan allows ${subscription.maxEmployees} employees. Please upgrade your plan.`,
        currentCount: activeEmployees,
        maxAllowed: subscription.maxEmployees,
        planName: subscription.planName
      });
    }

    // Add subscription info to request for later use
    req.subscription = subscription;
    req.employeeCount = activeEmployees;

    next();
  } catch (error) {
    console.error('Error checking employee limit:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking employee limit',
      error: error.message
    });
  }
};

/**
 * Check if business can activate an employee
 */
const canActivateEmployee = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const userId = req.params.userId || req.params.id || req.body.userId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID not found'
      });
    }

    // Get the user being activated
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If user is already active, no need to check limits
    if (user.isActive) {
      return next();
    }

    // Get business subscription
    const subscription = await Subscription.findOne({
      businessId,
      subscriberType: 'business'
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found for this business'
      });
    }

    // Check if subscription is active
    if (!['trial', 'active'].includes(subscription.status)) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please renew to activate employees.',
        subscriptionStatus: subscription.status
      });
    }

    // Count current active employees
    const activeEmployees = await User.countDocuments({
      businessId,
      isActive: true,
      isDeleted: false
    });

    // Check against limit
    if (activeEmployees >= subscription.maxEmployees) {
      return res.status(403).json({
        success: false,
        message: `Cannot activate employee. Employee limit reached. Your ${subscription.planName} plan allows ${subscription.maxEmployees} active employees. Please upgrade your plan.`,
        currentCount: activeEmployees,
        maxAllowed: subscription.maxEmployees,
        planName: subscription.planName
      });
    }

    // Add subscription info to request
    req.subscription = subscription;
    req.employeeCount = activeEmployees;

    next();
  } catch (error) {
    console.error('Error checking employee activation limit:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking employee activation limit',
      error: error.message
    });
  }
};

/**
 * Check if business can add more locations
 */
const canAddLocation = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID not found'
      });
    }

    // Get business subscription
    const subscription = await Subscription.findOne({
      businessId,
      subscriberType: 'business'
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found for this business'
      });
    }

    // Check if subscription is active
    if (!['trial', 'active'].includes(subscription.status)) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please renew to add locations.',
        subscriptionStatus: subscription.status
      });
    }

    // Count current active locations
    const activeLocations = await Location.countDocuments({
      businessId,
      isActive: true
    });

    // Check against limit
    if (activeLocations >= subscription.maxLocations) {
      return res.status(403).json({
        success: false,
        message: `Location limit reached. Your ${subscription.planName} plan allows ${subscription.maxLocations} locations. Please upgrade your plan.`,
        currentCount: activeLocations,
        maxAllowed: subscription.maxLocations,
        planName: subscription.planName
      });
    }

    // Add subscription info to request
    req.subscription = subscription;
    req.locationCount = activeLocations;

    next();
  } catch (error) {
    console.error('Error checking location limit:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking location limit',
      error: error.message
    });
  }
};

/**
 * Check if business has access to a specific feature
 */
const checkFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      const businessId = req.user.businessId;

      if (!businessId) {
        // Individual users might not have business restrictions
        return next();
      }

      // Get business subscription
      const subscription = await Subscription.findOne({
        businessId,
        subscriberType: 'business'
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'No subscription found for this business'
        });
      }

      // Check if subscription is active
      if (!['trial', 'active'].includes(subscription.status)) {
        return res.status(403).json({
          success: false,
          message: 'Your subscription is not active. Please renew to access this feature.',
          subscriptionStatus: subscription.status
        });
      }

      // Check if feature is enabled
      if (!subscription.features[featureName]) {
        return res.status(403).json({
          success: false,
          message: `This feature (${featureName}) is not available in your ${subscription.planName} plan. Please upgrade to access it.`,
          featureName,
          planName: subscription.planName,
          availableFeatures: Object.keys(subscription.features).filter(
            key => subscription.features[key] === true
          )
        });
      }

      // Add subscription info to request
      req.subscription = subscription;

      next();
    } catch (error) {
      console.error('Error checking feature access:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking feature access',
        error: error.message
      });
    }
  };
};

/**
 * Validate subscription status
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;

    if (!businessId) {
      // Individual users or operations not tied to business
      return next();
    }

    // Get business subscription
    const subscription = await Subscription.findOne({
      businessId,
      subscriberType: 'business'
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found for this business'
      });
    }

    // Check if subscription is active or in trial
    if (!['trial', 'active'].includes(subscription.status)) {
      return res.status(403).json({
        success: false,
        message: `Your subscription is ${subscription.status}. Please renew to continue using this service.`,
        subscriptionStatus: subscription.status,
        planName: subscription.planName,
        endDate: subscription.endDate
      });
    }

    // Check if trial has expired
    if (subscription.status === 'trial' && subscription.trialEndDate) {
      if (new Date() > subscription.trialEndDate) {
        // Update subscription status to expired
        subscription.status = 'expired';
        await subscription.save();

        return res.status(403).json({
          success: false,
          message: 'Your trial period has expired. Please upgrade to a paid plan to continue.',
          subscriptionStatus: 'expired',
          trialEndDate: subscription.trialEndDate
        });
      }
    }

    // Add subscription info to request
    req.subscription = subscription;

    next();
  } catch (error) {
    console.error('Error validating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating subscription',
      error: error.message
    });
  }
};

/**
 * Get current subscription usage
 */
const getSubscriptionUsage = async (businessId) => {
  try {
    const subscription = await Subscription.findOne({
      businessId,
      subscriberType: 'business'
    });

    if (!subscription) {
      return {
        success: false,
        error: 'Subscription not found'
      };
    }

    const [activeEmployees, activeLocations] = await Promise.all([
      User.countDocuments({ businessId, isActive: true, isDeleted: false }),
      Location.countDocuments({ businessId, isActive: true })
    ]);

    return {
      success: true,
      usage: {
        employees: {
          current: activeEmployees,
          max: subscription.maxEmployees,
          percentage: (activeEmployees / subscription.maxEmployees) * 100,
          canAddMore: activeEmployees < subscription.maxEmployees
        },
        locations: {
          current: activeLocations,
          max: subscription.maxLocations,
          percentage: (activeLocations / subscription.maxLocations) * 100,
          canAddMore: activeLocations < subscription.maxLocations
        }
      },
      subscription: {
        planName: subscription.planName,
        status: subscription.status,
        features: subscription.features
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  canAddEmployee,
  canActivateEmployee,
  canAddLocation,
  checkFeatureAccess,
  requireActiveSubscription,
  getSubscriptionUsage
};
