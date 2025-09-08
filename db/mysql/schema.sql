DROP TABLE IF EXISTS audio_features;
DROP TABLE IF EXISTS playlist_tracks;
DROP TABLE IF EXISTS tracks;
DROP TABLE IF EXISTS albums;
DROP TABLE IF EXISTS artists;
DROP TABLE IF EXISTS playlists;

CREATE TABLE artists (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    popularity INT UNSIGNED DEFAULT 0,
    followers BIGINT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_popularity CHECK (popularity >= 0 AND popularity <= 100),
    CONSTRAINT chk_followers CHECK (followers >= 0),
    
    INDEX idx_artists_name (name),
    INDEX idx_artists_popularity (popularity DESC)
);

CREATE TABLE albums (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    release_date DATE,
    album_type ENUM('album', 'single', 'compilation') NOT NULL DEFAULT 'album',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_albums_name (name),
    INDEX idx_albums_release_date (release_date DESC),
    INDEX idx_albums_type (album_type)
);

CREATE TABLE tracks (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    duration_ms INT UNSIGNED NOT NULL,
    explicit BOOLEAN DEFAULT FALSE,
    popularity INT UNSIGNED DEFAULT 0,
    album_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_duration CHECK (duration_ms > 0),
    CONSTRAINT chk_track_popularity CHECK (popularity >= 0 AND popularity <= 100),
    
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL,
    
    INDEX idx_tracks_name (name),
    INDEX idx_tracks_popularity (popularity DESC),
    INDEX idx_tracks_album (album_id),
    INDEX idx_tracks_duration (duration_ms)
);

CREATE TABLE playlists (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    owner VARCHAR(255),
    snapshot VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_playlists_name (name),
    INDEX idx_playlists_owner (owner)
);

CREATE TABLE playlist_tracks (
    playlist_id VARCHAR(255) NOT NULL,
    track_id VARCHAR(255) NOT NULL,
    added_at TIMESTAMP NOT NULL,
    added_by VARCHAR(255),
    position INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (playlist_id, track_id, position),
    UNIQUE KEY uk_playlist_track (playlist_id, track_id),
    
    CONSTRAINT chk_position CHECK (position >= 0),
    
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
    
    INDEX idx_playlist_tracks_added_at (added_at DESC),
    INDEX idx_playlist_tracks_position (playlist_id, position)
);

CREATE TABLE audio_features (
    track_id VARCHAR(255) PRIMARY KEY,
    danceability DECIMAL(4,3) CHECK (danceability >= 0 AND danceability <= 1),
    energy DECIMAL(4,3) CHECK (energy >= 0 AND energy <= 1),
    tempo DECIMAL(6,3) CHECK (tempo > 0),
    key_signature TINYINT CHECK (key_signature >= -1 AND key_signature <= 11),
    mode TINYINT CHECK (mode IN (0, 1)),
    valence DECIMAL(4,3) CHECK (valence >= 0 AND valence <= 1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
    
    INDEX idx_audio_features_energy (energy DESC),
    INDEX idx_audio_features_danceability (danceability DESC),
    INDEX idx_audio_features_valence (valence DESC),
    INDEX idx_audio_features_tempo (tempo)
);
