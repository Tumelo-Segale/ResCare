import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Running post-build setup...');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
  console.log('✅ Created logs directory');
}

// Check if production env file exists and copy it
const envSource = './.env.production';
const envDest = './.env';

if (fs.existsSync(envSource)) {
  fs.copyFileSync(envSource, envDest);
  console.log('✅ Production environment file copied');
} else {
  console.log('⚠️  .env.production not found, using existing .env');
}

console.log('✅ Build preparation completed');
console.log('📁 Build output: ./dist/');