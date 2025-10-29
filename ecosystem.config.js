export default {
  apps: [{
    name: 'rescare',
    script: './server.js',
    instances: 1, // Use 1 instance for stability
    exec_mode: 'fork', // Use fork mode instead of cluster
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}