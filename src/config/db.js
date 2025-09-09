import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Reduced from 2000 to 10000ms
  maxUses: 7500, // Close connections after 7500 queries
  allowExitOnIdle: true
});

// Test database connection with better error handling
export const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`   Database time: ${result.rows[0].current_time}`);
    
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // Provide more specific error information
    if (error.code === 'ECONNREFUSED') {
      console.error('   → Database server is not running or not accessible');
      console.error('   → Check if PostgreSQL is running and the port is correct');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   → Database host not found');
      console.error('   → Check your DATABASE_URL configuration');
    } else if (error.code === '28P01') {
      console.error('   → Authentication failed');
      console.error('   → Check username and password in DATABASE_URL');
    } else if (error.code === '3D000') {
      console.error('   → Database does not exist');
      console.error('   → Create the database or check the database name');
    } else if (error.message.includes('timeout')) {
      console.error('   → Connection timeout');
      console.error('   → Check network connectivity and database server status');
    }
    
    throw error;
  }
};

// Graceful shutdown
export const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ Database pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error.message);
  }
};

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err.message);
  // Don't exit immediately, let the application handle it gracefully
  console.error('   → This usually means the database server went down');
});

// Handle connection events
pool.on('connect', (client) => {
  console.log('🔌 New database connection established');
});

pool.on('acquire', (client) => {
  console.log('📥 Database client acquired from pool');
});

pool.on('release', (client) => {
  console.log('📤 Database client released back to pool');
});

export default pool;
