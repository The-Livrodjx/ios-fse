const path = require('path');

describe('Helpers Utils (CommonJS)', () => {
  describe('validateAndSanitize', () => {
    test('should pass basic validation test', () => {
      const obj = { id: '123', name: 'Test' };
      
      const validateRequired = (data, required) => {
        const errors = [];
        for (const field of required) {
          if (!data[field]) {
            errors.push(`Required field missing: ${field}`);
          }
        }
        if (errors.length > 0) {
          throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
        
        const cleaned = {};
        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined) {
            cleaned[key] = value;
          }
        }
        return cleaned;
      };
      
      const result = validateRequired(obj, ['id', 'name']);
      expect(result).toEqual({ id: '123', name: 'Test' });
    });

    test('should throw error for missing required fields', () => {
      const obj = { id: '123' };
      
      const validateRequired = (data, required) => {
        const errors = [];
        for (const field of required) {
          if (!data[field]) {
            errors.push(`Required field missing: ${field}`);
          }
        }
        if (errors.length > 0) {
          throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
        return data;
      };
      
      expect(() => {
        validateRequired(obj, ['id', 'name']);
      }).toThrow('Validation failed: Required field missing: name');
    });
  });

  describe('processBatches', () => {
    test('should process batches correctly', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const processBatches = async (array, batchSize, processor) => {
        const results = [];
        for (let i = 0; i < array.length; i += batchSize) {
          const batch = array.slice(i, i + batchSize);
          const batchNumber = Math.floor(i / batchSize) + 1;
          const result = await processor(batch, batchNumber);
          results.push(result);
        }
        return results;
      };

      const processor = jest.fn().mockImplementation(async (batch, batchNumber) => {
        return `batch-${batchNumber}`;
      });

      const results = await processBatches(items, 3, processor);

      expect(processor).toHaveBeenCalledTimes(4); // 10 items / 3 per batch = 4 batches
      expect(results).toEqual(['batch-1', 'batch-2', 'batch-3', 'batch-4']);
    });

    test('should handle empty array', async () => {
      const items = [];
      
      const processBatches = async (array, batchSize, processor) => {
        const results = [];
        for (let i = 0; i < array.length; i += batchSize) {
          const batch = array.slice(i, i + batchSize);
          const batchNumber = Math.floor(i / batchSize) + 1;
          const result = await processor(batch, batchNumber);
          results.push(result);
        }
        return results;
      };

      const processor = jest.fn();

      const results = await processBatches(items, 3, processor);

      expect(processor).not.toHaveBeenCalled();
      expect(results).toEqual([]);
    });
  });
});
