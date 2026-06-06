// Cadence — Library scanning and management commands
// Handles file system scanning, metadata extraction, and song CRUD operations

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{command, Emitter, Manager};
use walkdir::WalkDir;

// Lofty traits needed for tag/file operations
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::prelude::Accessor;
use lofty::tag::{Tag, TagExt};

/// Supported audio file extensions (matched case-insensitively)
const SUPPORTED_EXTENSIONS: &[&str] = &["mp3", "flac", "wav", "ogg", "aac", "m4a"];

fn sanitize_path(path: &str) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("Path cannot be empty".to_string());
    }
    if path.contains("..") {
        return Err("Invalid path".to_string());
    }
    Ok(())
}

/// Payload emitted with the "scan-progress" event every 100 found files
#[derive(Debug, Clone, Serialize)]
struct ScanProgress {
    scanned: usize,
    found: usize,
}

/// Represents a song record passed between Rust and TypeScript
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SongRecord {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: String,
    pub genre: String,
    pub year: Option<i32>,
    pub duration: f64,
    pub file_path: String,
    pub file_name: String,
    pub file_size: i64,
    pub format: String,
    pub bitrate: Option<i32>,
    pub sample_rate: Option<i32>,
    pub album_art_path: Option<String>,
    pub play_count: i32,
    pub last_played: Option<String>,
    pub date_added: String,
    pub is_favorite: bool,
}

/// Scan a folder recursively for supported audio files.
/// Returns a list of absolute path strings for every matching file found.
#[command]
pub async fn scan_music_folder(
    folder_path: String,
    app_handle: tauri::AppHandle,
) -> Result<Vec<String>, String> {
    sanitize_path(&folder_path)?;

    // 3. Validate the path exists and is a directory
    let root = PathBuf::from(&folder_path);
    if !root.exists() || !root.is_dir() {
        return Err("Invalid directory path".to_string());
    }

    log::info!("Scanning music folder: {}", folder_path);

    let mut found_paths: Vec<String> = Vec::new();
    let mut scanned: usize = 0;

    // 4. Walk directory recursively
    for entry in WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok()) // 6. Skip permission errors silently
    {
        let path = entry.path();

        // Only process files, not directories
        if !path.is_file() {
            continue;
        }

        scanned += 1;

        // 5. Match supported audio extensions (case-insensitive)
        let is_audio = path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| {
                let lower = ext.to_lowercase();
                SUPPORTED_EXTENSIONS.contains(&lower.as_str())
            })
            .unwrap_or(false);

        if is_audio {
            if let Some(abs_path) = path.to_str() {
                found_paths.push(abs_path.to_string());
            }

            // 7. Emit progress event every 100 found files
            if found_paths.len() % 100 == 0 {
                let _ = app_handle.emit(
                    "scan-progress",
                    ScanProgress {
                        scanned,
                        found: found_paths.len(),
                    },
                );
            }
        }
    }

    // Emit a final progress event so the frontend knows scanning finished
    let _ = app_handle.emit(
        "scan-progress",
        ScanProgress {
            scanned,
            found: found_paths.len(),
        },
    );

    log::info!(
        "Scan complete — scanned {} files, found {} audio files",
        scanned,
        found_paths.len()
    );

    Ok(found_paths)
}

/// Metadata extracted from a single audio file, returned to the frontend
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SongMetadata {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: String,
    pub genre: String,
    pub year: Option<u32>,
    pub duration: f64,
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub format: String,
    pub bitrate: Option<u32>,
    pub sample_rate: Option<u32>,
    pub has_album_art: bool,
    pub date_added: String,
}

/// Read metadata tags from a single audio file and return a SongMetadata struct.
/// Does NOT extract album art bytes — only checks for existence.
#[command]
pub async fn read_song_metadata(
    file_path: String,
) -> Result<SongMetadata, String> {
    sanitize_path(&file_path)?;

    // 2. Convert to PathBuf and verify the file exists
    let path = PathBuf::from(&file_path);
    if !path.exists() || !path.is_file() {
        return Err("File does not exist".to_string());
    }

    // 3. Read tags with lofty
    let tagged_file = lofty::read_from_path(&path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;

    // Extract the primary tag (ID3v2, Vorbis, etc.) or fall back to any tag
    let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());

    // 4. Extract tag fields — default to empty string for missing values
    let title = tag
        .and_then(|t| t.title().map(|s| s.to_string()))
        .unwrap_or_default();
    let artist = tag
        .and_then(|t| t.artist().map(|s| s.to_string()))
        .unwrap_or_default();
    let album = tag
        .and_then(|t| t.album().map(|s| s.to_string()))
        .unwrap_or_default();
    let genre = tag
        .and_then(|t| t.genre().map(|s| s.to_string()))
        .unwrap_or_default();
    let year = tag.and_then(|t| t.year());
    let album_artist = tag
        .and_then(|t| {

            t.get_string(&lofty::prelude::ItemKey::AlbumArtist)
                .map(|s| s.to_string())
        })
        .unwrap_or_default();

    // 7. file_name from path
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let mut final_title = title.clone();
    let mut final_artist = artist.clone();

    // 4b. Smart Filename Parsing if title is empty
    if final_title.is_empty() {
        let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or(&file_name);
        
        if let Some(pos) = stem.find(" - ") {
            let possible_artist = stem[..pos].trim().to_string();
            let mut possible_title = stem[pos + 3..].trim().to_string();
            
            // Clean up suffixes like "(Official Video)"
            if let Some(paren_pos) = possible_title.find(" (") {
                possible_title = possible_title[..paren_pos].trim().to_string();
            }
            if let Some(bracket_pos) = possible_title.find(" [") {
                possible_title = possible_title[..bracket_pos].trim().to_string();
            }
            
            final_artist = possible_artist;
            final_title = possible_title;
        } else {
            final_title = stem.to_string();
        }
    }

    // 11. Check for album art existence (do NOT extract bytes)
    let has_album_art = tag
        .map(|t| {

            t.picture_count() > 0
        })
        .unwrap_or(false);

    // 6. Duration from file properties (seconds as f64)
    let properties = tagged_file.properties();
    let duration = properties.duration().as_secs_f64();

    // Bitrate and sample rate from properties
    let bitrate = properties.audio_bitrate().map(|b| b as u32);
    let sample_rate = properties.sample_rate();

    // 8. file_size via std::fs::metadata
    let file_size = std::fs::metadata(&path)
        .map(|m| m.len())
        .unwrap_or(0);

    // 9. format from extension, lowercase
    let format = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    // 10. Generate a UUID v4
    let id = uuid::Uuid::new_v4().to_string();

    // 12. date_added as ISO 8601 timestamp
    let date_added = chrono::Utc::now().to_rfc3339();

    Ok(SongMetadata {
        id,
        title: final_title,
        artist: final_artist,
        album,
        album_artist,
        genre,
        year,
        duration,
        file_path: file_path.clone(),
        file_name,
        file_size,
        format,
        bitrate,
        sample_rate,
        has_album_art,
        date_added,
    })
}

