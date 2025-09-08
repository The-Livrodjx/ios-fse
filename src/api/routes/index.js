import express from 'express';
import { PlaylistController } from '../controllers/PlaylistController.js';
import { ArtistController } from '../controllers/ArtistController.js';

const router = express.Router();

router.get('/playlists/:id/tracks', PlaylistController.getPlaylistTracks);
router.get('/artists/:id/summary', ArtistController.getArtistSummary);

router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'playlist-normalizer-api'
  });
});

export default router;
