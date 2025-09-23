#!/usr/bin/env node

// Standalone database connection test script
import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Resolve __dirname in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to RDS CA bundle (ensure you downloaded it)
const caPath = path.join(__dirname, "certs/ap-south-1-bundle.pem");

// Check if the CA bundle exists
if (!fs.existsSync(caPath)) {
  console.error(`❌ CA bundle not found at ${caPath}`);
  process.exit(1);
}

// Display connection info (without sensitive data)
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (urlParts) {
  console.log('📋 Connection Details:');
  console.log(`   Host: ${urlParts[3]}`);
  console.log(`   Port: ${urlParts[4]}`);
  console.log(`   Database: ${urlParts[5]}`);
  console.log(`   Username: ${urlParts[1]}`);
  console.log(`   Password: ${urlParts[2] ? '***' : 'not set'}`);
} else {
  console.log('📋 Connection URL format not recognized');
}

// Test connection
async function testConnection() {
  const pool = new Pool({
    connectionString: dbUrl,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    ssl: {
      rejectUnauthorized: true,                // enforce certificate verification
      ca: fs.readFileSync("/home/ubuntu/BockPhotosFlutterBackend/certs/ap-south-1-bundle.pem").toString(), // load RDS CA bundle
    },
  });

  try {
    console.log('\n🔄 Attempting connection...');
    const client = await pool.connect();
    console.log('✅ Connection successful!');

    // Simple query
    const result = await client.query('SELECT version() as version, NOW() as current_time');
    console.log(`   PostgreSQL Version: ${result.rows[0].version.split(' ')[0]}`);
    console.log(`   Server Time: ${result.rows[0].current_time}`);

    // Optional: test permissions
    try {
      await client.query('CREATE TEMP TABLE test_connection (id serial, test text)');
      await client.query('INSERT INTO test_connection (test) VALUES ($1)', ['connection_test']);
      await client.query('DROP TABLE test_connection');
      console.log('   ✅ Database permissions verified');
    } catch {
      console.log('   ⚠️ Limited database permissions (this might be expected)');
    }

    client.release();
    await pool.end();
    console.log('\n🎉 Database connection test passed!');
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);

    if (error.message.includes('certificate') || error.message.includes('self-signed')) {
      console.log('\n💡 RDS SSL Troubleshooting:');
      console.log('   → Ensure the CA bundle exists at:', caPath);
      console.log('   → Ensure ?sslmode=require is in your DATABASE_URL');
      console.log('   → Check network connectivity between EC2 and RDS');
    }

    await pool.end();
    process.exit(1);
  }
}

// Run the test
testConnection();