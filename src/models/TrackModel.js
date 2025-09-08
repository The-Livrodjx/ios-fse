import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class TrackModel {
  static async upsert(track) {
    const query = db.getUpsertQuery('tracks', track, ['id']);
    await db.query(query.sql, query.values);
  }

  static async upsertBatch(tracks) {
    return await db.transaction(async (connection) => {
      let upsertedCount = 0;
      
      for (const track of tracks) {
        const query = db.getUpsertQuery('tracks', track, ['id']);
        
        await connection.execute(query.sql, query.values);
        upsertedCount++;
      }
      
      logger.debug(`Upserted ${upsertedCount} tracks`);
      return upsertedCount;
    });
  }

  static async findById(id) {
    const sql = 'SELECT * FROM tracks WHERE id = ?';
    const result = await db.query(sql, [id]);
    return result[0] || null;
  }
}

export class AlbumModel {
  static async upsert(album) {
    const query = db.getUpsertQuery('albums', album, ['id']);
    await db.query(query.sql, query.values);
  }

  static async upsertBatch(albums) {
    return await db.transaction(async (connection) => {
      let upsertedCount = 0;
      
      for (const album of albums) {
        const query = db.getUpsertQuery('albums', album, ['id']);
        
        await connection.execute(query.sql, query.values);
        upsertedCount++;
      }
      
      logger.debug(`Upserted ${upsertedCount} albums`);
      return upsertedCount;
    });
  }

  static async findById(id) {
    const sql = 'SELECT * FROM albums WHERE id = ?';
    const result = await db.query(sql, [id]);
    return result[0] || null;
  }
}

export class AudioFeatureModel {
  static async upsert(audioFeature) {
    const query = db.getUpsertQuery('audio_features', audioFeature, ['track_id']);
    await db.query(query.sql, query.values);
  }

  static async upsertBatch(audioFeatures) {
    return await db.transaction(async (connection) => {
      let upsertedCount = 0;
      
      for (const audioFeature of audioFeatures) {
        const query = db.getUpsertQuery('audio_features', audioFeature, ['track_id']);
        
        await connection.execute(query.sql, query.values);
        upsertedCount++;
      }
      
      logger.debug(`Upserted ${upsertedCount} audio features`);
      return upsertedCount;
    });
  }

  static async findByTrackId(trackId) {
    const sql = 'SELECT * FROM audio_features WHERE track_id = ?';
    const result = await db.query(sql, [trackId]);
    return result[0] || null;
  }

  static async getAverageByArtist(artistId) {
    const sql = `
      SELECT 
        AVG(af.danceability) as avg_danceability,
        AVG(af.energy) as avg_energy,
        AVG(af.valence) as avg_valence,
        AVG(af.tempo) as avg_tempo,
        COUNT(*) as track_count
      FROM audio_features af
      JOIN tracks t ON af.track_id = t.id
      JOIN albums al ON t.album_id = al.id
      WHERE t.id IN (
        SELECT DISTINCT pt.track_id 
        FROM playlist_tracks pt 
        JOIN tracks t2 ON pt.track_id = t2.id
        JOIN albums al2 ON t2.album_id = al2.id
        WHERE al2.id = al.id
      )
    `;

    const result = await db.query(sql, [artistId]);
    return result[0] || null;
  }
}
