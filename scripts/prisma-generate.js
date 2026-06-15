const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '..', '.env');
let dbUrl = process.env.DATABASE_URL || '';

if (!dbUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^DATABASE_URL=(.*)$/m);
  if (match) {
    dbUrl = match[1].replace(/["']/g, '').trim();
  }
}

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (dbUrl.startsWith('postgres')) {
  console.log('🔄 Detected PostgreSQL connection string, updating schema provider...');
  schema = schema.replace(/provider\s*=\s*"(?:sqlite|postgresql)"/, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema);
} else if (dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:')) {
  console.log('🔄 Detected SQLite connection string, ensuring schema provider is sqlite...');
  schema = schema.replace(/provider\s*=\s*"(?:sqlite|postgresql)"/, 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, schema);
}

try {
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (e) {
  console.error('Failed to generate Prisma client:', e);
  process.exit(1);
}
