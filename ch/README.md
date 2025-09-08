# ClickHouse Demo - Step by Step

## How to Demonstrate ClickHouse

### Step 1: Access Interface
1. Open your browser
2. Go to: http://localhost:8123/play
3. On the login screen:
   - Username: `default`
   - Password: (leave blank)
   - Click "Connect"

### Step 2: Create Base Schema
Copy and execute this query:

```sql
CREATE TABLE playlist_track_events
(
    playlist_id String,
    track_id String,
    artist_id String,
    added_at DateTime,
    action Enum8('add' = 1, 'remove' = 2),
    popularity UInt16,
    energy Float32
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(added_at)
ORDER BY (playlist_id, track_id, added_at);
```

### Step 3: Create Materialized View
Copy and execute:

```sql
CREATE TABLE artist_daily_stats
(
    date Date,
    artist_id String,
    unique_tracks_added AggregateFunction(uniq, String),
    total_additions UInt64,
    avg_popularity AggregateFunction(avg, UInt16),
    avg_energy AggregateFunction(avg, Float32)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, artist_id)
SETTINGS index_granularity = 8192;

CREATE MATERIALIZED VIEW mv_artist_daily_aggr TO artist_daily_stats
AS SELECT
    toDate(added_at) as date,
    artist_id,
    uniqState(track_id) as unique_tracks_added,
    count() as total_additions,
    avgState(popularity) as avg_popularity,
    avgState(energy) as avg_energy
FROM playlist_track_events
WHERE action = 'add'
GROUP BY date, artist_id;
```

### Step 4: Insert Test Data
```sql
INSERT INTO playlist_track_events VALUES
('playlist1', 'track1', 'artist1', '2024-01-01 10:00:00', 'add', 85, 0.8),
('playlist1', 'track2', 'artist2', '2024-01-01 11:00:00', 'add', 92, 0.7),
('playlist2', 'track1', 'artist1', '2024-01-02 12:00:00', 'add', 85, 0.8),
('playlist2', 'track3', 'artist3', '2024-01-02 13:00:00', 'add', 78, 0.9);
```

### Step 5: Demonstrate Analytical Queries

#### Query A - Top Artists (30 days):
```sql
SELECT 
    artist_id,
    uniqExact(track_id) as unique_tracks_added,
    avg(popularity) as avg_popularity,
    count() as total_additions
FROM playlist_track_events
WHERE action = 'add'
  AND added_at >= now() - INTERVAL 30 DAY
GROUP BY artist_id
ORDER BY unique_tracks_added DESC, avg_popularity DESC
LIMIT 10;
```

#### Query B - Energy Distribution:
```sql
SELECT 
    playlist_id,
    count() as total_tracks,
    quantiles(0.25, 0.5, 0.9)(energy) as energy_quartiles,
    avg(energy) as avg_energy,
    topK(5)(artist_id) as top_artists_by_frequency
FROM playlist_track_events
WHERE action = 'add'
  AND energy > 0
GROUP BY playlist_id
HAVING total_tracks >= 1
ORDER BY avg_energy DESC
LIMIT 20;
```

#### Query C - Window Functions:
```sql
WITH daily_artist_stats AS (
    SELECT 
        toDate(added_at) as date,
        artist_id,
        uniqExact(track_id) as unique_tracks_added,
        avg(popularity) as avg_popularity
    FROM playlist_track_events
    WHERE action = 'add'
    GROUP BY date, artist_id
)
SELECT 
    date,
    artist_id,
    unique_tracks_added,
    avg_popularity,
    row_number() OVER (
        PARTITION BY date 
        ORDER BY unique_tracks_added DESC, avg_popularity DESC
    ) as daily_rank
FROM daily_artist_stats
WHERE daily_rank <= 5
ORDER BY date DESC, daily_rank;
```
