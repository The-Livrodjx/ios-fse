import { PlaylistModel } from '../../models/PlaylistModel.js';
import { logger } from '../../utils/logger.js';

export class PlaylistController {
  static async getPlaylistTracks(req, res) {
    try {
      const { id } = req.params;
      const { energyMin = 0 } = req.query;
      
      logger.info(`Searching tracks for playlist ${id} with minimum energy ${energyMin}`);
      
      if (!id) {
        return res.status(400).json({
          error: 'Playlist ID is required'
        });
      }

      const energyMinFloat = parseFloat(energyMin);
      if (isNaN(energyMinFloat) || energyMinFloat < 0 || energyMinFloat > 1) {
        return res.status(400).json({
          error: 'energyMin must be a number between 0 and 1'
        });
      }

      const playlist = await PlaylistModel.findById(id);
      if (!playlist) {
        return res.status(404).json({
          error: 'Playlist not found'
        });
      }

      const tracks = await PlaylistModel.getTracksWithEnergyFilter(id, energyMinFloat);
      
      logger.info(`Found ${tracks.length} tracks with energy >= ${energyMinFloat}`);

      res.json({
        playlist: {
          id: playlist.id,
          name: playlist.name,
          owner: playlist.owner,
          snapshot: playlist.snapshot
        },
        filters: {
          energyMin: energyMinFloat
        },
        tracks: tracks.map(track => ({
          id: track.id,
          name: track.name,
          duration_ms: track.duration_ms,
          explicit: track.explicit,
          popularity: track.popularity,
          album: typeof track.album === 'string' ? JSON.parse(track.album) : track.album,
          audio_features: {
            danceability: track.danceability,
            energy: track.energy,
            valence: track.valence,
            tempo: track.tempo,
            key: track.key_signature,
            mode: track.mode
          },
          position: track.position,
          added_at: track.added_at,
          added_by: track.added_by
        })),
        total: tracks.length
      });

    } catch (error) {
      logger.error('Error searching playlist tracks', { 
        playlistId: req.params.id,
        error: error.message 
      });
      
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
}
