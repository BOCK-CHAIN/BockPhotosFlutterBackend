#!/usr/bin/env node

// Standalone database connection test script
import dotenv from 'dotenv';
import pg from 'pg';

// Load environment variables
dotenv.config();

const { Pool } = pg;

console.log('🧪 Testing Database Connection...\n');

// Display connection info (without sensitive data)
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
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
} else {
  console.log('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

// Test connection
async function testConnection() {
  const pool = new Pool({
    connectionString: dbUrl,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });

  try {
    console.log('\n🔄 Attempting connection...');
    const client = await pool.connect();
    
    console.log('✅ Connection successful!');
    
    // Test a simple query
    const result = await client.query('SELECT version() as version, NOW() as current_time');
    console.log(`   PostgreSQL Version: ${result.rows[0].version.split(' ')[0]}`);
    console.log(`   Server Time: ${result.rows[0].current_time}`);
    
    // Test if we can create a table (to verify permissions)
    try {
      await client.query('CREATE TEMP TABLE test_connection (id serial, test text)');
      await client.query('INSERT INTO test_connection (test) VALUES ($1)', ['connection_test']);
      await client.query('SELECT * FROM test_connection');
      await client.query('DROP TABLE test_connection');
      console.log('   ✅ Database permissions verified');
    } catch (permError) {
      console.log('   ⚠️  Limited database permissions (this might be expected)');
    }
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Database connection test passed!');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    
    // Provide specific troubleshooting tips
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:');
      console.log('   → PostgreSQL server is not running');
      console.log('   → Check if PostgreSQL service is started');
      console.log('   → Verify the port number in your connection string');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Troubleshooting:');
      console.log('   → Database host not found');
      console.log('   → Check your DATABASE_URL configuration');
      console.log('   → Verify the hostname/IP address');
    } else if (error.code === '28P01') {
      console.log('\n💡 Troubleshooting:');
      console.log('   → Authentication failed');
      console.log('   → Check username and password');
      console.log('   → Verify user has access to the database');
    } else if (error.code === '3D000') {
      console.log('\n💡 Troubleshooting:');
      console.log('   → Database does not exist');
      console.log('   → Create the database first');
      console.log('   → Check the database name in your connection string');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   → Connection timeout');
      console.log('   → Check network connectivity');
      console.log('   → Verify firewall settings');
      console.log('   → Try increasing connection timeout');
    } else if (error.message.includes('SSL')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   → SSL connection issue');
      console.log('   → Try adding ?sslmode=require to your DATABASE_URL');
      console.log('   → Or use ?sslmode=disable for local development');
    }
    
    await pool.end();
    process.exit(1);
  }
}

// Run the test
testConnection();
