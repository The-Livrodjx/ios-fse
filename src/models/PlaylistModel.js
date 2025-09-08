import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class PlaylistModel {
  static async upsert(playlist) {
    const query = db.getUpsertQuery('playlists', playlist, ['id']);
    await db.query(query.sql, query.values);
  }

  static async upsertBatch(playlists) {
    return await db.transaction(async (connection) => {
      let upsertedCount = 0;
      
      for (const playlist of playlists) {
        const query = db.getUpsertQuery('playlists', playlist, ['id']);
        
        await connection.execute(query.sql, query.values);
        upsertedCount++;
      }
      
      logger.debug(`Upserted ${upsertedCount} playlists`);
      return upsertedCount;
    });
  }

  static async findById(id) {
    const sql = 'SELECT * FROM playlists WHERE id = ?';
    const result = await db.query(sql, [id]);
    return result[0] || null;
  }

  static async getTracksWithEnergyFilter(playlistId, energyMin = 0) {
    const sql = `
      SELECT 
        t.id,
        t.name,
        t.duration_ms,
        t.explicit,
        t.popularity,
        al.id as album_id,
        al.name as album_name,
        al.release_date,
        al.album_type,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', a.id,
            'name', a.name,
            'popularity', a.popularity
          )
        ) as artists,
        af.danceability,
        af.energy,
        af.valence,
        af.tempo,
        af.key_signature,
        af.mode,
        pt.position,
        pt.added_at,
        pt.added_by
      FROM playlist_tracks pt
      JOIN tracks t ON pt.track_id = t.id
      JOIN albums al ON t.album_id = al.id
      JOIN artists a ON a.id IN (
        SELECT DISTINCT artist_id 
        FROM track_artists ta 
        WHERE ta.track_id = t.id
      )
      LEFT JOIN audio_features af ON t.id = af.track_id
      WHERE pt.playlist_id = ?
        AND (af.energy IS NULL OR af.energy >= ?)
      GROUP BY t.id, t.name, t.duration_ms, t.explicit, t.popularity,
               al.id, al.name, al.release_date, al.album_type,
               af.danceability, af.energy, af.valence, af.tempo, af.key_signature, af.mode,
               pt.position, pt.added_at, pt.added_by
      ORDER BY COALESCE(af.energy, 0) DESC, t.popularity DESC
    `;

    const simplifiedSql = `
      SELECT 
        t.id,
        t.name,
        t.duration_ms,
        t.explicit,
        t.popularity,
        JSON_OBJECT(
          'id', al.id,
          'name', al.name,
          'release_date', al.release_date,
          'album_type', al.album_type
        ) as album,
        af.danceability,
        af.energy,
        af.valence,
        af.tempo,
        af.key_signature,
        af.mode,
        pt.position,
        pt.added_at,
        pt.added_by
      FROM playlist_tracks pt
      JOIN tracks t ON pt.track_id = t.id
      LEFT JOIN albums al ON t.album_id = al.id
      LEFT JOIN audio_features af ON t.id = af.track_id
      WHERE pt.playlist_id = ?
        AND (af.energy IS NULL OR af.energy >= ?)
      ORDER BY COALESCE(af.energy, 0) DESC, t.popularity DESC
    `;

    const params = [playlistId, energyMin];
    
    const result = await db.query(simplifiedSql, params);
    return result;
  }

  static async addTrack(playlistId, trackId, position, addedBy = null, addedAt = null) {
    const playlistTrack = {
      playlist_id: playlistId,
      track_id: trackId,
      position: position,
      added_by: addedBy,
      added_at: addedAt || new Date().toISOString()
    };

    const query = db.getUpsertQuery('playlist_tracks', playlistTrack, ['playlist_id', 'track_id']);
    await db.query(query.sql, query.values);
  }

  static async addTracksBatch(playlistTracks) {
    return await db.transaction(async (connection) => {
      let upsertedCount = 0;
      
      for (const playlistTrack of playlistTracks) {
        const query = db.getUpsertQuery('playlist_tracks', playlistTrack, ['playlist_id', 'track_id']);
        
        await connection.execute(query.sql, query.values);
        upsertedCount++;
      }
      
      logger.debug(`Upserted ${upsertedCount} playlist tracks`);
      return upsertedCount;
    });
  }
}
