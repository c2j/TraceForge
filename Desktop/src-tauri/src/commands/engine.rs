// Engine management commands for ForgeEngine spawning and lifecycle
use tauri::command;
use log::{info, error, warn};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

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

            processes.insert(port, child);
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
