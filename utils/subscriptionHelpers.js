// utils/subscriptionHelpers.js
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Location = require('../models/Location');

/**
 * Check if a business subscription is active
 */
const isSubscriptionActive = (subscription) => {
  if (!subscription) return false;

  // Check status
  if (!['trial', 'active'].includes(subscription.status)) {
    return false;
  }

  // Check if trial has expired
  if (subscription.status === 'trial' && subscription.trialEndDate) {
    if (new Date() > subscription.trialEndDate) {
      return false;
    }
  }

  return true;
};

/**
 * Get subscription with current usage statistics
 */
const getSubscriptionWithUsage = async (businessId) => {
  try {
    const subscription = await Subscription.findOne({
      businessId,
      subscriberType: 'business'
    }).populate('planId');

    if (!subscription) {
      return {
        success: false,
        error: 'No subscription found'
      };
    }

    // Get current usage
    const [activeEmployees, activeLocations] = await Promise.all([
      User.countDocuments({ businessId, isActive: true, isDeleted: false }),
      Location.countDocuments({ businessId, isActive: true })
    ]);

    // Update subscription usage
    subscription.currentUsage.activeEmployees = activeEmployees;
    subscription.currentUsage.activeLocations = activeLocations;
    subscription.currentUsage.lastUpdated = new Date();
    await subscription.save();

    return {
      success: true,
      subscription,
      usage: {
        employees: {
          current: activeEmployees,
          max: subscription.maxEmployees,
          percentage: (activeEmployees / subscription.maxEmployees) * 100,
          available: subscription.maxEmployees - activeEmployees,
          canAddMore: activeEmployees < subscription.maxEmployees
        },
        locations: {
          current: activeLocations,
          max: subscription.maxLocations,
          percentage: (activeLocations / subscription.maxLocations) * 100,
          available: subscription.maxLocations - activeLocations,
          canAddMore: activeLocations < subscription.maxLocations
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check if business can perform an action based on subscription
 */
const canPerformAction = async (businessId, actionType) => {
  const subscription = await Subscription.findOne({
    businessId,
    subscriberType: 'business'
  });

  if (!subscription) {
    return {
      allowed: false,
      reason: 'No subscription found'
    };
  }

  if (!isSubscriptionActive(subscription)) {
    return {
      allowed: false,
      reason: `Subscription is ${subscription.status}. Please renew to continue.`,
      subscriptionStatus: subscription.status
    };
  }

  switch (actionType) {
    case 'add_employee':
      const employeeCount = await User.countDocuments({
        businessId,
        isActive: true,
        isDeleted: false
      });

      if (employeeCount >= subscription.maxEmployees) {
        return {
          allowed: false,
          reason: `Employee limit (${subscription.maxEmployees}) reached. Please upgrade.`,
          current: employeeCount,
          max: subscription.maxEmployees,
          planName: subscription.planName
        };
      }
      break;

    case 'add_location':
      const locationCount = await Location.countDocuments({
        businessId,
        isActive: true
      });

      if (locationCount >= subscription.maxLocations) {
        return {
          allowed: false,
          reason: `Location limit (${subscription.maxLocations}) reached. Please upgrade.`,
          current: locationCount,
          max: subscription.maxLocations,
          planName: subscription.planName
        };
      }
      break;

    default:
      // Check if feature is enabled
      if (subscription.features && subscription.features[actionType] === false) {
        return {
          allowed: false,
          reason: `Feature '${actionType}' is not available in your ${subscription.planName} plan.`,
          planName: subscription.planName
        };
      }
  }

  return {
    allowed: true,
    subscription
  };
};

/**
 * Update subscription status based on trial/end dates
 */
const updateSubscriptionStatus = async (subscriptionId) => {
  try {
    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      return {
        success: false,
        error: 'Subscription not found'
      };
    }

    const now = new Date();
    let statusChanged = false;

    // Check if trial has expired
    if (subscription.status === 'trial' && subscription.trialEndDate) {
      if (now > subscription.trialEndDate) {
        subscription.status = 'expired';
        statusChanged = true;
      }
    }

    // Check if subscription has expired
    if (subscription.status === 'active' && subscription.endDate) {
      if (now > subscription.endDate) {
        subscription.status = 'expired';
        statusChanged = true;
      }
    }

    // Check if next billing is overdue
    if (subscription.status === 'active' && subscription.nextBillingDate) {
      if (now > subscription.nextBillingDate) {
        // Grace period of 3 days
        const gracePeriodEnd = new Date(subscription.nextBillingDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

        if (now > gracePeriodEnd) {
          subscription.status = 'past_due';
          statusChanged = true;
        }
      }
    }

    if (statusChanged) {
      await subscription.save();
    }

    return {
      success: true,
      subscription,
      statusChanged
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get available features for a subscription
 */
const getAvailableFeatures = (subscription) => {
  if (!subscription || !subscription.features) {
    return [];
  }

  return Object.keys(subscription.features).filter(
    key => subscription.features[key] === true
  );
};

/**
 * Get unavailable features for a subscription
 */
const getUnavailableFeatures = (subscription) => {
  if (!subscription || !subscription.features) {
    return [];
  }

  return Object.keys(subscription.features).filter(
    key => subscription.features[key] === false
  );
};

/**
 * Calculate days until subscription expires
 */
const getDaysUntilExpiry = (subscription) => {
  if (!subscription) return null;

  let expiryDate;

  if (subscription.status === 'trial' && subscription.trialEndDate) {
    expiryDate = subscription.trialEndDate;
  } else if (subscription.endDate) {
    expiryDate = subscription.endDate;
  } else {
    return null;
  }

  const now = new Date();
  const diffTime = expiryDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    days: diffDays,
    expiryDate,
    isExpired: diffDays <= 0,
    isExpiringSoon: diffDays > 0 && diffDays <= 7
  };
};

/**
 * Format subscription info for client
 */
const formatSubscriptionInfo = (subscription, usage = null) => {
  if (!subscription) return null;

  const daysUntilExpiry = getDaysUntilExpiry(subscription);
  const availableFeatures = getAvailableFeatures(subscription);
  const unavailableFeatures = getUnavailableFeatures(subscription);

  return {
    id: subscription._id,
    subscriberType: subscription.subscriberType,
    planName: subscription.planName,
    status: subscription.status,
    price: subscription.price,
    currency: subscription.currency,
    billingCycle: subscription.billingCycle,
    isActive: isSubscriptionActive(subscription),

    // Dates
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    nextBillingDate: subscription.nextBillingDate,
    trialEndDate: subscription.trialEndDate,

    // Expiry info
    expiryInfo: daysUntilExpiry,

    // Limits
    limits: {
      employees: {
        max: subscription.maxEmployees,
        current: usage?.employees?.current,
        available: usage?.employees?.available,
        percentage: usage?.employees?.percentage
      },
      locations: {
        max: subscription.maxLocations,
        current: usage?.locations?.current,
        available: usage?.locations?.available,
        percentage: usage?.locations?.percentage
      }
    },

    // Features
    features: subscription.features,
    availableFeatures,
    unavailableFeatures,

    // Auto renewal
    autoRenew: subscription.autoRenew
  };
};

module.exports = {
  isSubscriptionActive,
  getSubscriptionWithUsage,
  canPerformAction,
  updateSubscriptionStatus,
  getAvailableFeatures,
  getUnavailableFeatures,
  getDaysUntilExpiry,
  formatSubscriptionInfo
};
