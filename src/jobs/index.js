const setupGenerateTagihan = require('./generateTagihan');
const setupSendReminder = require('./sendReminder');
const setupCleanupExpiredTokens = require('./cleanupTokens');

// Initialize all cron jobs
setupGenerateTagihan();
setupSendReminder();
setupCleanupExpiredTokens();

console.log('All cron jobs initialized');
