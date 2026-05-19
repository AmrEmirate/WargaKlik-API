const cron = require('node-cron');
const { RefreshToken } = require('../models');
const { Op } = require('sequelize');

/**
 * Cleanup expired refresh tokens from DB
 * Runs daily at 2:00 AM to keep the table clean
 */
const setupCleanupExpiredTokens = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      const deleted = await RefreshToken.destroy({
        where: {
          expires_at: { [Op.lt]: new Date() }
        }
      });
      if (deleted > 0) {
        console.log(`[CronJob] Cleaned up ${deleted} expired refresh tokens`);
      }
    } catch (err) {
      console.error('[CronJob] Failed to cleanup expired tokens:', err.message);
    }
  });
};

module.exports = setupCleanupExpiredTokens;
