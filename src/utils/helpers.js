import { logger } from './logger.js';

/**
 * Process arrays in batches to avoid memory overload
 * @param {Array} array - Array to be processed
 * @param {number} batchSize - Batch size
 * @param {Function} processor - Function that processes each batch
 */
export async function processBatches(array, batchSize, processor) {
  const results = [];
  const totalBatches = Math.ceil(array.length / batchSize);
  
  logger.info(`Processing ${array.length} items in ${totalBatches} batches of ${batchSize}`);
  
  for (let i = 0; i < array.length; i += batchSize) {
    const batch = array.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    logger.debug(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);
    
    try {
      const result = await processor(batch, batchNumber);
      results.push(result);
    } catch (error) {
      logger.error(`Error in batch ${batchNumber}`, { error: error.message });
      throw error;
    }
  }
  
  return results;
}

/**
 * Retry with exponential backoff
 * @param {Function} fn - Function to execute
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in ms
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        logger.error(`Failed after ${maxRetries} attempts`, { error: error.message });
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, { 
        error: error.message 
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Validates if an object has the required properties
 * @param {Object} obj - Object to validate
 * @param {Array} requiredFields - Required fields
 * @returns {Object} - Object with validated and optional fields filled
 */
export function validateAndSanitize(obj, requiredFields) {
  const errors = [];
  
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      errors.push(`Required field missing: ${field}`);
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Normalize artist data
 */
export function normalizeArtist(artist) {
  return validateAndSanitize({
    id: artist.id,
    name: artist.name?.trim(),
    popularity: artist.popularity || 0,
    followers: artist.followers?.total || 0
  }, ['id', 'name']);
}

/**
 * Normalize album data
 */
export function normalizeAlbum(album) {
  return validateAndSanitize({
    id: album.id,
    name: album.name?.trim(),
    release_date: album.release_date,
    album_type: album.album_type || 'album'
  }, ['id', 'name']);
}

/**
 * Normalize track data
 */
export function normalizeTrack(track) {
  return validateAndSanitize({
    id: track.id,
    name: track.name?.trim(),
    duration_ms: track.duration_ms,
    explicit: track.explicit || false,
    popularity: track.popularity || 0,
    album_id: track.album?.id
  }, ['id', 'name', 'duration_ms']);
}

/**
 * Normalize playlist data
 */
export function normalizePlaylist(playlist) {
  return validateAndSanitize({
    id: playlist.id,
    name: playlist.name?.trim(),
    owner: playlist.owner?.id,
    snapshot: playlist.snapshot_id
  }, ['id', 'name']);
}

/**
 * Normalize audio features data
 */
export function normalizeAudioFeatures(features) {
  return validateAndSanitize({
    track_id: features.id,
    danceability: features.danceability,
    energy: features.energy,
    tempo: features.tempo,
    key_signature: features.key,
    mode: features.mode,
    valence: features.valence
  }, ['track_id']);
}

/**
 * Convert timestamp to MySQL compatible format
 */
export function normalizeTimestamp(timestamp) {
  if (!timestamp) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
  
  return date.toISOString().slice(0, 19).replace('T', ' ');
}
