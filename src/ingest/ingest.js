import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'fs';
import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';
import {
  processBatches,
  retryWithBackoff,
  normalizeArtist,
  normalizeAlbum,
  normalizeTrack,
  normalizePlaylist,
  normalizeAudioFeatures,
  normalizeTimestamp
} from '../utils/helpers.js';
import { ArtistModel } from '../models/ArtistModel.js';
import { AlbumModel, TrackModel, AudioFeatureModel } from '../models/TrackModel.js';
import { PlaylistModel } from '../models/PlaylistModel.js';

class PlaylistIngestor {
  constructor() {
    this.stats = {
      artists: 0,
      albums: 0,
      tracks: 0,
      playlists: 0,
      playlistTracks: 0,
      audioFeatures: 0,
      startTime: null,
      endTime: null
    };
  }

  async ingest(playlistFile, audioFeaturesFile, batchSize = config.ingest.batchSize) {
    this.stats.startTime = new Date();
    logger.info('Starting ingestion process', {
      playlistFile,
      audioFeaturesFile,
      batchSize
    });

    try {
      await db.connect();
      const playlistData = this.loadJsonFile(playlistFile);
      const audioFeaturesData = audioFeaturesFile ? this.loadJsonFile(audioFeaturesFile) : null;

      await this.processArtists(playlistData, batchSize);
      await this.processAlbums(playlistData, batchSize);
      await this.processTracks(playlistData, batchSize);
      await this.processPlaylists(playlistData, batchSize);
      await this.processPlaylistTracks(playlistData, batchSize);

      if (audioFeaturesData) {
        await this.processAudioFeatures(audioFeaturesData, batchSize);
      }

      this.stats.endTime = new Date();
      this.logFinalStats();

    } catch (error) {
      logger.error('Error during ingestion', { error: error.message });
      throw error;
    } finally {
      await db.close();
    }
  }

  loadJsonFile(filePath) {
    try {
      logger.info(`Loading file: ${filePath}`);
      const data = JSON.parse(readFileSync(filePath, 'utf8'));
      logger.info(`File loaded successfully`, {
        size: JSON.stringify(data).length
      });
      return data;
    } catch (error) {
      logger.error(`Error loading file ${filePath}`, { error: error.message });
      throw error;
    }
  }

  async processArtists(playlistData, batchSize) {
    logger.info('Processing artists...');
    const artistsMap = new Map();

    for (const playlist of playlistData.playlists || [playlistData]) {
      for (const item of playlist.tracks?.items || []) {
        const track = item.track;
        if (track?.artists) {
          for (const artist of track.artists) {
            if (artist.id && !artistsMap.has(artist.id)) {
              artistsMap.set(artist.id, normalizeArtist(artist));
            }
          }
        }

        if (track?.album?.artists) {
          for (const artist of track.album.artists) {
            if (artist.id && !artistsMap.has(artist.id)) {
              artistsMap.set(artist.id, normalizeArtist(artist));
            }
          }
        }
      }
    }

    const artists = Array.from(artistsMap.values());
    logger.info(`Found ${artists.length} unique artists`);

    await processBatches(artists, batchSize, async (batch) => {
      const count = await retryWithBackoff(() => ArtistModel.upsertBatch(batch));
      this.stats.artists += count;
      return count;
    });

    logger.info(`Artist processing completed: ${this.stats.artists}`);
  }

  async processAlbums(playlistData, batchSize) {
    logger.info('Processing albums...');

    const albumsMap = new Map();

    for (const playlist of playlistData.playlists || [playlistData]) {
      for (const item of playlist.tracks?.items || []) {
        const track = item.track;
        if (track?.album?.id && !albumsMap.has(track.album.id)) {
          albumsMap.set(track.album.id, normalizeAlbum(track.album));
        }
      }
    }

    const albums = Array.from(albumsMap.values());
    logger.info(`Found ${albums.length} unique albums`);

    await processBatches(albums, batchSize, async (batch) => {
      const count = await retryWithBackoff(() => AlbumModel.upsertBatch(batch));
      this.stats.albums += count;
      return count;
    });

    logger.info(`Album processing completed: ${this.stats.albums}`);
  }