/// Extract album art from an audio file and save it as a cached .jpg file.
/// Returns the absolute path to the cached image, or None if no art is embedded.
#[command]
pub async fn extract_album_art(
    file_path: String,
    app_handle: tauri::AppHandle,
) -> Result<Option<String>, String> {
    sanitize_path(&file_path)?;

    // 2. Verify the file exists on disk
    let path = PathBuf::from(&file_path);
    if !path.exists() || !path.is_file() {
        return Err("File does not exist".to_string());
    }

    // 7. Generate a sanitized cache filename from the audio file's stem
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown");
    let sanitized: String = stem
        .chars()
        .map(|c| if c == ' ' { '_' } else { c })
        .filter(|c| c.is_alphanumeric() || *c == '_')
        .collect();
    let cache_filename = format!("{}.jpg", sanitized);

    // 5. Get app cache directory and build album_art subdirectory path
    let cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|_| "Failed to create cache directory".to_string())?;
    let art_dir = cache_dir.join("album_art");

    // 6. Create the album_art directory if it does not exist
    if !art_dir.exists() {
        std::fs::create_dir_all(&art_dir)
            .map_err(|_| "Failed to create cache directory".to_string())?;
    }

    let art_path = art_dir.join(&cache_filename);

    // 8. Cache hit — if the file already exists, return immediately
    if art_path.exists() {
        return Ok(art_path.to_str().map(|s| s.to_string()));
    }

    // 3. Read the file with lofty and look for the first embedded picture
    let tagged_file = match lofty::read_from_path(&path) {
        Ok(f) => f,
        Err(_) => return Ok(None), // Treat lofty errors as "no art found"
    };

    let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());

    let picture = match tag {
        Some(t) => {

            if t.picture_count() == 0 {
                return Ok(None); // 4. No picture found
            }
            t.pictures().first().cloned()
        }
        None => return Ok(None), // No tag at all
    };

    let pic = match picture {
        Some(p) => p,
        None => return Ok(None),
    };

    // 9. Write the picture bytes to the cached .jpg file
    std::fs::write(&art_path, pic.data())
        .map_err(|_| "Failed to write album art".to_string())?;

    // 10. Return the absolute path to the cached image
    Ok(art_path.to_str().map(|s| s.to_string()))
}

/// Retrieve all songs from the local database
#[command]
pub async fn get_all_songs() -> Result<Vec<SongRecord>, String> {
    // TODO: Query SQLite database for all songs
    Ok(Vec::new())
}

/// Add a single song record to the database
#[command]
pub async fn add_song(song: SongRecord) -> Result<(), String> {
    // TODO: Insert song record into SQLite
    log::info!("Adding song: {}", song.title);
    Ok(())
}

/// Remove a song from the database by ID
#[command]
pub async fn remove_song(song_id: String) -> Result<(), String> {
    // TODO: Delete song record from SQLite
    log::info!("Removing song: {}", song_id);
    Ok(())
}

#[tauri::command]
pub async fn delete_song_from_disk(
    song_id: String,
    file_path: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    use std::fs;
    use std::path::Path;
    use tauri::Emitter;

    crate::commands::library::sanitize_path(&file_path)?;

    let path = Path::new(&file_path);
    
    // 1. Delete from OS Disk
    if path.exists() {
        if let Err(e) = fs::remove_file(path) {
            log::warn!("Native disk deletion failed, but proceeding to database wipe: {}", e);
        }
    } else {
        log::warn!("File not found on disk, but proceeding to wipe from database.");
    }

    // 2. Wipe completely from the database
    let conn = crate::commands::library::get_db_connection(&app_handle)?;
    
    let _ = conn.execute("DELETE FROM songs WHERE id = ?1", rusqlite::params![song_id]);
    let _ = conn.execute("DELETE FROM song_cache WHERE song_id = ?1", rusqlite::params![song_id]);
    let _ = conn.execute("DELETE FROM listening_stats WHERE song_id = ?1", rusqlite::params![song_id]);
    let _ = conn.execute("DELETE FROM playlist_songs WHERE song_id = ?1", rusqlite::params![song_id]);

    // 3. Notify frontend
    let _ = app_handle.emit("library-updated", ());

    Ok(())
}

/// Increment the play count for a song
#[command]
pub async fn update_play_count(song_id: String) -> Result<(), String> {
    // TODO: Update play_count and last_played in SQLite
    log::info!("Updating play count for: {}", song_id);
    Ok(())
}

