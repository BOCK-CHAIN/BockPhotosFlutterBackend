import app from './app.js';
import { env, validateEnvironment } from './config/env.js';
import { testConnection, closePool } from './config/db.js';
import { validateS3Config } from './config/s3.js';
import cors from "cors";


let server;

// Retry database connection with exponential backoff
const retryDatabaseConnection = async (maxRetries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempting database connection (${attempt}/${maxRetries})...`);
      await testConnection();
      return true;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`   ⏳ Connection failed, retrying in ${delay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
};

// Start server function
const startServer = async () => {
  try {
    // Validate environment variables
    console.log('🔧 Validating environment configuration...');
    validateEnvironment();
    console.log('   ✅ Environment configuration validated');
    
    // Test database connection with retry logic
    console.log('\n🗄️  Testing database connection...');
    await retryDatabaseConnection();
    
    // Test S3 configuration
    console.log('\n☁️  Testing S3 configuration...');
    const s3Configured = validateS3Config();
    if (s3Configured) {
      console.log('   ✅ S3 configuration valid');
    } else {
      console.log('   ⚠️  S3 not configured (photo uploads will be limited)');
    }
    
    // Start HTTP server
    server = app.listen(env.PORT, () => {
      console.log('\n🚀 Server started successfully');
      console.log(`📱 Environment: ${env.NODE_ENV}`);
      console.log(`🌐 Server running on port ${env.PORT}`);
      console.log(`🔗 API available at http://localhost:${env.PORT}/api`);
      console.log(`💚 Health check: http://localhost:${env.PORT}/health`);
      console.log(`🔐 Auth endpoints:`);
      console.log(`   POST /api/auth/signup`);
      console.log(`   POST /api/auth/login`);
      console.log(`   POST /api/auth/refresh`);
      console.log(`   POST /api/auth/logout`);
      console.log(`📸 Photo endpoints:`);
      console.log(`   GET /api/photos`);
      console.log(`   POST /api/photos/upload-url`);
      console.log(`   PUT /api/photos/:id`);
      console.log(`   DELETE /api/photos/:id`);
    });
    
  } catch (error) {
    console.error('\n❌ Server startup failed:', error.message);
    
    if (error.message.includes('Database connection failed')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   1. Check if PostgreSQL is running');
      console.log('   2. Verify DATABASE_URL in your .env file');
      console.log('   3. Ensure the database exists');
      console.log('   4. Check network connectivity');
      console.log('   5. Verify username/password');
    }
    
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  // Close HTTP server
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');
    });
  }
  
  // Close database pool
  await closePool();
  
  console.log('✅ Graceful shutdown completed');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();

export default server;
