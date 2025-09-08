import { readFileSync, writeFileSync } from 'fs';
const envType = process.argv[2] || 'docker';

const envFiles = {
  docker: '.env.docker',
  local: '.env.example'
};

if (!envFiles[envType]) {
  console.error('Invalid environment type. Use: docker or local');
  process.exit(1);
}

try {
  const sourceFile = envFiles[envType];
  const content = readFileSync(sourceFile, 'utf8');
  writeFileSync('.env', content);
  
  console.log(`Environment configuration changed to: ${envType}`);
  console.log(`Copied from: ${sourceFile} -> .env`);

  if (envType === 'docker') {
    console.log(`
To use with Docker:
1. npm run docker:up
2. npm run demo:ingest
3. npm start

Available interfaces:
- API: http://localhost:3000
- ClickHouse: http://localhost:8123 (analytics)
- MySQL: localhost:3306 (main database)
`);
  }
  
} catch (error) {
  console.error('Error setting up environment:', error.message);
  process.exit(1);
}
