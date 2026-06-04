use serde::{Deserialize, Serialize};

const LASTFM_API_URL: &str = "https://ws.audioscrobbler.com/2.0/";

#[derive(Debug, Serialize, Deserialize)]
pub struct LastFmAuthResult {
    pub success: bool,
    pub session_key: String,
    pub username: String,
    pub error_message: Option<String>,
}

#[derive(Deserialize)]
struct LastFmTokenResponse {
    token: Option<String>,
    error: Option<i32>,
    message: Option<String>,
}

#[derive(Deserialize)]
struct LastFmSession {
    name: String,
    key: String,
}

#[derive(Deserialize)]
struct LastFmSessionResponse {
    session: Option<LastFmSession>,
    error: Option<i32>,
    message: Option<String>,
}

#[derive(Deserialize)]
struct LastFmScrobbleResponse {
    scrobbles: Option<serde_json::Value>,
    error: Option<i32>,
    message: Option<String>,
}

#[tauri::command]
pub async fn lastfm_get_token(api_key: String) -> Result<String, String> {
    let url = format!(
        "{}?method=auth.getToken&api_key={}&format=json",
        LASTFM_API_URL, api_key
    );

    let client = reqwest::Client::new();
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;

    let json: LastFmTokenResponse = res.json().await.map_err(|e| e.to_string())?;

    if let Some(token) = json.token {
        Ok(token)
    } else {
        Err(json.message.unwrap_or_else(|| "Unknown error".to_string()))
    }
}

#[tauri::command]
pub async fn lastfm_get_session(
    api_key: String,
    api_secret: String,
    token: String,
) -> Result<LastFmAuthResult, String> {
    let sig_string = format!(
        "api_key{}methodauth.getSessiontoken{}{}",
        api_key, token, api_secret
    );
    let api_sig = format!("{:x}", md5::compute(sig_string));

    let url = format!(
        "{}?method=auth.getSession&api_key={}&token={}&api_sig={}&format=json",
        LASTFM_API_URL, api_key, token, api_sig
    );

    let client = reqwest::Client::new();
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    
    let json: LastFmSessionResponse = res.json().await.map_err(|e| e.to_string())?;

    if let Some(session) = json.session {
        Ok(LastFmAuthResult {
            success: true,
            session_key: session.key,
            username: session.name,
            error_message: None,
        })
    } else {
        Ok(LastFmAuthResult {
            success: false,
            session_key: String::new(),
            username: String::new(),
            error_message: Some(json.message.unwrap_or_else(|| "Unknown error".to_string())),
        })
    }
}

fn build_lastfm_signature(params: &[(String, String)], secret: &str) -> String {
    let mut sorted_params = params.to_vec();
    sorted_params.sort_by(|a, b| a.0.cmp(&b.0));

    let mut sig_string = String::new();
    for (k, v) in sorted_params {
        sig_string.push_str(&k);
        sig_string.push_str(&v);
    }
    sig_string.push_str(secret);

    format!("{:x}", md5::compute(sig_string))
}

#[tauri::command]
pub async fn lastfm_scrobble(
    api_key: String,
    api_secret: String,
    session_key: String,
    title: String,
    artist: String,
    album: String,
    duration: f64,
    timestamp: i64,
) -> Result<bool, String> {
    if title.is_empty() || artist.is_empty() {
        return Ok(false);
    }

    let mut params = vec![
        ("api_key".to_string(), api_key.clone()),
        ("method".to_string(), "track.scrobble".to_string()),
        ("sk".to_string(), session_key.clone()),
        ("track".to_string(), title.clone()),
        ("artist".to_string(), artist.clone()),
        ("timestamp".to_string(), timestamp.to_string()),
    ];

    if !album.is_empty() {
        params.push(("album".to_string(), album.clone()));
    }
    
    // Last.fm duration is usually expected as seconds integer, but duration might be float or integer in JS
    let dur_sec = duration.round() as i64;
    if dur_sec > 0 {
        params.push(("duration".to_string(), dur_sec.to_string()));
    }

    let api_sig = build_lastfm_signature(&params, &api_secret);

    let client = reqwest::Client::new();
    // Actually, simple form-urlencoded works well. Let's just add format and api_sig to params.
    // Actually, simple form-urlencoded works well. Let's just add format and api_sig to params.
    let mut final_params = params.clone();
    final_params.push(("api_sig".to_string(), api_sig));
    final_params.push(("format".to_string(), "json".to_string()));

    let res = client.post(LASTFM_API_URL)
        .form(&final_params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: LastFmScrobbleResponse = res.json().await.map_err(|e| e.to_string())?;

    if json.error.is_some() {
        return Err(json.message.unwrap_or_else(|| "Unknown error".to_string()));
    }

    Ok(true)
}

#[tauri::command]
pub async fn lastfm_update_now_playing(
    api_key: String,
    api_secret: String,
    session_key: String,
    title: String,
    artist: String,
    album: String,
    duration: f64,
) -> Result<bool, String> {
    if title.is_empty() || artist.is_empty() {
        return Ok(false);
    }

    let mut params = vec![
        ("api_key".to_string(), api_key.clone()),
        ("method".to_string(), "track.updateNowPlaying".to_string()),
        ("sk".to_string(), session_key.clone()),
        ("track".to_string(), title.clone()),
        ("artist".to_string(), artist.clone()),
    ];

    if !album.is_empty() {
        params.push(("album".to_string(), album.clone()));
    }
    
    let dur_sec = duration.round() as i64;
    if dur_sec > 0 {
        params.push(("duration".to_string(), dur_sec.to_string()));
    }

    let api_sig = build_lastfm_signature(&params, &api_secret);

    let mut final_params = params.clone();
    final_params.push(("api_sig".to_string(), api_sig));
    final_params.push(("format".to_string(), "json".to_string()));

    let client = reqwest::Client::new();
    let res = client.post(LASTFM_API_URL)
        .form(&final_params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: LastFmScrobbleResponse = res.json().await.map_err(|e| e.to_string())?;

    if json.error.is_some() {
        return Err(json.message.unwrap_or_else(|| "Unknown error".to_string()));
    }

    Ok(true)
}