/// Toggle the favorite status for a song
#[command]
pub async fn toggle_favorite(song_id: String) -> Result<bool, String> {
    // TODO: Toggle is_favorite in SQLite and return new state
    log::info!("Toggling favorite for: {}", song_id);
    Ok(false)
}

/// Result returned to frontend after querying LRCLIB for lyrics
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct LyricsResult {
    pub found: bool,
    pub synced: bool,
    pub plain_lyrics: Option<String>,
    pub synced_lyrics: Option<String>,
    pub source: String,
}

/// Fetch lyrics from LRCLIB for the given track.
/// Uses a multi-strategy approach: /get first, then /search with fallbacks.
#[command]
pub async fn fetch_lyrics(
    title: String,
    artist: String,
    album: String,
    duration: f64,
) -> Result<LyricsResult, String> {
    let not_found = || LyricsResult {
        found: false,
        synced: false,
        plain_lyrics: None,
        synced_lyrics: None,
        source: String::new(),
    };

    // Bail out early if title is empty
    if title.trim().is_empty() {
        return Ok(not_found());
    }

    // Light cleaning — only remove known junk, keep the rest intact
    let clean_title = clean_query(&title);
    let clean_artist = clean_query(&artist);
    let clean_album = clean_query(&album);

    if clean_title.is_empty() {
        return Ok(not_found());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let ua = "Cadence/1.0.0 (https://cadence.app)";

    // ── Strategy 1: Try /api/get with full parameters ──
    // This is the most accurate but requires exact duration match
    if !clean_artist.is_empty() && duration > 0.0 {
        let url = format!(
            "https://lrclib.net/api/get?track_name={}&artist_name={}&album_name={}&duration={}",
            urlencoding::encode(&clean_title),
            urlencoding::encode(&clean_artist),
            urlencoding::encode(&clean_album),
            duration as u64,
        );
        if let Some(result) = try_get_endpoint(&client, &url, ua).await {
            return Ok(result);
        }

        // Try again without album (album metadata is often wrong/missing)
        let url_no_album = format!(
            "https://lrclib.net/api/get?track_name={}&artist_name={}&duration={}",
            urlencoding::encode(&clean_title),
            urlencoding::encode(&clean_artist),
            duration as u64,
        );
        if let Some(result) = try_get_endpoint(&client, &url_no_album, ua).await {
            return Ok(result);
        }

        // Try with duration ±1 second (common rounding issue)
        for delta in [1i64, -1i64, 2, -2] {
            let adjusted = (duration as i64) + delta;
            if adjusted > 0 {
                let url_adj = format!(
                    "https://lrclib.net/api/get?track_name={}&artist_name={}&duration={}",
                    urlencoding::encode(&clean_title),
                    urlencoding::encode(&clean_artist),
                    adjusted,
                );
                if let Some(result) = try_get_endpoint(&client, &url_adj, ua).await {
                    return Ok(result);
                }
            }
        }
    }

    // ── Strategy 2: Search with title + artist ──
    if !clean_artist.is_empty() {
        let search_url = format!(
            "https://lrclib.net/api/search?track_name={}&artist_name={}",
            urlencoding::encode(&clean_title),
            urlencoding::encode(&clean_artist),
        );
        if let Some(result) = try_search_endpoint(&client, &search_url, ua, &clean_title, &clean_artist, duration).await {
            return Ok(result);
        }

        // Try free-text search with both
        let q_url = format!(
            "https://lrclib.net/api/search?q={}",
            urlencoding::encode(&format!("{} {}", clean_title, clean_artist)),
        );
        if let Some(result) = try_search_endpoint(&client, &q_url, ua, &clean_title, &clean_artist, duration).await {
            return Ok(result);
        }
    }

    // ── Strategy 3: Search with title only ──
    let title_url = format!(
        "https://lrclib.net/api/search?q={}",
        urlencoding::encode(&clean_title),
    );
    if let Some(result) = try_search_endpoint(&client, &title_url, ua, &clean_title, &clean_artist, duration).await {
        return Ok(result);
    }

    // Nothing worked
    Ok(not_found())
}

/// Try the /api/get endpoint. Returns Some(LyricsResult) if lyrics were found.
async fn try_get_endpoint(
    client: &reqwest::Client,
    url: &str,
    ua: &str,
) -> Option<LyricsResult> {
    let response = client
        .get(url)
        .header("User-Agent", ua)
        .send()
        .await
        .ok()?;

    if response.status() != 200 {
        return None;
    }

    let body: serde_json::Value = response.json().await.ok()?;
    extract_lyrics_from_json(&body)
}

/// Try the /api/search endpoint. Picks the best match from results.
async fn try_search_endpoint(
    client: &reqwest::Client,
    url: &str,
    ua: &str,
    query_title: &str,
    query_artist: &str,
    query_duration: f64,
) -> Option<LyricsResult> {
    let response = client
        .get(url)
        .header("User-Agent", ua)
        .send()
        .await
        .ok()?;

    if response.status() != 200 {
        return None;
    }

    let body: serde_json::Value = response.json().await.ok()?;
    let arr = body.as_array()?;

    if arr.is_empty() {
        return None;
    }

    // Score each result by title similarity, artist similarity, and duration closeness
    let mut best: Option<&serde_json::Value> = None;
    let mut best_score: f64 = -1.0;

    for item in arr.iter() {
        // Skip items that have no lyrics at all
        let has_synced = item["syncedLyrics"].as_str().map_or(false, |s| !s.is_empty());
        let has_plain = item["plainLyrics"].as_str().map_or(false, |s| !s.is_empty());
        if !has_synced && !has_plain {
            continue;
        }

        let mut score: f64 = 0.0;

        // Title similarity (weighted heavily)
        if let Some(t) = item["trackName"].as_str() {
            score += calculate_similarity(query_title, t) * 3.0;
        }

        // Artist similarity
        if let Some(a) = item["artistName"].as_str() {
            if !query_artist.is_empty() {
                score += calculate_similarity(query_artist, a) * 2.0;
            }
        }

        // Duration closeness bonus (max 1.0 point if exact, decays with distance)
        if let Some(d) = item["duration"].as_f64() {
            if query_duration > 0.0 {
                let diff = (d - query_duration).abs();
                if diff < 5.0 {
                    score += 1.0 - (diff / 5.0);
                }
            }
        }

        // Prefer synced lyrics over plain
        if has_synced {
            score += 0.5;
        }

        if score > best_score {
            best_score = score;
            best = Some(item);
        }
    }

    best.and_then(|item| extract_lyrics_from_json(item))
}

/// Extract lyrics fields from a JSON object (either from /get or a search result)
fn extract_lyrics_from_json(body: &serde_json::Value) -> Option<LyricsResult> {
    let synced_lyrics = body["syncedLyrics"]
        .as_str()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());

    let plain_lyrics = body["plainLyrics"]
        .as_str()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());

    if synced_lyrics.is_none() && plain_lyrics.is_none() {
        return None;
    }

    Some(LyricsResult {
        found: true,
        synced: synced_lyrics.is_some(),
        plain_lyrics,
        synced_lyrics,
        source: "lrclib.net".to_string(),
    })
}

