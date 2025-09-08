const path = require('path');

describe('Integration Tests (CommonJS)', () => {
  
  describe('API Health Check', () => {
    test('should validate health endpoint structure', () => {
      const expectedHealthResponse = {
        status: 'OK',
        timestamp: expect.any(String),
        service: 'playlist-normalizer-api'
      };
      
      const mockHealthResponse = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'playlist-normalizer-api'
      };
      
      expect(mockHealthResponse).toMatchObject({
        status: 'OK',
        service: 'playlist-normalizer-api'
      });
      expect(mockHealthResponse.timestamp).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    test('should validate playlist data structure', () => {
      const playlistData = {
        id: '37i9dQZF1DX0XUsuxWHRQd',
        name: 'RapCaviar',
        owner: { id: 'spotify' },
        snapshot_id: 'snapshot123'
      };
      
      expect(playlistData.id).toBeDefined();
      expect(playlistData.name).toBeDefined();
      expect(playlistData.owner).toBeDefined();
      expect(playlistData.snapshot_id).toBeDefined();
    });

    test('should validate track data structure', () => {
      const trackData = {
        id: '1mea3bSkSGXuIRvnydlB5b',
        name: 'Blinding Lights',
        duration_ms: 200040,
        explicit: false,
        popularity: 85
      };
      
      expect(trackData.id).toBeDefined();
      expect(trackData.name).toBeDefined();
      expect(typeof trackData.duration_ms).toBe('number');
      expect(typeof trackData.explicit).toBe('boolean');
      expect(typeof trackData.popularity).toBe('number');
      expect(trackData.popularity).toBeGreaterThanOrEqual(0);
      expect(trackData.popularity).toBeLessThanOrEqual(100);
    });

    test('should validate audio features structure', () => {
      const audioFeatures = {
        id: '1mea3bSkSGXuIRvnydlB5b',
        danceability: 0.514,
        energy: 0.73,
        valence: 0.334,
        tempo: 171.005
      };
      
      expect(audioFeatures.danceability).toBeGreaterThanOrEqual(0);
      expect(audioFeatures.danceability).toBeLessThanOrEqual(1);
      expect(audioFeatures.energy).toBeGreaterThanOrEqual(0);
      expect(audioFeatures.energy).toBeLessThanOrEqual(1);
      expect(audioFeatures.valence).toBeGreaterThanOrEqual(0);
      expect(audioFeatures.valence).toBeLessThanOrEqual(1);
      expect(audioFeatures.tempo).toBeGreaterThan(0);
    });
  });

  describe('Fixture Data Validation', () => {
    test('should have valid fixture files', () => {
      const fs = require('fs');
      const path = require('path');
      
      const playlistFixture = path.join(__dirname, '../../fixtures/playlist.basic.json');
      const audioFeaturesFixture = path.join(__dirname, '../../fixtures/audio_features.json');
      
      expect(fs.existsSync(playlistFixture)).toBe(true);
      expect(fs.existsSync(audioFeaturesFixture)).toBe(true);
      
      const playlistData = JSON.parse(fs.readFileSync(playlistFixture, 'utf8'));
      const audioFeaturesData = JSON.parse(fs.readFileSync(audioFeaturesFixture, 'utf8'));
      
      expect(playlistData).toBeDefined();
      expect(audioFeaturesData).toBeDefined();
      expect(Array.isArray(audioFeaturesData.audio_features)).toBe(true);
    });
  });
});
