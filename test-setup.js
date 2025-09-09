#!/usr/bin/env node

// Simple test script to verify backend setup
import { env, validateEnvironment } from './src/config/env.js';
import { testConnection } from './src/config/db.js';
import { validateS3Config } from './src/config/s3.js';

console.log('🧪 Testing Backend Setup...\n');

async function testSetup() {
  try {
    // Test environment configuration
    console.log('1. Testing Environment Configuration...');
    validateEnvironment();
    console.log('   ✅ Environment variables loaded successfully');
    
    // Test database connection
    console.log('\n2. Testing Database Connection...');
    await testConnection();
    console.log('   ✅ Database connection successful');
    
    // Test S3 configuration
    console.log('\n3. Testing S3 Configuration...');
    const s3Configured = validateS3Config();
    if (s3Configured) {
      console.log('   ✅ S3 configuration valid');
    } else {
      console.log('   ⚠️  S3 not configured (photo uploads will be limited)');
    }
    
    console.log('\n🎉 All tests passed! Backend is ready to run.');
    console.log('\nTo start the server:');
    console.log('  npm run dev    # Development mode');
    console.log('  npm start      # Production mode');
    
  } catch (error) {
    console.error('\n❌ Setup test failed:', error.message);
    console.log('\nPlease check your configuration and try again.');
    process.exit(1);
  }
}

testSetup();
