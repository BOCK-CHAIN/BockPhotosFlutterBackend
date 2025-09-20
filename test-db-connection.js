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
    connectionTimeoutMillis: 15000, // Increased for RDS
    idleTimeoutMillis: 30000,
    ssl: {
      rejectUnauthorized: false, // Allow self-signed certificates (common with RDS)
      sslmode: 'require'
    }
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
    
    // Provide specific troubleshooting tips for RDS
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 RDS Troubleshooting:');
      console.log('   → RDS instance is not running or not accessible');
      console.log('   → Check RDS instance status in AWS Console');
      console.log('   → Verify security groups allow connections from your IP/EC2');
      console.log('   → Check if RDS instance is in the correct VPC/subnet');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 RDS Troubleshooting:');
      console.log('   → RDS endpoint not found');
      console.log('   → Check your RDS endpoint in DATABASE_URL');
      console.log('   → Verify the endpoint format: your-db.region.rds.amazonaws.com');
    } else if (error.code === '28P01') {
      console.log('\n💡 RDS Troubleshooting:');
      console.log('   → Authentication failed');
      console.log('   → Check username and password in DATABASE_URL');
      console.log('   → Verify user exists in RDS instance');
      console.log('   → Check if user has proper permissions');
    } else if (error.code === '3D000') {
      console.log('\n💡 RDS Troubleshooting:');
      console.log('   → Database does not exist in RDS');
      console.log('   → Create the database in RDS instance');
      console.log('   → Check the database name in your connection string');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 RDS Troubleshooting:');
      console.log('   → Connection timeout to RDS');
      console.log('   → Check network connectivity between EC2 and RDS');
      console.log('   → Verify security groups allow port 5432');
      console.log('   → Check if RDS is in the same VPC as your EC2');
    } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
      console.log('\n💡 RDS SSL Troubleshooting:');
      console.log('   → SSL certificate issue with RDS');
      console.log('   → Ensure ?sslmode=require is in your DATABASE_URL');
      console.log('   → The connection is configured to accept self-signed certificates');
      console.log('   → If this persists, check your RDS SSL configuration');
    } else if (error.code === 'ECONNRESET') {
      console.log('\n💡 RDS Troubleshooting:');
      console.log('   → Connection reset by RDS server');
      console.log('   → Check RDS instance health and performance');
      console.log('   → Verify network stability between EC2 and RDS');
    }
    
    await pool.end();
    process.exit(1);
  }
}

// Run the test
testConnection();