fn levenshtein_distance(a: &str, b: &str) -> usize {
    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();
    let len_a = a_chars.len();
    let len_b = b_chars.len();
    if len_a == 0 { return len_b; }
    if len_b == 0 { return len_a; }

    let mut dp = vec![vec![0; len_b + 1]; len_a + 1];
    for i in 0..=len_a { dp[i][0] = i; }
    for j in 0..=len_b { dp[0][j] = j; }

    for i in 1..=len_a {
        for j in 1..=len_b {
            let cost = if a_chars[i - 1].to_ascii_lowercase() == b_chars[j - 1].to_ascii_lowercase() { 0 } else { 1 };
            dp[i][j] = std::cmp::min(
                std::cmp::min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                dp[i - 1][j - 1] + cost,
            );
        }
    }
    dp[len_a][len_b]
}

fn calculate_similarity(query: &str, candidate: &str) -> f64 {
    let dist = levenshtein_distance(query, candidate);
    let max_len = std::cmp::max(query.chars().count(), candidate.chars().count());
    if max_len == 0 { 1.0 } else { 1.0 - (dist as f64 / max_len as f64) }
}

fn clean_query(s: &str) -> String {
    let mut t = s.to_string();
    let lower = t.to_lowercase();
    let junk = ["yt1s.com", "y2mate.is", "y2mate.com", "tubidy.mobi", "yt5s.com"];
    for j in junk.iter() {
        if let Some(pos) = lower.find(j) {
            let end = pos + j.len();
            t = format!("{}{}", &t[..pos], &t[end..]);
        }
    }
    if let Some(pos) = t.find(" - ") {
        if pos == 0 {
            t = t[3..].to_string();
        }
    }
    t = t.replace(".mp3", "").replace(".flac", "").replace(".wav", "").replace(".m4a", "").replace(".aac", "").replace(".ogg", "");
    
    // Remove parenthetical junk
    let mut cleaned = String::new();
    let mut in_parens = false;
    let mut in_brackets = false;
    for c in t.chars() {
        if c == '(' { in_parens = true; }
        else if c == '[' { in_brackets = true; }
        else if c == ')' { in_parens = false; }
        else if c == ']' { in_brackets = false; }
        else if !in_parens && !in_brackets {
            cleaned.push(c);
        }
    }
    cleaned.trim().to_string()
}