  async processTracks(playlistData, batchSize) {
    logger.info('Processing tracks...');

    const tracksMap = new Map();

    for (const playlist of playlistData.playlists || [playlistData]) {
      for (const item of playlist.tracks?.items || []) {
        const track = item.track;
        if (track?.id && !tracksMap.has(track.id)) {
          tracksMap.set(track.id, normalizeTrack(track));
        }
      }
    }

    const tracks = Array.from(tracksMap.values());
    logger.info(`Found ${tracks.length} unique tracks`);

    await processBatches(tracks, batchSize, async (batch) => {
      const count = await retryWithBackoff(() => TrackModel.upsertBatch(batch));
      this.stats.tracks += count;
      return count;
    });

    logger.info(`Track processing completed: ${this.stats.tracks}`);
  }

  async processPlaylists(playlistData, batchSize) {
    logger.info('Processing playlists...');

    const playlists = [];

    for (const playlist of playlistData.playlists || [playlistData]) {
      if (playlist.id) {
        playlists.push(normalizePlaylist(playlist));
      }
    }

    logger.info(`Found ${playlists.length} unique playlists`);

    await processBatches(playlists, batchSize, async (batch) => {
      const count = await retryWithBackoff(() => PlaylistModel.upsertBatch(batch));
      this.stats.playlists += count;
      return count;
    });

    logger.info(`Playlist processing completed: ${this.stats.playlists}`);
  }

  async processPlaylistTracks(playlistData, batchSize) {
    logger.info('Processing playlist-track relationships...');

    const playlistTracks = [];

    for (const playlist of playlistData.playlists || [playlistData]) {
      if (playlist.id && playlist.tracks?.items) {
        for (let i = 0; i < playlist.tracks.items.length; i++) {
          const item = playlist.tracks.items[i];
          if (item.track?.id) {
            playlistTracks.push({
              playlist_id: playlist.id,
              track_id: item.track.id,
              position: i,
              added_at: normalizeTimestamp(item.added_at),
              added_by: item.added_by?.id || null
            });
          }
        }
      }
    }

    logger.info(`Found ${playlistTracks.length} unique playlist-track relationships`);

    await processBatches(playlistTracks, batchSize, async (batch) => {
      const count = await retryWithBackoff(() => PlaylistModel.addTracksBatch(batch));
      this.stats.playlistTracks += count;
      return count;
    });

    logger.info(`Playlist-track processing completed: ${this.stats.playlistTracks}`);
  }

  async processAudioFeatures(audioFeaturesData, batchSize) {
    logger.info('Processing audio features...');

    const audioFeatures = [];

    for (const features of audioFeaturesData.audio_features || audioFeaturesData) {
      if (features?.id) {
        try {
          audioFeatures.push(normalizeAudioFeatures(features));
        } catch (error) {
          logger.warn(`Error normalizing audio features for track ${features.id}`, {
            error: error.message
          });
        }
      }
    }

    logger.info(`Found ${audioFeatures.length} unique audio features`);

    await processBatches(audioFeatures, batchSize, async (batch) => {
      const count = await retryWithBackoff(() => AudioFeatureModel.upsertBatch(batch));
      this.stats.audioFeatures += count;
      return count;
    });

    logger.info(`Processing of audio features completed: ${this.stats.audioFeatures}`);
  }

  logFinalStats() {
    const duration = this.stats.endTime - this.stats.startTime;
    const durationSec = Math.round(duration / 1000);

    logger.info('Ingestion completed successfully!', {
      duration: `${durationSec}s`,
      stats: {
        artists: this.stats.artists,
        albums: this.stats.albums,
        tracks: this.stats.tracks,
        playlists: this.stats.playlists,
        playlistTracks: this.stats.playlistTracks,
        audioFeatures: this.stats.audioFeatures
      }
    });
  }
}

const argv = yargs(hideBin(process.argv))
  .option('from', {
    alias: 'f',
    type: 'string',
    description: 'Path to the playlist JSON file',
    demandOption: true
  })
  .option('features', {
    type: 'string',
    description: 'Path to the audio features JSON file'
  })
  .option('batch-size', {
    alias: 'b',
    type: 'number',
    description: 'Batch size for processing',
    default: config.ingest.batchSize
  })
  .help()
  .argv;

const ingestor = new PlaylistIngestor();

ingestor.ingest(argv.from, argv.features, argv.batchSize)
  .then(() => {
    logger.info('Ingestion process finished');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Ingestion failed', { error: error.message });
    process.exit(1);
  });
