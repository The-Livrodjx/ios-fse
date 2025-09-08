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
HAVING total_tracks >= 5
ORDER BY avg_energy DESC
LIMIT 20;

WITH daily_artist_stats AS (
    SELECT 
        toDate(added_at) as date,
        artist_id,
        uniqExact(track_id) as unique_tracks_added,
        avg(popularity) as avg_popularity,
        count() as total_additions
    FROM playlist_track_events
    WHERE action = 'add'
      AND added_at >= now() - INTERVAL 7 DAY
    GROUP BY date, artist_id
),
ranked_artists AS (
    SELECT 
        date,
        artist_id,
        unique_tracks_added,
        avg_popularity,
        total_additions,
        row_number() OVER (
            PARTITION BY date 
            ORDER BY unique_tracks_added DESC, avg_popularity DESC
        ) as daily_rank
    FROM daily_artist_stats
)
SELECT 
    date,
    artist_id,
    unique_tracks_added,
    round(avg_popularity, 2) as avg_popularity,
    total_additions,
    daily_rank
FROM ranked_artists
WHERE daily_rank <= 5
ORDER BY date DESC, daily_rank ASC;

WITH energy_trends AS (
    SELECT 
        toDate(added_at) as date,
        avg(energy) as daily_avg_energy,
        count() as daily_additions,
        uniqExact(playlist_id) as active_playlists
    FROM playlist_track_events
    WHERE action = 'add'
      AND energy > 0
      AND added_at >= now() - INTERVAL 30 DAY
    GROUP BY date
    ORDER BY date
)
SELECT 
    date,
    daily_avg_energy,
    daily_additions,
    active_playlists,
    avg(daily_avg_energy) OVER (
        ORDER BY date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as energy_7day_moving_avg,
    daily_avg_energy - lag(daily_avg_energy, 1) OVER (ORDER BY date) as energy_day_change
FROM energy_trends
ORDER BY date DESC;

SELECT 
    date,
    artist_id,
    uniqMerge(unique_tracks_added) as unique_tracks,
    total_additions,
    avgMerge(avg_popularity) as avg_popularity,
    avgMerge(avg_energy) as avg_energy
FROM artist_daily_stats
WHERE date >= today() - 7
ORDER BY date DESC, unique_tracks DESC
LIMIT 50;
