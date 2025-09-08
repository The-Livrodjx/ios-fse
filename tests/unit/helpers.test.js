import { jest, describe, test, expect } from '@jest/globals';
import { 
  normalizeArtist,
  normalizeAlbum,
  normalizeTrack,
  normalizePlaylist,
  normalizeAudioFeatures,
  validateAndSanitize,
  processBatches
} from '../../src/utils/helpers.js';

describe('Helpers Utils', () => {
  describe('validateAndSanitize', () => {
    test('should validate required fields', () => {
      const obj = { id: '123', name: 'Test' };
      const result = validateAndSanitize(obj, ['id', 'name']);
      
      expect(result).toEqual({ id: '123', name: 'Test' });
    });

    test('should throw error for missing required fields', () => {
      const obj = { id: '123' };
      
      expect(() => {
        validateAndSanitize(obj, ['id', 'name']);
      }).toThrow('Validation failed: Required field missing: name');
    });

    test('should remove null/undefined values', () => {
      const obj = { id: '123', name: 'Test', empty: null, undef: undefined };
      const result = validateAndSanitize(obj, ['id', 'name']);
      
      expect(result).toEqual({ id: '123', name: 'Test' });
    });
  });

  describe('normalizeArtist', () => {
    test('should normalize artist data correctly', () => {
      const artist = {
        id: 'artist123',
        name: '  Test Artist  ',
        popularity: 85,
        followers: { total: 1000000 }
      };

      const result = normalizeArtist(artist);

      expect(result).toEqual({
        id: 'artist123',
        name: 'Test Artist',
        popularity: 85,
        followers: 1000000
      });
    });

    test('should handle missing optional fields', () => {
      const artist = {
        id: 'artist123',
        name: 'Test Artist'
      };

      const result = normalizeArtist(artist);

      expect(result).toEqual({
        id: 'artist123',
        name: 'Test Artist',
        popularity: 0,
        followers: 0
      });
    });

    test('should throw error for missing required fields', () => {
      const artist = { id: 'artist123' };

      expect(() => {
        normalizeArtist(artist);
      }).toThrow('Validation failed: Required field missing: name');
    });
  });

  describe('normalizeTrack', () => {
    test('should normalize track data correctly', () => {
      const track = {
        id: 'track123',
        name: '  Test Track  ',
        duration_ms: 180000,
        explicit: true,
        popularity: 75,
        album: { id: 'album123' }
      };

      const result = normalizeTrack(track);

      expect(result).toEqual({
        id: 'track123',
        name: 'Test Track',
        duration_ms: 180000,
        explicit: true,
        popularity: 75,
        album_id: 'album123'
      });
    });

    test('should handle missing optional fields', () => {
      const track = {
        id: 'track123',
        name: 'Test Track',
        duration_ms: 180000
      };

      const result = normalizeTrack(track);

      expect(result).toEqual({
        id: 'track123',
        name: 'Test Track',
        duration_ms: 180000,
        explicit: false,
        popularity: 0
      });
    });
  });

  describe('normalizeAudioFeatures', () => {
    test('should normalize audio features correctly', () => {
      const features = {
        id: 'track123',
        danceability: 0.75,
        energy: 0.8,
        tempo: 120.5,
        key: 5,
        mode: 1,
        valence: 0.6
      };

      const result = normalizeAudioFeatures(features);

      expect(result).toEqual({
        track_id: 'track123',
        danceability: 0.75,
        energy: 0.8,
        tempo: 120.5,
        key_signature: 5,
        mode: 1,
        valence: 0.6
      });
    });

    test('should handle missing optional features', () => {
      const features = {
        id: 'track123',
        energy: 0.8
      };

      const result = normalizeAudioFeatures(features);

      expect(result).toEqual({
        track_id: 'track123',
        energy: 0.8
      });
    });
  });

  describe('processBatches', () => {
    test('should process array in batches', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const processor = jest.fn().mockImplementation(async (batch, batchNumber) => {
        return { processed: batch.length, batchNumber };
      });

      const results = await processBatches(items, 3, processor);

      expect(processor).toHaveBeenCalledTimes(4); // 10 items / 3 per batch = 4 batches
      expect(results).toHaveLength(4);
      expect(results[0]).toEqual({ processed: 3, batchNumber: 1 });
      expect(results[3]).toEqual({ processed: 1, batchNumber: 4 }); // Last batch with 1 item
    });

    test('should handle empty array', async () => {
      const items = [];
      const processor = jest.fn();

      const results = await processBatches(items, 3, processor);

      expect(processor).not.toHaveBeenCalled();
      expect(results).toHaveLength(0);
    });

    test('should propagate processor errors', async () => {
      const items = [1, 2, 3];
      const processor = jest.fn().mockRejectedValue(new Error('Processing failed'));

      await expect(processBatches(items, 2, processor)).rejects.toThrow('Processing failed');
    });
  });
});
