# ResCare Deployment Guide

## Prerequisites

- Node.js 18+
- MySQL 8.0+
- PM2 (for production) - Install with: `npm install -g pm2`

## Local Development

1. Clone repository
2. Run `npm install`
3. Configure `.env` file for development
4. Start MySQL service
5. Run `npm run dev` for frontend (port 5173)
6. Run `npm run start:dev` for backend (port 5000)

## Production Deployment

### Option 1: Direct Node.js

1. Set environment variables in `.env.production`
2. Run `npm run build` to build frontend
3. Run `npm run start:prod` to start production server

### Option 2: PM2 (Recommended)

1. Set environment variables in `.env.production`
2. Run `npm run build` to build frontend
3. Run `npm run pm2:prod` to start with PM2
4. Save PM2 process: `pm2 save`
5. Setup startup: `pm2 startup`

## Environment Variables

- `NODE_ENV`: development/production
- `DB_HOST`: Database host
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `JWT_SECRET`: Secure random string
- `ADMIN_EMAIL`: Admin login email
- `ADMIN_PASSWORD`: Admin password (change in production)
- `PORT`: Server port (default: 5000)
- `FRONTEND_URL`: Frontend URL for CORS

## Database Setup

1. Create MySQL database named `ResCareDB`
2. Tables will be auto-created on first run
3. Default admin account will be created automatically

## Monitoring

- PM2 monitoring: `pm2 monit`
- Logs location: `./logs/`
- Health check: `GET /api/health`

## Security Notes for Production

1. Change default JWT secret
2. Change admin password
3. Use strong database passwords
4. Configure proper CORS origins
5. Use HTTPS in production
6. Regular database backups
