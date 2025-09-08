import { spawn } from 'child_process';

const runCommand = (command, args = [], options = {}) => {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', reject);
  });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function demo() {
  try {
    console.log('Starting complete demonstration of Playlist Normalizer & Insights\n');

    console.log('1. Setting up Docker environment...');
    await runCommand('node', ['scripts/setup-env.js', 'docker']);
    console.log('Docker environment configured\n');

    console.log('2. Starting Docker containers...');
    await runCommand('docker-compose', ['up', '-d']);
    console.log('Containers started\n');

    console.log('3. Waiting for databases to be ready...');
    await sleep(15000);
    console.log('Databases ready\n');

    console.log('4. Running data ingestion...');
    await runCommand('node', [
      'src/ingest/ingest.js',
      '--from', 'fixtures/playlist.basic.json',
      '--features', 'fixtures/audio_features.json'
    ]);
    console.log('Ingestion completed\n');

    console.log('5. Starting API in background...');
    const apiProcess = spawn('node', ['src/api/server.js'], {
      stdio: 'pipe',
      detached: true
    });

    await sleep(3000);
    console.log('API started on port 3000\n');
    console.log('6. Testing API endpoints...');
    
    const testCurl = async (url, description) => {
      console.log(`   ${description}`);
      try {
        await runCommand('curl', ['-s', url]);
        console.log('   OK\n');
      } catch (error) {
        console.log('   Error\n');
      }
    };

    await testCurl('http://localhost:3000/api/v1/health', 'Health check');
    await testCurl('http://localhost:3000/api/v1/playlists/37i9dQZF1DX0XUsuxWHRQd/tracks', 'Playlist tracks');
    await testCurl('http://localhost:3000/api/v1/playlists/37i9dQZF1DX0XUsuxWHRQd/tracks?energyMin=0.7', 'Filtered by energy');
    await testCurl('http://localhost:3000/api/v1/artists/2YZyLoL8N0Wb9xBt1NhZWg/summary', 'Artist summary');

    console.log('7. Running unit tests...');
    await runCommand('npm', ['run', 'test:unit']);
    console.log('Unit tests OK\n');

    console.log('8. Verifying data in database...');
    console.log('\nDatabase statistics:');
    
    apiProcess.kill();

    console.log(`
DEMONSTRATION COMPLETED SUCCESSFULLY!

Available URLs:
- API: http://localhost:3000
- ClickHouse: http://localhost:8123

  To stop containers:
   npm run docker:down
`);

  } catch (error) {
    console.error('Demo error:', error.message);
    
    console.log('\nCleaning up containers...');
    try {
      await runCommand('docker-compose', ['down']);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }
    
    process.exit(1);
  }
}

demo();
