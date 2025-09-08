import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class ArtistModel {
  static async upsert(artist) {
    const query = db.getUpsertQuery('artists', artist, ['id']);
    await db.query(query.sql, query.values);
  }

  static async upsertBatch(artists) {
    return await db.transaction(async (connection) => {
      let upsertedCount = 0;
      
      for (const artist of artists) {
        const query = db.getUpsertQuery('artists', artist, ['id']);
        
        await connection.execute(query.sql, query.values);
        upsertedCount++;
      }
      
      logger.debug(`Upserted ${upsertedCount} artists`);
      return upsertedCount;
    });
  }

  static async findById(id) {
    const sql = 'SELECT * FROM artists WHERE id = ?';
    const result = await db.query(sql, [id]);
    return result[0] || null;
  }

  static async findByIdWithTracks(id) {
    const sql = `
      SELECT 
        a.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', t.id,
            'name', t.name,
            'popularity', t.popularity,
            'duration_ms', t.duration_ms,
            'explicit', t.explicit,
            'album', JSON_OBJECT(
              'id', al.id,
              'name', al.name,
              'release_date', al.release_date,
              'album_type', al.album_type
            )
          )
        ) as top_tracks
      FROM artists a
      LEFT JOIN albums al ON al.id IN (
        SELECT DISTINCT album_id 
        FROM tracks 
        WHERE id IN (
          SELECT DISTINCT track_id 
          FROM playlist_tracks pt 
          JOIN tracks t2 ON pt.track_id = t2.id
          WHERE t2.album_id = al.id
        )
      )
      LEFT JOIN tracks t ON t.album_id = al.id
      WHERE a.id = ? 
        AND t.id IN (
          SELECT DISTINCT track_id 
          FROM playlist_tracks
        )
      GROUP BY a.id, a.name, a.popularity, a.followers
      ORDER BY t.popularity DESC
      LIMIT 5
    `;
    
    const result = await db.query(sql, [id]);
    return result[0] || null;
  }

  static async getTopTracksByArtist(artistId, limit = 5) {
    const sql = `
      SELECT 
        t.*,
        al.name as album_name,
        al.release_date,
        al.album_type,
        af.danceability,
        af.energy,
        af.valence,
        af.tempo
      FROM tracks t
      JOIN albums al ON t.album_id = al.id
      LEFT JOIN audio_features af ON t.id = af.track_id
      WHERE t.id IN (
        SELECT DISTINCT pt.track_id 
        FROM playlist_tracks pt 
        JOIN tracks t2 ON pt.track_id = t2.id
        JOIN albums al2 ON t2.album_id = al2.id
        WHERE al2.id = al.id
      )
      ORDER BY t.popularity DESC
      LIMIT ?
    `;

    const params = [artistId, limit];
    const result = await db.query(sql, params);
    return result;
  }
}
