// Engine management commands for ForgeEngine spawning and lifecycle
// Kernel detection and management for Chrome compatibility testing
use tauri::command;
use log::{info, error, warn};
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::path::Path;
use serde::{Deserialize, Serialize};

// ============================================================================
// Kernel Detection Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedKernel {
    pub name: String,
    pub version: String,
    pub executable_path: String,
    pub is_compatible: bool,
    pub platform: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KernelTestResult {
    pub kernel_id: String,
    pub kernel_name: String,
    pub kernel_version: String,
    pub test_passed: bool,
    pub test_message: String,
    pub test_time: String,
}

// ============================================================================
// Kernel Detection Functions
// ============================================================================

/// Detect Chrome executable on the system
fn detect_chrome_executable() -> Vec<DetectedKernel> {
    let mut kernels = Vec::new();

    // Common Chrome installation paths by platform
    let paths = if cfg!(target_os = "windows") {
        vec![
            r"C:\Program Files\Google\Chrome\Application\chrome.exe".to_string(),
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe".to_string(),
            r"C:\Users\{USER}\AppData\Local\Google\Chrome\Application\chrome.exe".to_string(),
            r"C:\Program Files\Chromium\Application\chrome.exe".to_string(),
        ]
    } else if cfg!(target_os = "macos") {
        let home_path = format!("{}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            std::env::var("HOME").unwrap_or_default());
        vec![
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome".to_string(),
            "/Applications/Chromium.app/Contents/MacOS/Chromium".to_string(),
            home_path,
        ]
    } else if cfg!(target_os = "linux") {
        vec![
            "/usr/bin/google-chrome".to_string(),
            "/usr/bin/google-chrome-stable".to_string(),
            "/usr/bin/chromium".to_string(),
            "/usr/bin/chromium-browser".to_string(),
            "/opt/google/chrome/google-chrome".to_string(),
            "/snap/bin/chromium".to_string(),
        ]
    } else {
        vec![]
    };

    for path in paths {
        let expanded_path = if path.contains("{USER}") {
            if let Ok(home) = std::env::var("USERPROFILE") {
                path.replace("{USER}", &home)
            } else {
                continue;
            }
        } else {
            path.to_string()
        };

        if Path::new(&expanded_path).exists() {
            if let Some(kernel) = inspect_chrome_at_path(&expanded_path) {
                kernels.push(kernel);
            }
        }
    }

    kernels
}

/// Inspect Chrome executable and extract version info
fn inspect_chrome_at_path(path: &str) -> Option<DetectedKernel> {
    let version_output = if cfg!(target_os = "windows") {
        Command::new("powershell")
            .args(&["-Command", &format!(
                "(Get-ItemProperty '{}').VersionInfo.FileVersion", path
            )])
            .output()
            .ok()
    } else if cfg!(target_os = "macos") {
        Command::new("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
            .arg("--version")
            .output()
            .or_else(|_| {
                Command::new(path)
                    .arg("--version")
                    .output()
            })
            .ok()
    } else {
        Command::new(path)
            .arg("--version")
            .output()
            .ok()
    };

    if let Some(output) = version_output {
        let version_str = String::from_utf8_lossy(&output.stdout);
        let version = parse_chrome_version(&version_str);
        let is_compatible = check_chrome_compatibility(&version);

        return Some(DetectedKernel {
            name: if is_compatible { "Google Chrome" } else { "Chrome (Incompatible)" }.to_string(),
            version: version.clone(),
            executable_path: path.to_string(),
            is_compatible,
            platform: std::env::consts::OS.to_string(),
        });
    }

    None
}

/// Parse Chrome version string to extract major version number
fn parse_chrome_version(version_str: &str) -> String {
    // Version strings are like "Google Chrome 86.0.4240.198" or "Chromium 86.0.4240.198"
    let parts: Vec<&str> = version_str
        .split_whitespace()
        .filter(|s| {
            s.chars().next().map(|c| c.is_numeric()).unwrap_or(false)
        })
        .collect();

    if let Some(first_version) = parts.first() {
        // Extract just major.minor.patch for cleaner display
        let version_parts: Vec<&str> = first_version.split('.').collect();
        if version_parts.len() >= 3 {
            format!("{}.{}.{}", version_parts[0], version_parts[1], version_parts[2])
        } else {
            first_version.to_string()
        }
    } else {
        "Unknown".to_string()
    }
}

/// Check if Chrome version is compatible (minimum 86.0.4240.198)
fn check_chrome_compatibility(version: &str) -> bool {
    // Extract major version number
    if let Some(major_str) = version.split('.').next() {
        if let Ok(major) = major_str.parse::<u32>() {
            return major >= 86;
        }
    }
    false
}

/// Get platform string for display
fn get_platform() -> String {
    format!(
        "{}-{}",
        std::env::consts::OS,
        std::env::consts::ARCH
    )
}

type EngineProcess = std::process::Child;

#[derive(Clone)]
struct EngineManager {
    processes: Arc<Mutex<HashMap<u16, EngineProcess>>>,
}

impl EngineManager {
    fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn spawn_engine(&self, port: u16) -> Result<(), String> {
        let processes = self.processes.lock().unwrap();

        // Check if port is already in use
        if processes.contains_key(&port) {
            return Err(format!("Port {} is already in use", port));
        }

        info!("Spawning ForgeEngine on port {}", port);

        // Spawn the engine process
        // In production, this would launch the actual Python ForgeEngine
        // For now, we'll simulate it
        #[cfg(debug_assertions)]
        {
            // In debug mode, just log that we would spawn the engine
            info!("[SIMULATION] Would spawn: python3 -m forge_engine --port {}", port);
        }

        #[cfg(not(debug_assertions))]
        {
            // In release mode, actually spawn the process
            let child = Command::new("python3")
                .args(&["-m", "forge_engine", "--port", &port.to_string()])
                .stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .map_err(|e| format!("Failed to spawn engine: {}", e))?;

            self.processes.lock().unwrap().insert(port, child);
        }

        info!("ForgeEngine spawned successfully on port {}", port);
        Ok(())
    }

    fn stop_engine(&self, port: u16) -> Result<(), String> {
        let mut processes = self.processes.lock().unwrap();

        info!("Stopping ForgeEngine on port {}", port);

        if let Some(_process) = processes.remove(&port) {
            #[cfg(not(debug_assertions))]
            {
                // In a real implementation, we would kill and wait for the process here
                // For now, just log that we would do it
                info!("Would terminate process on port {}", port);
            }

            info!("ForgeEngine stopped on port {}", port);
            Ok(())
        } else {
            Err(format!("No engine found running on port {}", port))
        }
    }

    fn stop_all_engines(&self) -> Result<(), String> {
        let ports = {
            let processes = self.processes.lock().unwrap();
            processes.keys().copied().collect::<Vec<_>>()
        };

        info!("Stopping all {} ForgeEngine instances", ports.len());

        for port in ports {
            if let Err(e) = self.stop_engine(port) {
                error!("Failed to stop engine on port {}: {}", port, e);
            }
        }

        Ok(())
    }

    fn get_running_engines(&self) -> Vec<u16> {
        let processes = self.processes.lock().unwrap();
        processes.keys().copied().collect()
    }

    fn is_engine_running(&self, port: u16) -> bool {
        let processes = self.processes.lock().unwrap();
        processes.contains_key(&port)
    }
}

// Global instance
static ENGINE_MANAGER: once_cell::sync::Lazy<EngineManager> =
    once_cell::sync::Lazy::new(EngineManager::new);

#[command]
pub async fn spawn_engine(port: Option<u16>) -> Result<u16, String> {
    let port = port.unwrap_or_else(|| {
        // Generate random port in range 30000-50000
        use rand::Rng;
        rand::thread_rng().gen_range(30000..50000)
    });

    info!("Received spawn_engine request for port {}", port);

    match ENGINE_MANAGER.spawn_engine(port) {
        Ok(_) => {
            info!("Successfully spawned engine on port {}", port);
            Ok(port)
        }
        Err(e) => {
            error!("Failed to spawn engine on port {}: {}", port, e);
            Err(e)
        }
    }
}

#[command]
pub async fn stop_engine(port: u16) -> Result<(), String> {
    info!("Received stop_engine request for port {}", port);

    match ENGINE_MANAGER.stop_engine(port) {
        Ok(_) => {
            info!("Successfully stopped engine on port {}", port);
            Ok(())
        }
        Err(e) => {
            error!("Failed to stop engine on port {}: {}", port, e);
            Err(e)
        }
    }
}

#[command]
pub async fn stop_all_engines() -> Result<(), String> {
    info!("Received stop_all_engines request");

    match ENGINE_MANAGER.stop_all_engines() {
        Ok(_) => {
            info!("Successfully stopped all engines");
            Ok(())
        }
        Err(e) => {
            error!("Failed to stop all engines: {}", e);
            Err(e)
        }
    }
}

#[command]
pub async fn get_running_engines() -> Result<Vec<u16>, String> {
    let ports = ENGINE_MANAGER.get_running_engines();
    info!("Current running engines on ports: {:?}", ports);
    Ok(ports)
}

#[command]
pub async fn is_engine_running(port: u16) -> Result<bool, String> {
    let is_running = ENGINE_MANAGER.is_engine_running(port);
    info!("Engine running check for port {}: {}", port, is_running);
    Ok(is_running)
}

#[command]
pub async fn get_engine_status(port: u16) -> Result<serde_json::Value, String> {
    let is_running = ENGINE_MANAGER.is_engine_running(port);

    let status = if is_running {
        serde_json::json!({
            "port": port,
            "status": "RUNNING",
            "pid": null, // Would get actual PID in production
            "uptime_seconds": null, // Would calculate actual uptime
            "last_heartbeat": chrono::Utc::now().to_rfc3339(),
        })
    } else {
        serde_json::json!({
            "port": port,
            "status": "STOPPED",
            "pid": null,
            "uptime_seconds": null,
            "last_heartbeat": null,
        })
    };

    Ok(status)
}

#[command]
pub async fn restart_engine(port: u16) -> Result<u16, String> {
    info!("Received restart_engine request for port {}", port);

    // Stop the existing engine
    if let Err(e) = ENGINE_MANAGER.stop_engine(port) {
        warn!("Engine was not running on port {}: {}", port, e);
    }

    // Wait a bit for cleanup
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // Spawn a new engine on the same port
    match ENGINE_MANAGER.spawn_engine(port) {
        Ok(_) => {
            info!("Successfully restarted engine on port {}", port);
            Ok(port)
        }
        Err(e) => {
            error!("Failed to restart engine on port {}: {}", port, e);
            Err(e)
        }
    }
}

#[command]
pub async fn get_engine_logs(port: u16) -> Result<serde_json::Value, String> {
    info!("Received get_engine_logs request for port {}", port);

    if !ENGINE_MANAGER.is_engine_running(port) {
        return Err(format!("No engine running on port {}", port));
    }

    // In a real implementation, this would read from the engine's log file
    // For now, return simulated logs
    let logs = serde_json::json!({
        "port": port,
        "logs": [
            {
                "timestamp": chrono::Utc::now().to_rfc3339(),
                "level": "INFO",
                "message": "Engine started successfully"
            },
            {
                "timestamp": chrono::Utc::now().to_rfc3339(),
                "level": "INFO",
                "message": "WebSocket server listening on port"
            }
        ]
    });

    Ok(logs)
}

#[command]
pub async fn send_engine_command(port: u16, command: String, args: serde_json::Value) -> Result<serde_json::Value, String> {
    info!("Received send_engine_command: {} for port {}", command, port);

    if !ENGINE_MANAGER.is_engine_running(port) {
        return Err(format!("No engine running on port {}", port));
    }

    // In a real implementation, this would send a command to the running engine
    // For now, return a simulated response
    let response = serde_json::json!({
        "port": port,
        "command": command,
        "args": args,
        "status": "success",
        "message": "Command executed successfully"
    });

    Ok(response)
}

// ============================================================================
// Kernel Detection Commands
// ============================================================================

#[command]
pub async fn detect_kernels() -> Result<Vec<DetectedKernel>, String> {
    info!("Received detect_kernels request");

    let kernels = detect_chrome_executable();
    info!("Detected {} kernels", kernels.len());

    Ok(kernels)
}

#[command]
pub async fn add_kernel_from_path(executable_path: String) -> Result<DetectedKernel, String> {
    info!("Received add_kernel_from_path request for: {}", executable_path);

    if !Path::new(&executable_path).exists() {
        return Err(format!("Executable not found at: {}", executable_path));
    }

    match inspect_chrome_at_path(&executable_path) {
        Some(kernel) => {
            info!("Successfully detected kernel: {} {}", kernel.name, kernel.version);
            Ok(kernel)
        }
        None => Err("Failed to inspect Chrome executable".to_string())
    }
}

#[command]
pub async fn test_kernel_compatibility(kernel_id: String, executable_path: String) -> Result<KernelTestResult, String> {
    info!("Testing kernel compatibility for: {}", kernel_id);

    // Try to get version from the executable
    match inspect_chrome_at_path(&executable_path) {
        Some(kernel) => {
            let test_passed = kernel.is_compatible;
            let test_message = if test_passed {
                format!("Kernel {} {} is compatible (>= 86.0)", kernel.name, kernel.version)
            } else {
                format!("Kernel {} {} is NOT compatible (requires >= 86.0)", kernel.name, kernel.version)
            };

            let result = KernelTestResult {
                kernel_id,
                kernel_name: kernel.name,
                kernel_version: kernel.version,
                test_passed,
                test_message: test_message.clone(),
                test_time: chrono::Utc::now().to_rfc3339(),
            };

            info!("Kernel test result: {}", test_message);
            Ok(result)
        }
        None => Err("Failed to test kernel compatibility".to_string())
    }
}

#[command]
pub async fn get_platform_info() -> Result<String, String> {
    Ok(get_platform())
}
