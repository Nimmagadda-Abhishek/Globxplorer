module.exports = {
  apps: [
    {
      name: 'crm-backend',
      script: 'server.js',
      instances: 'max', // Use maximum CPU cores
      exec_mode: 'cluster', // Enables load balancing
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Health Check support
      // When PM2 starts, it waits for 'ready' signal or for server to listen
      wait_ready: true,
      listen_timeout: 10000,
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000
      }
    }
  ]
};
