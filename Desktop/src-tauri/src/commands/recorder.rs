use tauri::command;
use log::info;
use std::net::{TcpListener, Ipv4Addr};
use serde::{Deserialize, Serialize};

// ============================================================================
// Recorder Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecorderLog {
    pub time: String,
    pub level: String,
    pub msg: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecorderPage {
    pub id: String,
    pub name: String,
    pub active: bool,
    pub steps: Vec<RecorderStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecorderStep {
    pub id: String,
    #[serde(rename = "type")]
    pub step_type: String,
    pub desc: String,
    pub target: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecorderScenario {
    pub id: String,
    pub name: String,
    pub pages: Vec<RecorderPage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecorderAction {
    pub action: String,
    pub payload: Option<serde_json::Value>,
}

// ============================================================================
// Recorder State Management
// ============================================================================

use once_cell::sync::Lazy;
use std::sync::{Arc, Mutex};

struct RecorderState {
    logs: Vec<RecorderLog>,
    scenarios: Vec<RecorderScenario>,
}

static RECORDER_STATE: Lazy<Arc<Mutex<RecorderState>>> =
    Lazy::new(|| Arc::new(Mutex::new(RecorderState {
        logs: vec![],
        scenarios: vec![],
    })));

// ============================================================================
// Recorder Commands
// ============================================================================

#[command]
pub async fn get_recorder_logs() -> Result<Vec<RecorderLog>, String> {
    info!("Fetching recorder logs");

    let state = RECORDER_STATE.lock().unwrap();
    Ok(state.logs.clone())
}

#[command]
pub async fn get_recorder_scenarios() -> Result<Vec<RecorderScenario>, String> {
    info!("Fetching recorder scenarios");

    let state = RECORDER_STATE.lock().unwrap();
    Ok(state.scenarios.clone())
}

#[command]
pub async fn recorder_action(action: RecorderAction) -> Result<serde_json::Value, String> {
    info!("Received recorder action: {}", action.action);

    // Add a log entry for this action
    let mut state = RECORDER_STATE.lock().unwrap();
    let log = RecorderLog {
        time: chrono::Utc::now().format("%H:%M:%S").to_string(),
        level: "INFO".to_string(),
        msg: format!("Action '{}' triggered", action.action),
    };
    state.logs.push(log);

    // Return success response
    Ok(serde_json::json!({
        "success": true,
        "action": action.action,
        "payload": action.payload,
    }))
}

#[command]
pub async fn clear_recorder_logs() -> Result<(), String> {
    info!("Clearing recorder logs");

    let mut state = RECORDER_STATE.lock().unwrap();
    state.logs.clear();

    Ok(())
}

#[command]
pub async fn clear_recorder_scenarios() -> Result<(), String> {
    info!("Clearing recorder scenarios");

    let mut state = RECORDER_STATE.lock().unwrap();
    state.scenarios.clear();

    Ok(())
}

#[command]
pub async fn add_recorder_log(level: String, msg: String) -> Result<(), String> {
    let mut state = RECORDER_STATE.lock().unwrap();
    let log = RecorderLog {
        time: chrono::Utc::now().format("%H:%M:%S").to_string(),
        level,
        msg,
    };
    state.logs.push(log);

    // Keep only last 100 logs
    let len = state.logs.len();
    if len > 100 {
        state.logs.drain(0..len - 100);
    }

    Ok(())
}

// ============================================================================
// Port Management
// ============================================================================

#[command]
pub async fn get_available_port() -> Result<u16, String> {
    info!("Finding available port");

    let listener = TcpListener::bind((Ipv4Addr::UNSPECIFIED, 0))
        .map_err(|e| format!("Failed to bind to port: {}", e))?;

    let port = listener.local_addr()
        .map_err(|e| format!("Failed to get local address: {}", e))?
        .port();

    info!("Found available port: {}", port);
    Ok(port)
}
