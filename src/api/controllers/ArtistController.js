import { db } from '../../config/database.js';
import { ArtistModel } from '../../models/ArtistModel.js';
import { logger } from '../../utils/logger.js';

export class ArtistController {
  static async getArtistSummary(req, res) {
    try {
      const { id } = req.params;
      
      logger.info(`Searching artist summary for ${id}`);
      
      if (!id) {
        return res.status(400).json({
          error: 'Artist ID is required'
        });
      }

      const artist = await ArtistModel.findById(id);
      if (!artist) {
        return res.status(404).json({
          error: 'Artist not found'
        });
      }

      const topTracksQuery = `
        WITH artist_tracks AS (
          SELECT DISTINCT
            t.id,
            t.name,
            t.popularity,
            t.duration_ms,
            t.explicit,
            al.id as album_id,
            al.name as album_name,
            al.release_date,
            al.album_type,
            af.danceability,
            af.energy,
            af.valence,
            af.tempo,
            af.key_signature,
            af.mode,
            ROW_NUMBER() OVER (ORDER BY t.popularity DESC, t.name) as rank_by_popularity
          FROM tracks t
          JOIN albums al ON t.album_id = al.id
          LEFT JOIN audio_features af ON t.id = af.track_id
          WHERE t.id IN (
            SELECT DISTINCT pt.track_id 
            FROM playlist_tracks pt
          )
          AND al.id IN (
            SELECT DISTINCT al2.id
            FROM albums al2
            JOIN tracks t2 ON al2.id = t2.album_id
            WHERE t2.id IN (
              SELECT DISTINCT pt2.track_id 
              FROM playlist_tracks pt2
            )
          )
        ),
        artist_features_agg AS (
          SELECT 
            AVG(af.danceability) as avg_danceability,
            AVG(af.energy) as avg_energy,
            AVG(af.valence) as avg_valence,
            AVG(af.tempo) as avg_tempo,
            COUNT(DISTINCT af.track_id) as tracks_with_features
          FROM audio_features af
          JOIN tracks t ON af.track_id = t.id
          WHERE t.id IN (
            SELECT track_id FROM artist_tracks WHERE rank_by_popularity <= 5
          )
        )
        SELECT 
          at.*,
          afa.avg_danceability,
          afa.avg_energy,
          afa.avg_valence,
          afa.avg_tempo,
          afa.tracks_with_features
        FROM artist_tracks at
        CROSS JOIN artist_features_agg afa
        WHERE at.rank_by_popularity <= 5
        ORDER BY at.rank_by_popularity
      `;

      const finalQuery = topTracksQuery;
      const tracks = await db.query(finalQuery);

      let avgFeatures = {
        danceability: null,
        energy: null,
        valence: null,
        tempo: null
      };

      if (tracks.length > 0 && tracks[0].avg_danceability !== null) {
        avgFeatures = {
          danceability: parseFloat(tracks[0].avg_danceability) || 0,
          energy: parseFloat(tracks[0].avg_energy) || 0,
          valence: parseFloat(tracks[0].avg_valence) || 0,
          tempo: parseFloat(tracks[0].avg_tempo) || 0
        };
      }

      const topTracks = tracks.map(track => ({
        id: track.id,
        name: track.name,
        popularity: track.popularity,
        duration_ms: track.duration_ms,
        explicit: track.explicit,
        album: {
          id: track.album_id,
          name: track.album_name,
          release_date: track.release_date,
          album_type: track.album_type
        },
        audio_features: track.danceability !== null ? {
          danceability: track.danceability,
          energy: track.energy,
          valence: track.valence,
          tempo: track.tempo,
          key: track.key_signature,
          mode: track.mode
        } : null
      }));

      logger.info(`Artist summary ${id} generated with ${topTracks.length} tracks`);

      res.json({
        artist: {
          id: artist.id,
          name: artist.name,
          popularity: artist.popularity,
          followers: artist.followers
        },
        top_tracks: topTracks,
        average_audio_features: avgFeatures,
        stats: {
          total_top_tracks: topTracks.length,
          tracks_with_features: tracks.length > 0 ? tracks[0].tracks_with_features : 0
        }
      });

    } catch (error) {
      logger.error('Error searching artist summary', { 
        artistId: req.params.id,
        error: error.message 
      });
      
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
}
