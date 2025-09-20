module.exports = {
  apps: [{
    name: 'hynorvixx-backend',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      // RDS-specific environment variables
      DB_POOL_SIZE: 30,
      DB_CONNECTION_TIMEOUT: 15000,
      DB_IDLE_TIMEOUT: 60000
    },
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    
    // Watch mode (disable in production)
    watch: false,
    ignore_watch: ['node_modules', 'logs', '*.log'],
    
    // Graceful shutdown
    kill_timeout: 5000,
    // Do not wait for ready signal (app does not send it)
    wait_ready: false,
    
    
    // Environment variables
    env_file: '.env'
  }]
};
