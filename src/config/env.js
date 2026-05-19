/**
 * Dynamic Environment Configuration
 * This utility helps switch between Local and Ngrok environments easily
 */

const isNgrok = process.env.USE_NGROK === 'true';

const config = {
  frontendUrl: isNgrok 
    ? process.env.NGROK_FRONTEND_URL 
    : process.env.LOCAL_FRONTEND_URL,
  isNgrok
};

module.exports = config;
