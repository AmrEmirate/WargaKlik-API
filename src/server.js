require('dotenv').config();

const app = require('./app');
const { sequelize } = require('./models');
const waService = require('./services/whatsapp.service');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connected successfully');

    // Sync models — only use alter:true in development
    // In production, use sequelize migrations instead
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync();
      console.log('Database synced (development mode)');
    } else {
      await sequelize.sync();
      console.log('Database synced');
    }

    // Initialize WhatsApp
    if (process.env.WHATSAPP_ENABLED === 'true') {
      waService.init();
      console.log('WhatsApp service initialized');
    } else {
      console.log('WhatsApp service disabled (WHATSAPP_ENABLED=false)');
    }

    // Initialize cron jobs
    require('./jobs');
    console.log('Cron jobs initialized');

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('⏳ Shutting down gracefully...');
      server.close();
      if (waService.client) {
        try {
          await waService.client.destroy();
          console.log('WhatsApp client destroyed');
        } catch (e) {
          console.error('Error destroying WA client:', e.message);
        }
      }
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Global error handlers to prevent crash
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      // Optional: process.exit(1) if you want to restart, 
      // but here we want to see if it survives.
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