/// Fetch cover art online using iTunes Search API, falling back to MusicBrainz
#[command]
pub async fn fetch_online_cover_art(
    title: String,
    artist: String,
    song_id: String,
    app_handle: tauri::AppHandle,
) -> Result<Option<String>, String> {
    if title.trim().is_empty() {
        return Ok(None);
    }
    
    let clean_title = clean_query(&title);
    let clean_artist = clean_query(&artist);

    let cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|_| "Failed to create cache directory".to_string())?;
    let art_dir = cache_dir.join("album_art");
    if !art_dir.exists() {
        let _ = std::fs::create_dir_all(&art_dir);
    }
    let cache_filename = format!("{}_online.jpg", song_id);
    let art_path = art_dir.join(&cache_filename);

    if art_path.exists() {
        return Ok(art_path.to_str().map(|s| s.to_string()));
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Cadence/1.0.0 (https://cadence.app)")
        .build()
        .map_err(|e| e.to_string())?;

    let term = if clean_artist.is_empty() {
        clean_title.clone()
    } else {
        format!("{} {}", clean_artist, clean_title)
    };

    let itunes_url = format!(
        "https://itunes.apple.com/search?term={}&entity=song&limit=5",
        urlencoding::encode(&term)
    );

    let mut art_url = None;

    if let Ok(response) = client.get(&itunes_url).send().await {
        if response.status() == 200 {
            if let Ok(body) = response.json::<serde_json::Value>().await {
                if let Some(results) = body["results"].as_array() {
                    let mut best_match = None;
                    let mut best_score = 0.0;
                    
                    for result in results {
                        let res_title = result["trackName"].as_str().unwrap_or("");
                        let res_artist = result["artistName"].as_str().unwrap_or("");
                        
                        let t_sim = calculate_similarity(&clean_title, res_title);
                        let a_sim = calculate_similarity(&clean_artist, res_artist);
                        let score = if clean_artist.is_empty() { t_sim } else { t_sim * 0.6 + a_sim * 0.4 };
                        
                        if score > best_score {
                            best_score = score;
                            best_match = Some(result);
                        }
                    }
                    
                    if best_score > 0.60 {
                        if let Some(res) = best_match {
                            if let Some(url) = res["artworkUrl100"].as_str() {
                                art_url = Some(url.replace("100x100bb", "600x600bb"));
                            }
                        }
                    }
                }
            }
        }
    }

    if art_url.is_none() {
        let mb_query = if clean_artist.is_empty() {
            format!("recording:{}", clean_title)
        } else {
            format!("recording:{} AND artist:{}", clean_title, clean_artist)
        };
        let mb_url = format!(
            "https://musicbrainz.org/ws/2/recording?query={}&fmt=json",
            urlencoding::encode(&mb_query)
        );
        
        if let Ok(response) = client.get(&mb_url).send().await {
            if response.status() == 200 {
                if let Ok(body) = response.json::<serde_json::Value>().await {
                    if let Some(recordings) = body["recordings"].as_array() {
                        let mut best_match = None;
                        let mut best_score = 0.0;
                        
                        for result in recordings {
                            let res_title = result["title"].as_str().unwrap_or("");
                            let mut res_artist = "";
                            if let Some(credits) = result["artist-credit"].as_array() {
                                if let Some(cred) = credits.first() {
                                    res_artist = cred["name"].as_str().unwrap_or("");
                                }
                            }
                            
                            let t_sim = calculate_similarity(&clean_title, res_title);
                            let a_sim = calculate_similarity(&clean_artist, res_artist);
                            let score = if clean_artist.is_empty() { t_sim } else { t_sim * 0.6 + a_sim * 0.4 };
                            
                            if score > best_score {
                                best_score = score;
                                best_match = Some(result);
                            }
                        }
                        
                        if best_score > 0.60 {
                            if let Some(first) = best_match {
                                if let Some(releases) = first["releases"].as_array() {
                                    if let Some(release) = releases.first() {
                                        if let Some(mbid) = release["id"].as_str() {
                                            art_url = Some(format!("https://coverartarchive.org/release/{}/front-500", mbid));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if let Some(url) = art_url {
        if let Ok(response) = client.get(&url).send().await {
            if response.status() == 200 {
                if let Ok(bytes) = response.bytes().await {
                    let _ = std::fs::write(&art_path, bytes);
                    return Ok(art_path.to_str().map(|s| s.to_string()));
                }
            }
        }
    }

    Ok(None)
}

#[derive(Debug, serde::Serialize)]
pub struct FetchedDetails {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub art_path: Option<String>,
}

/// Fetch complete song details (Cover, Title, Artist, Album) and apply them
#[command]
pub async fn fetch_and_apply_song_details(
    song_id: String,
    query_title: String,
    query_artist: String,
    file_path: String,
    app_handle: tauri::AppHandle,
) -> Result<FetchedDetails, String> {
    sanitize_path(&file_path)?;

    if query_title.trim().is_empty() {
        return Err("Cannot search without a title".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Cadence/1.0.0 (https://cadence.app)")
        .build()
        .map_err(|e| e.to_string())?;

    let mut found_title = query_title.clone();
    let mut found_artist = query_artist.clone();
    let mut found_album = String::new();
    let mut art_url = None;

    let clean_title = clean_query(&query_title);
    let clean_artist = clean_query(&query_artist);

    // 1. Try iTunes Search API
    let term = if clean_artist.is_empty() {
        clean_title.clone()
    } else {
        format!("{} {}", clean_artist, clean_title)
    };
    
    let itunes_url = format!(
        "https://itunes.apple.com/search?term={}&entity=song&limit=5",
        urlencoding::encode(&term)
    );

    if let Ok(response) = client.get(&itunes_url).send().await {
        if response.status() == 200 {
            if let Ok(body) = response.json::<serde_json::Value>().await {
                if let Some(results) = body["results"].as_array() {
                    let mut best_match = None;
                    let mut best_score = 0.0;
                    
                    for result in results {
                        let res_title = result["trackName"].as_str().unwrap_or("");
                        let res_artist = result["artistName"].as_str().unwrap_or("");
                        
                        let t_sim = calculate_similarity(&clean_title, res_title);
                        let a_sim = calculate_similarity(&clean_artist, res_artist);
                        let score = if clean_artist.is_empty() { t_sim } else { t_sim * 0.6 + a_sim * 0.4 };
                        
                        if score > best_score {
                            best_score = score;
                            best_match = Some(result);
                        }
                    }
                    
                    if best_score > 0.60 {
                        if let Some(res) = best_match {
                            if let Some(t) = res["trackName"].as_str() { found_title = t.to_string(); }
                            if let Some(a) = res["artistName"].as_str() { found_artist = a.to_string(); }
                            if let Some(al) = res["collectionName"].as_str() { found_album = al.to_string(); }
                            if let Some(url) = res["artworkUrl100"].as_str() { art_url = Some(url.replace("100x100bb", "600x600bb")); }
                        }
                    }
                }
            }
        }
    }

    // 2. Fallback to MusicBrainz
    if art_url.is_none() {
        let mb_query = if clean_artist.is_empty() {
            format!("recording:{}", clean_title)
        } else {
            format!("recording:{} AND artist:{}", clean_title, clean_artist)
        };
        let mb_url = format!(
            "https://musicbrainz.org/ws/2/recording?query={}&fmt=json",
            urlencoding::encode(&mb_query)
        );
        if let Ok(response) = client.get(&mb_url).send().await {
            if response.status() == 200 {
                if let Ok(body) = response.json::<serde_json::Value>().await {
                    if let Some(recordings) = body["recordings"].as_array() {
                        let mut best_match = None;
                        let mut best_score = 0.0;
                        
                        for result in recordings {
                            let res_title = result["title"].as_str().unwrap_or("");
                            let mut res_artist = "";
                            if let Some(credits) = result["artist-credit"].as_array() {
                                if let Some(cred) = credits.first() {
                                    res_artist = cred["name"].as_str().unwrap_or("");
                                }
                            }
                            
                            let t_sim = calculate_similarity(&clean_title, res_title);
                            let a_sim = calculate_similarity(&clean_artist, res_artist);
                            let score = if clean_artist.is_empty() { t_sim } else { t_sim * 0.6 + a_sim * 0.4 };
                            
                            if score > best_score {
                                best_score = score;
                                best_match = Some(result);
                            }
                        }
                        
                        if best_score > 0.60 {
                            if let Some(first) = best_match {
                                if let Some(t) = first["title"].as_str() { found_title = t.to_string(); }
                                if let Some(credits) = first["artist-credit"].as_array() {
                                    if let Some(cred) = credits.first() {
                                        if let Some(a) = cred["name"].as_str() { found_artist = a.to_string(); }
                                    }
                                }
                                if let Some(releases) = first["releases"].as_array() {
                                    if let Some(release) = releases.first() {
                                        if let Some(al) = release["title"].as_str() { found_album = al.to_string(); }
                                        if let Some(mbid) = release["id"].as_str() { art_url = Some(format!("https://coverartarchive.org/release/{}/front-500", mbid)); }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Download art if found
    let mut final_art_path = None;
    if let Some(url) = art_url {
        let cache_dir = app_handle
            .path()
            .app_cache_dir()
            .map_err(|_| "Failed to create cache directory".to_string())?;
        let art_dir = cache_dir.join("album_art");
        if !art_dir.exists() {
            let _ = std::fs::create_dir_all(&art_dir);
        }
        let cache_filename = format!("{}_online.jpg", song_id);
        let art_path = art_dir.join(&cache_filename);

        if let Ok(response) = client.get(&url).send().await {
            if response.status() == 200 {
                if let Ok(bytes) = response.bytes().await {
                    let _ = std::fs::write(&art_path, bytes);
                    final_art_path = art_path.to_str().map(|s| s.to_string());
                }
            }
        }
    }

    // Save metadata and embedded cover art to physical file
    let path = PathBuf::from(&file_path);
    if path.exists() && path.is_file() {
        if let Ok(mut tagged_file) = lofty::read_from_path(&path) {
            let tag_type = tagged_file.primary_tag_type();
            let mut tag = match tagged_file.primary_tag_mut() {
                Some(t) => t.clone(),
                None => {
                    if let Some(t) = tagged_file.first_tag_mut() {
                        t.clone()
                    } else {
                        Tag::new(tag_type)
                    }
                }
            };

            tag.set_title(found_title.clone());
            tag.set_artist(found_artist.clone());
            tag.set_album(found_album.clone());
            
            // Embed picture into ID3 tags if we downloaded it
            if let Some(ref art_p) = final_art_path {
                if let Ok(bytes) = std::fs::read(art_p) {
                    let mime = if art_p.to_lowercase().ends_with(".png") {
                        lofty::picture::MimeType::Png
                    } else {
                        lofty::picture::MimeType::Jpeg
                    };
                    let pic = lofty::picture::Picture::new_unchecked(
                        lofty::picture::PictureType::CoverFront,
                        Some(mime),
                        None,
                        bytes,
                    );
                    tag.push_picture(pic);
                }
            }

            let _ = tag.save_to_path(&path, lofty::config::WriteOptions::new());
        }
    }

    Ok(FetchedDetails {
        title: found_title,
        artist: found_artist,
        album: found_album,
        art_path: final_art_path,
    })
}

/// Update metadata tags (ID3/Vorbis) on the physical audio file using Lofty
#[command]
pub async fn update_song_metadata(
    file_path: String,
    title: String,
    artist: String,
    album: String,
) -> Result<(), String> {
    sanitize_path(&file_path)?;

    let path = PathBuf::from(&file_path);
    if !path.exists() || !path.is_file() {
        return Err("File does not exist".to_string());
    }

    let mut tagged_file = lofty::read_from_path(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let tag_type = tagged_file.primary_tag_type();

    let mut tag = match tagged_file.primary_tag_mut() {
        Some(t) => t.clone(),
        None => {
            if let Some(t) = tagged_file.first_tag_mut() {
                t.clone()
            } else {
                Tag::new(tag_type)
            }
        }
    };

    tag.set_title(title);
    tag.set_artist(artist);
    tag.set_album(album);

    tag.save_to_path(&path, lofty::config::WriteOptions::new())
        .map_err(|e| format!("Failed to save metadata to physical file: {}", e))?;

    Ok(())
}

#[command]
pub async fn select_and_apply_local_cover_art(
    song_id: String,
    file_path: String,
    app_handle: tauri::AppHandle,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    sanitize_path(&file_path)?;

    let handle_clone = app_handle.clone();
    let selected = tauri::async_runtime::spawn_blocking(move || {
        handle_clone.dialog()
            .file()
            .add_filter("Image", &["jpg", "jpeg", "png"])
            .blocking_pick_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    if let Some(file) = selected {
        let image_path = file.into_path().map_err(|_| "Invalid path".to_string())?;
        
        let cache_dir = app_handle.path().app_cache_dir().map_err(|_| "Failed".to_string())?;
        let art_dir = cache_dir.join("album_art");
        if !art_dir.exists() {
            let _ = std::fs::create_dir_all(&art_dir);
        }
        
        let ext = image_path.extension().and_then(|e| e.to_str()).unwrap_or("jpg");
        let cache_filename = format!("{}_local.{}", song_id, ext);
        let dest_path = art_dir.join(&cache_filename);
        
        std::fs::copy(&image_path, &dest_path).map_err(|e| format!("Failed to copy image: {}", e))?;
        
        let path = PathBuf::from(&file_path);
        if path.exists() && path.is_file() {
            if let Ok(mut tagged_file) = lofty::read_from_path(&path) {
                let tag_type = tagged_file.primary_tag_type();
                let mut tag = match tagged_file.primary_tag_mut() {
                    Some(t) => t.clone(),
                    None => {
                        if let Some(t) = tagged_file.first_tag_mut() { t.clone() } else { Tag::new(tag_type) }
                    }
                };
                
                if let Ok(bytes) = std::fs::read(&dest_path) {
                    let mime = if ext.to_lowercase() == "png" { lofty::picture::MimeType::Png } else { lofty::picture::MimeType::Jpeg };
                    let pic = lofty::picture::Picture::new_unchecked(
                        lofty::picture::PictureType::CoverFront,
                        Some(mime),
                        None,
                        bytes,
                    );
                    tag.push_picture(pic);
                    let _ = tag.save_to_path(&path, lofty::config::WriteOptions::new());
                }
            }
        }
        
        return Ok(dest_path.to_str().map(|s| s.to_string()));
    }
    
    Ok(None)
}

fn get_db_connection(app_handle: &tauri::AppHandle) -> Result<rusqlite::Connection, String> {
    use tauri::Manager;
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("cadence.db");
    rusqlite::Connection::open(&db_path).map_err(|e| format!("Failed to open DB: {}", e))
}

/// Save an array of songs to the SQLite database (INSERT OR REPLACE)
#[tauri::command]
pub async fn save_songs_to_db(
    songs: Vec<serde_json::Value>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_db_connection(&app_handle)?;

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    for song in &songs {
        tx.execute(
            "INSERT OR REPLACE INTO songs (
                id, title, artist, album, album_artist, genre, year, duration,
                file_path, file_name, file_size, format, bitrate, sample_rate,
                album_art_path, play_count, last_played, date_added, is_favorite
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
            rusqlite::params![
                song["id"].as_str().unwrap_or(""),
                song["title"].as_str().unwrap_or(""),
                song["artist"].as_str().unwrap_or(""),
                song["album"].as_str().unwrap_or(""),
                song["albumArtist"].as_str().unwrap_or(""),
                song["genre"].as_str().unwrap_or(""),
                song["year"].as_i64(),
                song["duration"].as_f64().unwrap_or(0.0),
                song["filePath"].as_str().unwrap_or(""),
                song["fileName"].as_str().unwrap_or(""),
                song["fileSize"].as_i64().unwrap_or(0),
                song["format"].as_str().unwrap_or(""),
                song["bitrate"].as_i64(),
                song["sampleRate"].as_i64(),
                song["albumArtPath"].as_str(),
                song["playCount"].as_i64().unwrap_or(0),
                song["lastPlayed"].as_str(),
                song["dateAdded"].as_str().unwrap_or(""),
                if song["isFavorite"].as_bool().unwrap_or(false) { 1 } else { 0 },
            ],
        ).map_err(|e| format!("Failed to insert song: {}", e))?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    log::info!("Saved {} songs to database", songs.len());
    Ok(())
}

/// Load all songs from the SQLite database
#[tauri::command]
pub async fn load_songs_from_db(
    app_handle: tauri::AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    let conn = get_db_connection(&app_handle)?;

    let mut stmt = conn.prepare(
        "SELECT id, title, artist, album, album_artist, genre, year, duration,
                file_path, file_name, file_size, format, bitrate, sample_rate,
                album_art_path, play_count, last_played, date_added, is_favorite
         FROM songs ORDER BY date_added DESC"
    ).map_err(|e| e.to_string())?;

    let songs: Vec<serde_json::Value> = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "title": row.get::<_, String>(1)?,
            "artist": row.get::<_, String>(2)?,
            "album": row.get::<_, String>(3)?,
            "albumArtist": row.get::<_, String>(4)?,
            "genre": row.get::<_, String>(5)?,
            "year": row.get::<_, Option<i64>>(6)?,
            "duration": row.get::<_, f64>(7)?,
            "filePath": row.get::<_, String>(8)?,
            "fileName": row.get::<_, String>(9)?,
            "fileSize": row.get::<_, i64>(10)?,
            "format": row.get::<_, String>(11)?,
            "bitrate": row.get::<_, Option<i64>>(12)?,
            "sampleRate": row.get::<_, Option<i64>>(13)?,
            "albumArtPath": row.get::<_, Option<String>>(14)?,
            "playCount": row.get::<_, i64>(15)?,
            "lastPlayed": row.get::<_, Option<String>>(16)?,
            "dateAdded": row.get::<_, String>(17)?,
            "isFavorite": row.get::<_, i64>(18)? == 1
        }))
    }).map_err(|e| e.to_string())?
    .filter_map(Result::ok)
    .collect();

    use tauri_plugin_fs::FsExt;
    if let Some(scope) = app_handle.try_fs_scope() {
        let mut unique_dirs = std::collections::HashSet::new();
        for song in &songs {
            if let Some(path_str) = song.get("filePath").and_then(|s| s.as_str()) {
                if let Some(parent) = std::path::Path::new(path_str).parent() {
                    unique_dirs.insert(parent.to_path_buf());
                }
            }
        }
        for dir in unique_dirs {
            let _ = scope.allow_directory(&dir, true);
        }
    }

    log::info!("Loaded {} songs from database", songs.len());
    Ok(songs)
}

#[tauri::command]
pub async fn record_listen(
    song_id: String,
    duration_listened: f64,
    completed: bool,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_db_connection(&app_handle)?;
    let id = uuid::Uuid::new_v4().to_string();
    let listened_at = chrono::Utc::now().to_rfc3339();
    let completed_int = if completed { 1 } else { 0 };
    
    conn.execute(
        "INSERT INTO listening_stats (id, song_id, listened_at, duration_listened, completed) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, song_id, listened_at, duration_listened, completed_int],
    ).map_err(|e| e.to_string())?;
    
    let date = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let minutes = duration_listened / 60.0;
    
    conn.execute(
        "INSERT INTO daily_stats (date, total_minutes, songs_played, updated_at) 
         VALUES (?1, ?2, 1, ?3) 
         ON CONFLICT(date) DO UPDATE SET 
         total_minutes = total_minutes + ?2,
         songs_played = songs_played + 1,
         updated_at = ?3",
        rusqlite::params![date, minutes, listened_at],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_listening_stats(
    app_handle: tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    let conn = get_db_connection(&app_handle)?;
    
    let today_date = chrono::Utc::now().format("%Y-%m-%d").to_string();
    
    let today_minutes: f64 = conn.query_row(
        "SELECT total_minutes FROM daily_stats WHERE date = ?1",
        rusqlite::params![today_date],
        |row| row.get(0)
    ).unwrap_or(0.0);
    
    let week_minutes: f64 = conn.query_row(
        "SELECT SUM(total_minutes) FROM daily_stats WHERE date >= date('now', '-7 days')",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);
    
    let total_songs_played: i64 = conn.query_row(
        "SELECT COUNT(*) FROM listening_stats",
        [],
        |row| row.get(0)
    ).unwrap_or(0);
    
    let mut stmt = conn.prepare(
        "SELECT id, title, artist, album_art_path, play_count 
         FROM songs ORDER BY play_count DESC LIMIT 5"
    ).map_err(|e| e.to_string())?;
    
    let top_songs: Vec<serde_json::Value> = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "title": row.get::<_, String>(1)?,
            "artist": row.get::<_, String>(2)?,
            "albumArtPath": row.get::<_, Option<String>>(3)?,
            "playCount": row.get::<_, i64>(4)?
        }))
    }).map(|rows| rows.filter_map(Result::ok).collect()).unwrap_or_default();
    
    let mut stmt = conn.prepare(
        "SELECT s.id, s.title, s.artist, s.album_art_path 
         FROM listening_stats l 
         JOIN songs s ON l.song_id = s.id 
         GROUP BY s.id 
         ORDER BY MAX(l.listened_at) DESC LIMIT 5"
    ).map_err(|e| e.to_string())?;
    
    let recent_songs: Vec<serde_json::Value> = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "title": row.get::<_, String>(1)?,
            "artist": row.get::<_, String>(2)?,
            "albumArtPath": row.get::<_, Option<String>>(3)?
        }))
    }).map(|rows| rows.filter_map(Result::ok).collect()).unwrap_or_default();
    
    let mut stmt = conn.prepare(
        "SELECT date, total_minutes, songs_played 
         FROM daily_stats 
         WHERE date >= date('now', '-6 days') 
         ORDER BY date ASC"
    ).map_err(|e| e.to_string())?;
    
    let daily_breakdown: Vec<serde_json::Value> = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "date": row.get::<_, String>(0)?,
            "minutes": row.get::<_, f64>(1)?,
            "songs_played": row.get::<_, i64>(2)?
        }))
    }).map(|rows| rows.filter_map(Result::ok).collect()).unwrap_or_default();
    
    Ok(serde_json::json!({
        "today_minutes": today_minutes,
        "week_minutes": week_minutes,
        "total_songs_played": total_songs_played,
        "top_songs": top_songs,
        "recent_songs": recent_songs,
        "daily_breakdown": daily_breakdown
    }))
}


#[tauri::command]
pub async fn get_artist_image(
    app_handle: tauri::AppHandle,
    name: String,
) -> Result<Option<String>, String> {
    let conn = get_db_connection(&app_handle)?;
    let mut stmt = conn
        .prepare("SELECT image_url FROM artists WHERE name = ?")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let mut rows = stmt.query([&name]).map_err(|e| format!("Failed to query: {}", e))?;
    
    if let Some(row) = rows.next().map_err(|e| format!("Row error: {}", e))? {
        let url: Option<String> = row.get(0).unwrap_or(None);
        return Ok(url);
    }
    
    Ok(None)
}

#[tauri::command]
pub async fn save_artist_image(
    app_handle: tauri::AppHandle,
    name: String,
    image_url: Option<String>,
) -> Result<(), String> {
    let conn = get_db_connection(&app_handle)?;
    let fetched_at = chrono::Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO artists (name, image_url, fetched_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(name) DO UPDATE SET image_url = excluded.image_url, fetched_at = excluded.fetched_at",
        rusqlite::params![name, image_url, fetched_at],
    )
    .map_err(|e| format!("Failed to save artist image: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn reset_library_db(app_handle: tauri::AppHandle) -> Result<(), String> {
    let conn = get_db_connection(&app_handle)?;
    
    let tables = [
        "songs",
        "playlists",
        "playlist_songs",
        "lyrics",
        "listening_stats",
        "daily_stats",
        "artists"
    ];
    
    for table in tables.iter() {
        // We ignore errors on drop/delete since some tables might not exist 
        let _ = conn.execute(&format!("DELETE FROM {}", table), []);
    }
    
    Ok(())
}

#[tauri::command]
pub async fn clear_artwork_cache(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let art_dir = app_dir.join("artwork");
    
    if art_dir.exists() {
        std::fs::remove_dir_all(&art_dir).map_err(|e| format!("Failed to clear artwork cache: {}", e))?;
    }
    
    Ok(())
}