// Database initialization and CRUD operations for all entities
// Uses rusqlite for SQLite access with Tauri 1.8
use tauri::command;
use log::info;
use rusqlite::{Connection, params, ToSql};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use uuid::Uuid;

// Database connection wrapper
#[allow(dead_code)]
pub struct DbConnection(pub Arc<Mutex<Connection>>);

// Helper to generate timestamps
fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}

// Helper to generate UUID
fn gen_id() -> String {
    Uuid::new_v4().to_string()
}

// Get database path
fn get_db_path() -> PathBuf {
    let mut path = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push(".local");
    path.push("share");
    path.push("traceforge");
    std::fs::create_dir_all(&path).ok();
    path.push("traceforge.db");
    path
}

// Initialize database connection
pub fn init_db_connection() -> Result<DbConnection, String> {
    let db_path = get_db_path();
    info!("Initializing database at: {:?}", db_path);

    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Run migrations
    let schema_sql = include_str!("../../database/schema.sql");
    conn.execute_batch(schema_sql)
        .map_err(|e| format!("Failed to run migrations: {}", e))?;

    info!("Database initialized successfully");
    Ok(DbConnection(Arc::new(Mutex::new(conn))))
}

// ============================================================================
// INITIALIZATION
// ============================================================================

#[command]
pub async fn init_database() -> Result<String, String> {
    info!("Initializing TraceForge database...");
    // Database is initialized on app startup, this is just a status check
    Ok("Database initialized successfully".to_string())
}

// ============================================================================
// PROJECTS CRUD
// ============================================================================

#[command]
pub async fn create_project(
    name: String,
    version: String,
    description: Option<String>,
) -> Result<String, String> {
    info!("Creating project '{}' v{}", name, version);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let id = gen_id();
    let created_at = now();
    let updated_at = created_at.clone();

    conn.execute(
        "INSERT INTO projects (id, name, version, description, created_at, updated_at, sync_enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
        params![id, name, version, description, created_at, updated_at]
    )
    .map_err(|e| format!("Failed to create project: {}", e))?;

    info!("Project created with ID: {}", id);
    Ok(id)
}

#[command]
pub async fn get_projects() -> Result<serde_json::Value, String> {
    info!("Fetching all projects");

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn.prepare("SELECT * FROM projects ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let projects: Result<Vec<serde_json::Value>, _> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "version": row.get::<_, String>(2)?,
                "description": row.get::<_, Option<String>>(3)?,
                "created_at": row.get::<_, String>(4)?,
                "updated_at": row.get::<_, String>(5)?,
                "sync_enabled": row.get::<_, bool>(6)?,
                "last_sync_at": row.get::<_, Option<String>>(7)?,
            }))
        })
        .map_err(|e| format!("Failed to query projects: {}", e))?
        .collect();

    let projects = projects.map_err(|e| format!("Failed to collect projects: {}", e))?;
    Ok(serde_json::to_value(projects).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn get_project(id: String) -> Result<serde_json::Value, String> {
    info!("Fetching project {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn.prepare("SELECT * FROM projects WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let project = stmt.query_row([&id], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "name": row.get::<_, String>(1)?,
            "version": row.get::<_, String>(2)?,
            "description": row.get::<_, Option<String>>(3)?,
            "created_at": row.get::<_, String>(4)?,
            "updated_at": row.get::<_, String>(5)?,
            "sync_enabled": row.get::<_, bool>(6)?,
            "last_sync_at": row.get::<_, Option<String>>(7)?,
        }))
    });

    match project {
        Ok(p) => Ok(p),
        Err(rusqlite::Error::QueryReturnedNoRows) => Err(format!("Project {} not found", id)),
        Err(e) => Err(format!("Failed to fetch project: {}", e)),
    }
}

#[command]
pub async fn update_project(
    id: String,
    name: Option<String>,
    version: Option<String>,
    description: Option<String>,
) -> Result<(), String> {
    info!("Updating project {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let updated_at = now();

    conn.execute(
        "UPDATE projects SET name = COALESCE(?1, name), version = COALESCE(?2, version), description = COALESCE(?3, description), updated_at = ?4 WHERE id = ?5",
        params![name, version, description, updated_at, id]
    )
    .map_err(|e| format!("Failed to update project: {}", e))?;

    info!("Project {} updated successfully", id);
    Ok(())
}

#[command]
pub async fn delete_project(id: String) -> Result<(), String> {
    info!("Deleting project {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM projects WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete project: {}", e))?;

    info!("Project {} deleted successfully", id);
    Ok(())
}

// ============================================================================
// KERNELS CRUD
// ============================================================================

fn check_chrome_version(version: &str) -> bool {
    version.starts_with("86") || version.starts_with("87") ||
    version.starts_with("88") || version.starts_with("89") ||
    version.starts_with("90") || version.starts_with("91") ||
    version.starts_with("92") || version.starts_with("93") ||
    version.starts_with("94") || version.starts_with("95") ||
    version.starts_with("96") || version.starts_with("97") ||
    version.starts_with("98") || version.starts_with("99") ||
    version.starts_with("100")
}

#[command]
pub async fn create_kernel(
    name: String,
    executable_path: String,
    version: String,
) -> Result<String, String> {
    info!("Creating kernel '{}' v{}", name, version);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let id = gen_id();
    let added_at = now();
    let is_compatible = check_chrome_version(&version) as i32;

    conn.execute(
        "INSERT INTO kernels (id, name, executable_path, version, is_compatible, status, added_at) VALUES (?1, ?2, ?3, ?4, ?5, 'ACTIVE', ?6)",
        params![id, name, executable_path, version, is_compatible, added_at]
    )
    .map_err(|e| format!("Failed to create kernel: {}", e))?;

    info!("Kernel created with ID: {}", id);
    Ok(id)
}

#[command]
pub async fn get_kernels() -> Result<serde_json::Value, String> {
    info!("Fetching all kernels");

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn.prepare("SELECT * FROM kernels ORDER BY added_at DESC")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let kernels: Result<Vec<serde_json::Value>, _> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "executable_path": row.get::<_, String>(2)?,
                "version": row.get::<_, String>(3)?,
                "is_compatible": row.get::<_, bool>(4)?,
                "is_default_record": row.get::<_, bool>(5)?,
                "is_default_agent": row.get::<_, bool>(6)?,
                "status": row.get::<_, String>(7)?,
                "added_at": row.get::<_, String>(8)?,
                "last_tested_at": row.get::<_, Option<String>>(9)?,
            }))
        })
        .map_err(|e| format!("Failed to query kernels: {}", e))?
        .collect();

    let kernels = kernels.map_err(|e| format!("Failed to collect kernels: {}", e))?;
    Ok(serde_json::to_value(kernels).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn update_kernel(
    id: String,
    name: Option<String>,
    executable_path: Option<String>,
    version: Option<String>,
    is_default_record: Option<bool>,
    is_default_agent: Option<bool>,
    status: Option<String>,
) -> Result<String, String> {
    info!("Updating kernel '{}'", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Handle default agent unsetting first
    if let Some(true) = is_default_agent {
        conn.execute("UPDATE kernels SET is_default_agent = 0", [])
            .map_err(|e| format!("Failed to unset previous default: {}", e))?;
    }

    // Build dynamic SQL based on provided parameters
    let mut set_clauses = Vec::new();
    let mut update_values: Vec<Box<dyn ToSql>> = Vec::new();

    if let Some(n) = name {
        set_clauses.push("name = ?");
        update_values.push(Box::new(n));
    }
    if let Some(ep) = executable_path {
        set_clauses.push("executable_path = ?");
        update_values.push(Box::new(ep));
    }
    if let Some(v) = version {
        let is_compat = check_chrome_version(&v) as i32;
        set_clauses.push("version = ?");
        set_clauses.push("is_compatible = ?");
        update_values.push(Box::new(v));
        update_values.push(Box::new(is_compat));
    }
    if let Some(dr) = is_default_record {
        set_clauses.push("is_default_record = ?");
        update_values.push(Box::new(dr as i32));
    }
    if let Some(da) = is_default_agent {
        set_clauses.push("is_default_agent = ?");
        update_values.push(Box::new(da as i32));
    }
    if let Some(s) = status {
        set_clauses.push("status = ?");
        update_values.push(Box::new(s));
    }

    if set_clauses.is_empty() {
        return Err("No fields to update".to_string());
    }

    let sql = format!("UPDATE kernels SET {} WHERE id = ?", set_clauses.join(", "));

    // Convert Box<dyn ToSql> to &dyn ToSql references for the query
    let params_refs: Vec<&dyn ToSql> = update_values.iter().map(|b| b.as_ref()).chain(std::iter::once(&id as &dyn ToSql)).collect();

    conn.execute(&sql, params_refs.as_slice())
        .map_err(|e| format!("Failed to update kernel: {}", e))?;

    info!("Kernel updated: {}", id);
    Ok(id)
}

#[command]
pub async fn delete_kernel(id: String) -> Result<String, String> {
    info!("Deleting kernel '{}'", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM kernels WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete kernel: {}", e))?;

    info!("Kernel deleted: {}", id);
    Ok(id)
}

// ============================================================================
// SCRIPTS CRUD
// ============================================================================

#[command]
pub async fn create_script(
    project_id: String,
    name: String,
    priority: String,
    description: Option<String>,
) -> Result<String, String> {
    info!("Creating script '{}' for project {}", name, project_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let id = gen_id();
    let created_at = now();
    let updated_at = created_at.clone();

    conn.execute(
        "INSERT INTO scripts (id, project_id, name, version, priority, description, created_at, updated_at, status) VALUES (?1, ?2, ?3, '1.0.0', ?4, ?5, ?6, ?7, 'DRAFT')",
        params![id, project_id, name, priority, description, created_at, updated_at]
    )
    .map_err(|e| format!("Failed to create script: {}", e))?;

    info!("Script created with ID: {}", id);
    Ok(id)
}

#[command]
pub async fn get_scripts(project_id: Option<String>) -> Result<serde_json::Value, String> {
    info!("Fetching scripts for project {:?}", project_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let scripts = if let Some(pid) = project_id {
        let mut stmt = conn.prepare("SELECT * FROM scripts WHERE project_id = ?1 ORDER BY created_at DESC")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let result = stmt.query_map([&pid], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "project_id": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "version": row.get::<_, String>(3)?,
                "priority": row.get::<_, String>(4)?,
                "description": row.get::<_, Option<String>>(5)?,
                "created_at": row.get::<_, String>(6)?,
                "updated_at": row.get::<_, String>(7)?,
                "last_executed_at": row.get::<_, Option<String>>(8)?,
                "status": row.get::<_, String>(9)?,
            }))
        })
        .map_err(|e| format!("Failed to query scripts: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect scripts: {}", e))?;
        result
    } else {
        let mut stmt = conn.prepare("SELECT * FROM scripts ORDER BY created_at DESC")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let result = stmt.query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "project_id": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "version": row.get::<_, String>(3)?,
                "priority": row.get::<_, String>(4)?,
                "description": row.get::<_, Option<String>>(5)?,
                "created_at": row.get::<_, String>(6)?,
                "updated_at": row.get::<_, String>(7)?,
                "last_executed_at": row.get::<_, Option<String>>(8)?,
                "status": row.get::<_, String>(9)?,
            }))
        })
        .map_err(|e| format!("Failed to query scripts: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect scripts: {}", e))?;
        result
    };

    Ok(serde_json::to_value(scripts).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn get_script(id: String) -> Result<serde_json::Value, String> {
    info!("Fetching script {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn.prepare("SELECT * FROM scripts WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let script = stmt.query_row([&id], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "project_id": row.get::<_, String>(1)?,
            "name": row.get::<_, String>(2)?,
            "version": row.get::<_, String>(3)?,
            "priority": row.get::<_, String>(4)?,
            "description": row.get::<_, Option<String>>(5)?,
            "created_at": row.get::<_, String>(6)?,
            "updated_at": row.get::<_, String>(7)?,
            "last_executed_at": row.get::<_, Option<String>>(8)?,
            "status": row.get::<_, String>(9)?,
        }))
    });

    match script {
        Ok(s) => Ok(s),
        Err(rusqlite::Error::QueryReturnedNoRows) => Err(format!("Script {} not found", id)),
        Err(e) => Err(format!("Failed to fetch script: {}", e)),
    }
}

#[command]
pub async fn update_script(
    id: String,
    name: Option<String>,
    description: Option<String>,
    status: Option<String>,
) -> Result<(), String> {
    info!("Updating script {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let updated_at = now();

    conn.execute(
        "UPDATE scripts SET updated_at = ?1, name = COALESCE(?2, name), description = COALESCE(?3, description), status = COALESCE(?4, status) WHERE id = ?5",
        params![updated_at, name, description, status, id]
    )
    .map_err(|e| format!("Failed to update script: {}", e))?;

    info!("Script {} updated successfully", id);
    Ok(())
}

#[command]
pub async fn delete_script(id: String) -> Result<(), String> {
    info!("Deleting script {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM scripts WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete script: {}", e))?;

    info!("Script {} deleted successfully", id);
    Ok(())
}

// ============================================================================
// BULK SAVE - Save scenarios, pages, and actions for a script
// ============================================================================

#[command]
pub async fn update_script_scenarios(
    script_id: String,
    scenarios_json: String,
) -> Result<String, String> {
    info!("Saving scenarios for script {}", script_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Parse the scenarios JSON
    let scenarios: Vec<serde_json::Value> = serde_json::from_str(&scenarios_json)
        .map_err(|e| format!("Failed to parse scenarios JSON: {}", e))?;

    // Begin transaction
    let tx = conn.unchecked_transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Delete existing scenarios, pages, actions, locators, and parameters for this script
    // First get all scenario IDs for this script
    {
        let mut stmt = tx.prepare("SELECT id FROM scenarios WHERE script_id = ?1")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let scenario_ids: Result<Vec<String>, _> = stmt.query_map([&script_id], |row| row.get(0))
            .map_err(|e| format!("Failed to query scenarios: {}", e))?
            .collect();
        let scenario_ids = scenario_ids.map_err(|e| format!("Failed to collect scenario IDs: {}", e))?;

        // Delete actions, locators, and parameters for each scenario
        for scenario_id in &scenario_ids {
            let mut page_stmt = tx.prepare("SELECT id FROM pages WHERE scenario_id = ?1")
                .map_err(|e| format!("Failed to prepare page query: {}", e))?;
            let page_ids: Result<Vec<String>, _> = page_stmt.query_map([scenario_id], |row| row.get(0))
                .map_err(|e| format!("Failed to query pages: {}", e))?
                .collect();
            let page_ids = page_ids.map_err(|e| format!("Failed to collect page IDs: {}", e))?;

            for page_id in &page_ids {
                // Delete locators for actions in this page
                tx.execute(
                    "DELETE FROM locator_strategies WHERE action_id IN (SELECT id FROM actions WHERE page_id = ?1)",
                    [page_id]
                ).map_err(|e| format!("Failed to delete locators: {}", e))?;

                // Delete parameters for actions in this page
                tx.execute(
                    "DELETE FROM parameters WHERE action_id IN (SELECT id FROM actions WHERE page_id = ?1)",
                    [page_id]
                ).map_err(|e| format!("Failed to delete parameters: {}", e))?;

                // Delete actions
                tx.execute("DELETE FROM actions WHERE page_id = ?1", [page_id])
                    .map_err(|e| format!("Failed to delete actions: {}", e))?;
            }

            // Delete pages
            tx.execute("DELETE FROM pages WHERE scenario_id = ?1", [scenario_id])
                .map_err(|e| format!("Failed to delete pages: {}", e))?;
        }

        // Delete scenarios
        tx.execute("DELETE FROM scenarios WHERE script_id = ?1", [&script_id])
            .map_err(|e| format!("Failed to delete scenarios: {}", e))?;
    }

    // Insert new scenarios, pages, and actions
    for (s_idx, scenario) in scenarios.iter().enumerate() {
        let sc_id = gen_id();
        let sc_name = scenario.get("name").and_then(|v| v.as_str()).unwrap_or("Scenario");
        let sc_priority = scenario.get("priority").and_then(|v| v.as_str()).unwrap_or("P1");
        let sc_description = scenario.get("description").and_then(|v| v.as_str()).map(|s| s.to_string());

        tx.execute(
            "INSERT INTO scenarios (id, script_id, name, priority, description, order_index) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![sc_id, script_id, sc_name, sc_priority, sc_description, s_idx as i32]
        ).map_err(|e| format!("Failed to insert scenario: {}", e))?;

        // Insert pages
        if let Some(pages) = scenario.get("pages").and_then(|v| v.as_array()) {
            for (p_idx, page) in pages.iter().enumerate() {
                let page_id = gen_id();
                let page_name = page.get("name").and_then(|v| v.as_str()).unwrap_or("Page");
                let entry_url = page.get("entry_url").and_then(|v| v.as_str()).map(|s| s.to_string());
                let default_wait = page.get("default_wait").and_then(|v| v.as_str()).map(|s| s.to_string());

                tx.execute(
                    "INSERT INTO pages (id, scenario_id, name, entry_url, default_wait, order_index) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![page_id, sc_id, page_name, entry_url, default_wait, p_idx as i32]
                ).map_err(|e| format!("Failed to insert page: {}", e))?;

                // Insert actions
                if let Some(actions) = page.get("actions").and_then(|v| v.as_array()) {
                    for (a_idx, action) in actions.iter().enumerate() {
                        let action_id = gen_id();
                        let action_name = action.get("name").and_then(|v| v.as_str()).unwrap_or("Action");
                        let action_type = action.get("action_type").and_then(|v| v.as_str()).unwrap_or("click");
                        let timeout_ms = action.get("timeout_ms").and_then(|v| v.as_i64()).unwrap_or(30000) as i32;
                        let wait_after = action.get("wait_after").and_then(|v| v.as_str()).map(|s| s.to_string());
                        let screenshot_enabled = action.get("screenshot_enabled").and_then(|v| v.as_bool()).unwrap_or(true);

                        tx.execute(
                            "INSERT INTO actions (id, page_id, name, action_type, order_index, timeout_ms, wait_after, screenshot_enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                            params![action_id, page_id, action_name, action_type, a_idx as i32, timeout_ms, wait_after, screenshot_enabled as i32]
                        ).map_err(|e| format!("Failed to insert action: {}", e))?;

                        // Insert locators
                        if let Some(locators) = action.get("locators").and_then(|v| v.as_array()) {
                            for locator in locators {
                                let locator_id = gen_id();
                                let loc_type = locator.get("locator_type").and_then(|v| v.as_str()).unwrap_or("css");
                                let value = locator.get("value").and_then(|v| v.as_str()).unwrap_or("");
                                let priority = locator.get("priority").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                                let is_fallback = locator.get("is_fallback").and_then(|v| v.as_bool()).unwrap_or(false);
                                let description = locator.get("description").and_then(|v| v.as_str()).map(|s| s.to_string());

                                tx.execute(
                                    "INSERT INTO locator_strategies (id, action_id, locator_type, value, priority, is_fallback, description) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                                    params![locator_id, action_id, loc_type, value, priority, is_fallback as i32, description]
                                ).map_err(|e| format!("Failed to insert locator: {}", e))?;
                            }
                        }

                        // Insert parameters
                        if let Some(parameters) = action.get("parameters").and_then(|v| v.as_array()) {
                            for param in parameters {
                                let param_id = gen_id();
                                let key = param.get("key").and_then(|v| v.as_str()).unwrap_or("");
                                let value = param.get("value").and_then(|v| v.as_str()).unwrap_or("");
                                let data_type = param.get("data_type").and_then(|v| v.as_str()).unwrap_or("string");

                                tx.execute(
                                    "INSERT INTO parameters (id, action_id, key, value, data_type) VALUES (?1, ?2, ?3, ?4, ?5)",
                                    params![param_id, action_id, key, value, data_type]
                                ).map_err(|e| format!("Failed to insert parameter: {}", e))?;
                            }
                        }
                    }
                }
            }
        }
    }

    // Commit transaction
    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    info!("Scenarios saved successfully for script {}", script_id);
    Ok("Scenarios saved successfully".to_string())
}

// ============================================================================
// SCENARIOS CRUD
// ============================================================================

#[command]
pub async fn create_scenario(
    script_id: String,
    name: String,
    priority: String,
    description: Option<String>,
    order_index: i32,
) -> Result<String, String> {
    info!("Creating scenario '{}' for script {}", name, script_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let id = gen_id();

    conn.execute(
        "INSERT INTO scenarios (id, script_id, name, priority, description, order_index) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, script_id, name, priority, description, order_index]
    )
    .map_err(|e| format!("Failed to create scenario: {}", e))?;

    info!("Scenario created with ID: {}", id);
    Ok(id)
}

#[command]
pub async fn get_scenarios(script_id: Option<String>) -> Result<serde_json::Value, String> {
    info!("Fetching scenarios for script {:?}", script_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let scenarios = if let Some(sid) = script_id {
        let mut stmt = conn.prepare("SELECT * FROM scenarios WHERE script_id = ?1 ORDER BY order_index")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let result = stmt.query_map([&sid], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "script_id": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "priority": row.get::<_, String>(3)?,
                "description": row.get::<_, Option<String>>(4)?,
                "order_index": row.get::<_, i32>(5)?,
            }))
        })
        .map_err(|e| format!("Failed to query scenarios: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect scenarios: {}", e))?;
        result
    } else {
        let mut stmt = conn.prepare("SELECT * FROM scenarios ORDER BY order_index")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let result = stmt.query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "script_id": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "priority": row.get::<_, String>(3)?,
                "description": row.get::<_, Option<String>>(4)?,
                "order_index": row.get::<_, i32>(5)?,
            }))
        })
        .map_err(|e| format!("Failed to query scenarios: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect scenarios: {}", e))?;
        result
    };

    Ok(serde_json::to_value(scenarios).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn update_scenario(
    id: String,
    name: Option<String>,
    priority: Option<String>,
    description: Option<String>,
    order_index: Option<i32>,
) -> Result<(), String> {
    info!("Updating scenario {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute(
        "UPDATE scenarios SET name = COALESCE(?1, name), priority = COALESCE(?2, priority), description = COALESCE(?3, description), order_index = COALESCE(?4, order_index) WHERE id = ?5",
        params![name, priority, description, order_index, id]
    )
    .map_err(|e| format!("Failed to update scenario: {}", e))?;

    info!("Scenario {} updated successfully", id);
    Ok(())
}

#[command]
pub async fn delete_scenario(id: String) -> Result<(), String> {
    info!("Deleting scenario {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM scenarios WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete scenario: {}", e))?;

    info!("Scenario {} deleted successfully", id);
    Ok(())
}

// ============================================================================
// PAGES CRUD
// ============================================================================

#[command]
pub async fn create_page(
    scenario_id: String,
    name: String,
    entry_url: Option<String>,
    default_wait: Option<String>,
    order_index: i32,
) -> Result<String, String> {
    info!("Creating page '{}' for scenario {}", name, scenario_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let id = gen_id();

    conn.execute(
        "INSERT INTO pages (id, scenario_id, name, entry_url, default_wait, order_index) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, scenario_id, name, entry_url, default_wait, order_index]
    )
    .map_err(|e| format!("Failed to create page: {}", e))?;

    info!("Page created with ID: {}", id);
    Ok(id)
}

#[command]
pub async fn get_pages(scenario_id: Option<String>) -> Result<serde_json::Value, String> {
    info!("Fetching pages for scenario {:?}", scenario_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let pages = if let Some(sid) = scenario_id {
        let mut stmt = conn.prepare("SELECT * FROM pages WHERE scenario_id = ?1 ORDER BY order_index")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let result = stmt.query_map([&sid], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "scenario_id": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "entry_url": row.get::<_, Option<String>>(3)?,
                "default_wait": row.get::<_, Option<String>>(4)?,
                "order_index": row.get::<_, i32>(5)?,
            }))
        })
        .map_err(|e| format!("Failed to query pages: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect pages: {}", e))?;
        result
    } else {
        vec![]
    };

    Ok(serde_json::to_value(pages).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn update_page(
    id: String,
    name: Option<String>,
    entry_url: Option<String>,
    default_wait: Option<String>,
) -> Result<(), String> {
    info!("Updating page {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute(
        "UPDATE pages SET name = COALESCE(?1, name), entry_url = COALESCE(?2, entry_url), default_wait = COALESCE(?3, default_wait) WHERE id = ?4",
        params![name, entry_url, default_wait, id]
    )
    .map_err(|e| format!("Failed to update page: {}", e))?;

    info!("Page {} updated successfully", id);
    Ok(())
}

#[command]
pub async fn delete_page(id: String) -> Result<(), String> {
    info!("Deleting page {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM pages WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete page: {}", e))?;

    info!("Page {} deleted successfully", id);
    Ok(())
}

// ============================================================================
// ACTIONS CRUD
// ============================================================================

#[command]
pub async fn create_action(
    page_id: String,
    name: String,
    action_type: String,
    timeout_ms: i32,
    wait_after: Option<String>,
    screenshot_enabled: Option<bool>,
    order_index: i32,
) -> Result<String, String> {
    info!("Creating action '{}' ({}) for page {}", name, action_type, page_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let id = gen_id();
    let screenshot = screenshot_enabled.unwrap_or(true) as i32;

    conn.execute(
        "INSERT INTO actions (id, page_id, name, action_type, order_index, timeout_ms, wait_after, screenshot_enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, page_id, name, action_type, order_index, timeout_ms, wait_after, screenshot]
    )
    .map_err(|e| format!("Failed to create action: {}", e))?;

    info!("Action created with ID: {}", id);
    Ok(id)
}

#[command]
pub async fn get_actions(page_id: Option<String>) -> Result<serde_json::Value, String> {
    info!("Fetching actions for page {:?}", page_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let actions = if let Some(pid) = page_id {
        let mut stmt = conn.prepare("SELECT * FROM actions WHERE page_id = ?1 ORDER BY order_index")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let result = stmt.query_map([&pid], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "page_id": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "action_type": row.get::<_, String>(3)?,
                "order_index": row.get::<_, i32>(4)?,
                "timeout_ms": row.get::<_, i32>(5)?,
                "wait_after": row.get::<_, Option<String>>(6)?,
                "screenshot_enabled": row.get::<_, bool>(7)?,
            }))
        })
        .map_err(|e| format!("Failed to query actions: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect actions: {}", e))?;
        result
    } else {
        vec![]
    };

    Ok(serde_json::to_value(actions).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn update_action(
    id: String,
    name: Option<String>,
    timeout_ms: Option<i32>,
    wait_after: Option<String>,
    screenshot_enabled: Option<bool>,
) -> Result<(), String> {
    info!("Updating action {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let screenshot = screenshot_enabled.map(|b| b as i32);

    conn.execute(
        "UPDATE actions SET name = COALESCE(?1, name), timeout_ms = COALESCE(?2, timeout_ms), wait_after = COALESCE(?3, wait_after), screenshot_enabled = COALESCE(?4, screenshot_enabled) WHERE id = ?5",
        params![name, timeout_ms, wait_after, screenshot, id]
    )
    .map_err(|e| format!("Failed to update action: {}", e))?;

    info!("Action {} updated successfully", id);
    Ok(())
}

#[command]
pub async fn delete_action(id: String) -> Result<(), String> {
    info!("Deleting action {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM actions WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete action: {}", e))?;

    info!("Action {} deleted successfully", id);
    Ok(())
}

// ============================================================================
// LOCATORS CRUD
// ============================================================================

#[command]
pub async fn create_locator(
    action_id: String,
    locator_type: String,
    value: String,
    priority: i32,
    is_fallback: Option<bool>,
    description: Option<String>,
) -> Result<String, String> {
    info!("Creating {} locator for action {}", locator_type, action_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let id = gen_id();
    let fallback = is_fallback.unwrap_or(false) as i32;

    conn.execute(
        "INSERT INTO locator_strategies (id, action_id, locator_type, value, priority, is_fallback, description) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, action_id, locator_type, value, priority, fallback, description]
    )
    .map_err(|e| format!("Failed to create locator: {}", e))?;

    info!("Locator created with ID: {}", id);
    Ok(id)
}

#[command]
pub async fn get_locators(action_id: Option<String>) -> Result<serde_json::Value, String> {
    info!("Fetching locators for action {:?}", action_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let locators = if let Some(aid) = action_id {
        let mut stmt = conn.prepare("SELECT * FROM locator_strategies WHERE action_id = ?1 ORDER BY priority")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let result = stmt.query_map([&aid], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "action_id": row.get::<_, String>(1)?,
                "locator_type": row.get::<_, String>(2)?,
                "value": row.get::<_, String>(3)?,
                "priority": row.get::<_, i32>(4)?,
                "is_fallback": row.get::<_, bool>(5)?,
                "description": row.get::<_, Option<String>>(6)?,
            }))
        })
        .map_err(|e| format!("Failed to query locators: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect locators: {}", e))?;
        result
    } else {
        vec![]
    };

    Ok(serde_json::to_value(locators).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn update_locator(
    id: String,
    value: Option<String>,
    priority: Option<i32>,
    is_fallback: Option<bool>,
) -> Result<(), String> {
    info!("Updating locator {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let fallback = is_fallback.map(|b| b as i32);

    conn.execute(
        "UPDATE locator_strategies SET value = COALESCE(?1, value), priority = COALESCE(?2, priority), is_fallback = COALESCE(?3, is_fallback) WHERE id = ?4",
        params![value, priority, fallback, id]
    )
    .map_err(|e| format!("Failed to update locator: {}", e))?;

    info!("Locator {} updated successfully", id);
    Ok(())
}

#[command]
pub async fn delete_locator(id: String) -> Result<(), String> {
    info!("Deleting locator {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM locator_strategies WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete locator: {}", e))?;

    info!("Locator {} deleted successfully", id);
    Ok(())
}

// ============================================================================
// PARAMETERS CRUD
// ============================================================================

#[command]
pub async fn create_parameter(
    action_id: String,
    key: String,
    value: String,
    data_type: String,
) -> Result<String, String> {
    info!("Creating parameter {}={} for action {}", key, value, action_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let id = gen_id();

    conn.execute(
        "INSERT INTO parameters (id, action_id, key, value, data_type) VALUES (?1, ?2, ?3, ?4, ?5)",
        [&id, &action_id, &key, &value, &data_type]
    )
    .map_err(|e| format!("Failed to create parameter: {}", e))?;

    info!("Parameter created with ID: {}", id);
    Ok(id)
}

#[command]
pub async fn get_parameters(action_id: Option<String>) -> Result<serde_json::Value, String> {
    info!("Fetching parameters for action {:?}", action_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let parameters = if let Some(aid) = action_id {
        let mut stmt = conn.prepare("SELECT * FROM parameters WHERE action_id = ?1")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let result = stmt.query_map([&aid], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "action_id": row.get::<_, String>(1)?,
                "key": row.get::<_, String>(2)?,
                "value": row.get::<_, String>(3)?,
                "data_type": row.get::<_, String>(4)?,
            }))
        })
        .map_err(|e| format!("Failed to query parameters: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect parameters: {}", e))?;
        result
    } else {
        vec![]
    };

    Ok(serde_json::to_value(parameters).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn update_parameter(
    id: String,
    key: Option<String>,
    value: Option<String>,
    data_type: Option<String>,
) -> Result<(), String> {
    info!("Updating parameter {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute(
        "UPDATE parameters SET key = COALESCE(?1, key), value = COALESCE(?2, value), data_type = COALESCE(?3, data_type) WHERE id = ?4",
        params![key, value, data_type, id]
    )
    .map_err(|e| format!("Failed to update parameter: {}", e))?;

    info!("Parameter {} updated successfully", id);
    Ok(())
}

#[command]
pub async fn delete_parameter(id: String) -> Result<(), String> {
    info!("Deleting parameter {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM parameters WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete parameter: {}", e))?;

    info!("Parameter {} deleted successfully", id);
    Ok(())
}

// ============================================================================
// EXECUTIONS CRUD
// ============================================================================

#[command]
pub async fn create_execution(
    script_id: String,
    kernel_id: String,
) -> Result<String, String> {
    info!("Creating execution for script {} on kernel {}", script_id, kernel_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let id = gen_id();
    let started_at = now();

    conn.execute(
        "INSERT INTO executions (id, script_id, kernel_id, status, started_at) VALUES (?1, ?2, ?3, 'RUNNING', ?4)",
        [&id, &script_id, &kernel_id, &started_at]
    )
    .map_err(|e| format!("Failed to create execution: {}", e))?;

    info!("Execution created with ID: {}", id);
    Ok(id)
}

#[command]
pub async fn get_executions(script_id: Option<String>) -> Result<serde_json::Value, String> {
    info!("Fetching executions for script {:?}", script_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let executions = if let Some(sid) = script_id {
        let mut stmt = conn.prepare("SELECT * FROM executions WHERE script_id = ?1 ORDER BY started_at DESC")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let result = stmt.query_map([&sid], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "script_id": row.get::<_, String>(1)?,
                "kernel_id": row.get::<_, String>(2)?,
                "status": row.get::<_, String>(3)?,
                "started_at": row.get::<_, String>(4)?,
                "completed_at": row.get::<_, Option<String>>(5)?,
                "duration_ms": row.get::<_, Option<i32>>(6)?,
                "data_row_index": row.get::<_, Option<i32>>(7)?,
                "trace_path": row.get::<_, Option<String>>(8)?,
                "error_message": row.get::<_, Option<String>>(9)?,
            }))
        })
        .map_err(|e| format!("Failed to query executions: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect executions: {}", e))?;
        result
    } else {
        vec![]
    };

    Ok(serde_json::to_value(executions).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn get_execution(id: String) -> Result<serde_json::Value, String> {
    info!("Fetching execution {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn.prepare("SELECT * FROM executions WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let execution = stmt.query_row([&id], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "script_id": row.get::<_, String>(1)?,
            "kernel_id": row.get::<_, String>(2)?,
            "status": row.get::<_, String>(3)?,
            "started_at": row.get::<_, String>(4)?,
            "completed_at": row.get::<_, Option<String>>(5)?,
            "duration_ms": row.get::<_, Option<i32>>(6)?,
            "data_row_index": row.get::<_, Option<i32>>(7)?,
            "trace_path": row.get::<_, Option<String>>(8)?,
            "error_message": row.get::<_, Option<String>>(9)?,
        }))
    });

    match execution {
        Ok(e) => Ok(e),
        Err(rusqlite::Error::QueryReturnedNoRows) => Err(format!("Execution {} not found", id)),
        Err(e) => Err(format!("Failed to fetch execution: {}", e)),
    }
}

#[command]
pub async fn update_execution_status(
    id: String,
    status: String,
    error_message: Option<String>,
    trace_path: Option<String>,
) -> Result<(), String> {
    info!("Updating execution {} status to {}", id, status);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let completed_at = if status != "RUNNING" { Some(now()) } else { None };

    conn.execute(
        "UPDATE executions SET status = ?1, completed_at = ?2, error_message = COALESCE(?3, error_message), trace_path = COALESCE(?4, trace_path) WHERE id = ?5",
        params![status, completed_at, error_message, trace_path, id]
    )
    .map_err(|e| format!("Failed to update execution: {}", e))?;

    info!("Execution {} updated successfully", id);
    Ok(())
}

#[command]
pub async fn delete_execution(id: String) -> Result<(), String> {
    info!("Deleting execution {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM executions WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete execution: {}", e))?;

    info!("Execution {} deleted successfully", id);
    Ok(())
}

// ============================================================================
// EXECUTION STEPS CRUD
// ============================================================================

#[command]
pub async fn create_execution_step(
    execution_id: String,
    action_id: String,
) -> Result<String, String> {
    info!("Creating execution step for execution {}", execution_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let id = gen_id();
    let started_at = now();

    conn.execute(
        "INSERT INTO execution_steps (id, execution_id, action_id, status, started_at, completed_at) VALUES (?1, ?2, ?3, 'RUNNING', ?4, ?5)",
        [&id, &execution_id, &action_id, &started_at, &started_at]
    )
    .map_err(|e| format!("Failed to create execution step: {}", e))?;

    info!("Execution step created with ID: {}", id);
    Ok(id)
}

#[command]
pub async fn get_execution_steps(execution_id: Option<String>) -> Result<serde_json::Value, String> {
    info!("Fetching execution steps for execution {:?}", execution_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let steps = if let Some(eid) = execution_id {
        let mut stmt = conn.prepare("SELECT * FROM execution_steps WHERE execution_id = ?1 ORDER BY started_at")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let result = stmt.query_map([&eid], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "execution_id": row.get::<_, String>(1)?,
                "action_id": row.get::<_, String>(2)?,
                "status": row.get::<_, String>(3)?,
                "started_at": row.get::<_, String>(4)?,
                "completed_at": row.get::<_, String>(5)?,
                "duration_ms": row.get::<_, Option<i32>>(6)?,
                "screenshot_path": row.get::<_, Option<String>>(7)?,
                "log_output": row.get::<_, Option<String>>(8)?,
                "error_message": row.get::<_, Option<String>>(9)?,
            }))
        })
        .map_err(|e| format!("Failed to query execution steps: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect execution steps: {}", e))?;
        result
    } else {
        vec![]
    };

    Ok(serde_json::to_value(steps).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn update_execution_step_status(
    id: String,
    status: String,
    screenshot_path: Option<String>,
    log_output: Option<String>,
    error_message: Option<String>,
) -> Result<(), String> {
    info!("Updating execution step {} status to {}", id, status);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let completed_at = now();

    conn.execute(
        "UPDATE execution_steps SET status = ?1, completed_at = ?2, screenshot_path = COALESCE(?3, screenshot_path), log_output = COALESCE(?4, log_output), error_message = COALESCE(?5, error_message) WHERE id = ?6",
        params![status, completed_at, screenshot_path, log_output, error_message, id]
    )
    .map_err(|e| format!("Failed to update execution step: {}", e))?;

    info!("Execution step {} updated successfully", id);
    Ok(())
}

// ============================================================================
// DATA TABLES CRUD
// ============================================================================

#[command]
pub async fn create_data_table(
    script_id: String,
    name: String,
    source_type: String,
    columns: serde_json::Value,
) -> Result<String, String> {
    info!("Creating data table '{}' for script {}", name, script_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let id = gen_id();
    let created_at = now();
    let updated_at = created_at.clone();
    let columns_json = columns.to_string();

    conn.execute(
        "INSERT INTO data_tables (id, script_id, name, source_type, columns, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, script_id, name, source_type, columns_json, created_at, updated_at]
    )
    .map_err(|e| format!("Failed to create data table: {}", e))?;

    info!("Data table created with ID: {}", id);
    Ok(id)
}

#[command]
pub async fn get_data_tables(project_id: Option<String>) -> Result<serde_json::Value, String> {
    info!("Fetching data tables for project {:?}", project_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn.prepare("SELECT * FROM data_tables ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let tables: Result<Vec<serde_json::Value>, _> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "script_id": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "source_type": row.get::<_, String>(3)?,
                "file_path": row.get::<_, Option<String>>(4)?,
                "columns": row.get::<_, String>(5)?,
                "created_at": row.get::<_, String>(6)?,
                "updated_at": row.get::<_, String>(7)?,
            }))
        })
        .map_err(|e| format!("Failed to query data tables: {}", e))?
        .collect();

    let tables = tables.map_err(|e| format!("Failed to collect data tables: {}", e))?;
    Ok(serde_json::to_value(tables).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn update_data_table(
    id: String,
    name: Option<String>,
) -> Result<(), String> {
    info!("Updating data table {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let updated_at = now();

    conn.execute(
        "UPDATE data_tables SET name = COALESCE(?1, name), updated_at = ?2 WHERE id = ?3",
        params![name, updated_at, id]
    )
    .map_err(|e| format!("Failed to update data table: {}", e))?;

    info!("Data table {} updated successfully", id);
    Ok(())
}

#[command]
pub async fn delete_data_table(id: String) -> Result<(), String> {
    info!("Deleting data table {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM data_tables WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete data table: {}", e))?;

    info!("Data table {} deleted successfully", id);
    Ok(())
}

// ============================================================================
// DATABASE PRUNING AND ARCHIVING
// ============================================================================

#[derive(serde::Serialize)]
pub struct PruneStats {
    pub executions_deleted: i64,
    pub execution_steps_deleted: i64,
    pub space_freed_bytes: i64,
}

#[derive(serde::Serialize)]
pub struct ArchiveStats {
    pub executions_archived: i64,
    pub execution_steps_archived: i64,
    pub archive_path: String,
}

#[command]
pub async fn get_database_stats() -> Result<serde_json::Value, String> {
    info!("Fetching database statistics");

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Count records in each table
    let project_count: i64 = conn.query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))
        .unwrap_or(0);
    let kernel_count: i64 = conn.query_row("SELECT COUNT(*) FROM kernels", [], |row| row.get(0))
        .unwrap_or(0);
    let script_count: i64 = conn.query_row("SELECT COUNT(*) FROM scripts", [], |row| row.get(0))
        .unwrap_or(0);
    let scenario_count: i64 = conn.query_row("SELECT COUNT(*) FROM scenarios", [], |row| row.get(0))
        .unwrap_or(0);
    let page_count: i64 = conn.query_row("SELECT COUNT(*) FROM pages", [], |row| row.get(0))
        .unwrap_or(0);
    let action_count: i64 = conn.query_row("SELECT COUNT(*) FROM actions", [], |row| row.get(0))
        .unwrap_or(0);
    let execution_count: i64 = conn.query_row("SELECT COUNT(*) FROM executions", [], |row| row.get(0))
        .unwrap_or(0);
    let execution_step_count: i64 = conn.query_row("SELECT COUNT(*) FROM execution_steps", [], |row| row.get(0))
        .unwrap_or(0);

    // Get database file size
    let db_size = std::fs::metadata(&db_path)
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(serde_json::json!({
        "projects": project_count,
        "kernels": kernel_count,
        "scripts": script_count,
        "scenarios": scenario_count,
        "pages": page_count,
        "actions": action_count,
        "executions": execution_count,
        "execution_steps": execution_step_count,
        "db_size_bytes": db_size,
        "db_path": db_path.to_string_lossy(),
    }))
}

#[command]
pub async fn prune_old_executions(
    older_than_days: i32,
    keep_failed: bool,
) -> Result<serde_json::Value, String> {
    info!(
        "Pruning executions older than {} days (keep_failed: {})",
        older_than_days, keep_failed
    );

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let cutoff_date = chrono::Utc::now() - chrono::Duration::days(older_than_days as i64);
    let cutoff_str = cutoff_date.to_rfc3339();

    // Begin transaction
    let tx = conn.unchecked_transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Build WHERE clause based on parameters
    let where_clause = if keep_failed {
        format!("started_at < '{}' AND status != 'FAILED'", cutoff_str)
    } else {
        format!("started_at < '{}'", cutoff_str)
    };

    // Count executions to be deleted
    let executions_deleted: i64 = tx.query_row(
        &format!("SELECT COUNT(*) FROM executions WHERE {}", where_clause),
        [],
        |row| row.get(0)
    ).unwrap_or(0);

    // Get total execution steps count
    let execution_steps_deleted: i64 = tx.query_row(
        &format!("SELECT COUNT(*) FROM execution_steps WHERE execution_id IN (SELECT id FROM executions WHERE {})", where_clause),
        [],
        |row| row.get(0)
    ).unwrap_or(0);

    // Get database size before
    let db_size_before = std::fs::metadata(&db_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // Delete execution steps first (due to foreign key)
    tx.execute(
        &format!("DELETE FROM execution_steps WHERE execution_id IN (SELECT id FROM executions WHERE {})", where_clause),
        []
    )
    .map_err(|e| format!("Failed to delete execution steps: {}", e))?;

    // Delete executions
    tx.execute(
        &format!("DELETE FROM executions WHERE {}", where_clause),
        []
    )
    .map_err(|e| format!("Failed to delete executions: {}", e))?;

    // Commit transaction
    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    // VACUUM to reclaim space
    conn.execute("VACUUM", [])
        .map_err(|e| format!("Failed to vacuum database: {}", e))?;

    // Get database size after
    let db_size_after = std::fs::metadata(&db_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let space_freed = db_size_before.saturating_sub(db_size_after);

    info!(
        "Pruned {} executions and {} execution steps, freed {} bytes",
        executions_deleted, execution_steps_deleted, space_freed
    );

    Ok(serde_json::to_value(PruneStats {
        executions_deleted,
        execution_steps_deleted,
        space_freed_bytes: space_freed as i64,
    }).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn archive_executions(
    older_than_days: i32,
    archive_path: String,
) -> Result<serde_json::Value, String> {
    info!(
        "Archiving executions older than {} days to {}",
        older_than_days, archive_path
    );

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let cutoff_date = chrono::Utc::now() - chrono::Duration::days(older_than_days as i64);
    let cutoff_str = cutoff_date.to_rfc3339();

    let where_clause = format!("started_at < '{}'", cutoff_str);

    // Count executions to be archived
    let executions_archived: i64 = conn.query_row(
        &format!("SELECT COUNT(*) FROM executions WHERE {}", where_clause),
        [],
        |row| row.get(0)
    ).unwrap_or(0);

    // Get total execution steps count
    let execution_steps_archived: i64 = conn.query_row(
        &format!("SELECT COUNT(*) FROM execution_steps WHERE execution_id IN (SELECT id FROM executions WHERE {})", where_clause),
        [],
        |row| row.get(0)
    ).unwrap_or(0);

    // Query all data to be archived
    let mut stmt = conn.prepare(
        &format!(
            "SELECT e.id, e.script_id, e.kernel_id, e.status, e.started_at, e.completed_at,
                    e.duration_ms, e.data_row_index, e.trace_path, e.error_message,
                    s.id, s.execution_id, s.action_id, s.status as step_status,
                    s.started_at as step_started, s.completed_at as step_completed,
                    s.duration_ms as step_duration, s.screenshot_path, s.log_output, s.error_message as step_error
             FROM executions e
             LEFT JOIN execution_steps s ON e.id = s.execution_id
             WHERE e.started_at < {}
             ORDER BY e.started_at",
            cutoff_str
        )
    )
    .map_err(|e| format!("Failed to prepare query: {}", e))?;

    // Collect results into JSON structure
    let mut archive_data = serde_json::Map::new();
    let mut executions = Vec::new();

    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,   // e.id
            row.get::<_, String>(1)?,   // e.script_id
            row.get::<_, String>(2)?,   // e.kernel_id
            row.get::<_, String>(3)?,   // e.status
            row.get::<_, String>(4)?,   // e.started_at
            row.get::<_, Option<String>>(5)?,   // e.completed_at
            row.get::<_, Option<i32>>(6)?,      // e.duration_ms
            row.get::<_, Option<i32>>(7)?,      // e.data_row_index
            row.get::<_, Option<String>>(8)?,   // e.trace_path
            row.get::<_, Option<String>>(9)?,   // e.error_message
            row.get::<_, Option<String>>(10)?,  // s.id (step)
            row.get::<_, Option<String>>(11)?,  // s.execution_id
            row.get::<_, Option<String>>(12)?,  // s.action_id
            row.get::<_, Option<String>>(13)?,  // s.status (step)
            row.get::<_, Option<String>>(14)?,  // s.started_at (step)
            row.get::<_, Option<String>>(15)?,  // s.completed_at (step)
            row.get::<_, Option<i32>>(16)?,     // s.duration_ms (step)
            row.get::<_, Option<String>>(17)?,  // s.screenshot_path
            row.get::<_, Option<String>>(18)?,  // s.log_output
            row.get::<_, Option<String>>(19)?,  // s.error_message (step)
        ))
    })
    .map_err(|e| format!("Failed to query archive data: {}", e))?;

    // Group steps by execution
    let mut current_execution: Option<serde_json::Value> = None;
    let mut steps: Vec<serde_json::Value> = Vec::new();

    for row in rows {
        let (
            exec_id, script_id, kernel_id, status, started_at, completed_at,
            duration_ms, data_row_index, trace_path, error_message,
            step_id, step_exec_id, action_id, step_status, step_started,
            step_completed, step_duration, screenshot_path, log_output, step_error
        ) = row.map_err(|e| format!("Row error: {}", e))?;

        // Check if we're on a new execution
        if current_execution.is_none() || {
            let current = current_execution.as_ref().unwrap();
            current["id"] != exec_id
        } {
            // Save previous execution if exists
            if let Some(exec) = current_execution.take() {
                let mut exec_with_steps = exec;
                exec_with_steps["steps"] = serde_json::to_value(&steps).unwrap();
                executions.push(exec_with_steps);
                steps.clear();
            }

            // Create new execution
            current_execution = Some(serde_json::json!({
                "id": exec_id,
                "script_id": script_id,
                "kernel_id": kernel_id,
                "status": status,
                "started_at": started_at,
                "completed_at": completed_at,
                "duration_ms": duration_ms,
                "data_row_index": data_row_index,
                "trace_path": trace_path,
                "error_message": error_message,
            }));
        }

        // Add step if exists
        if let Some(sid) = step_id {
            steps.push(serde_json::json!({
                "id": sid,
                "execution_id": step_exec_id,
                "action_id": action_id,
                "status": step_status,
                "started_at": step_started,
                "completed_at": step_completed,
                "duration_ms": step_duration,
                "screenshot_path": screenshot_path,
                "log_output": log_output,
                "error_message": step_error,
            }));
        }
    }

    // Don't forget the last execution
    if let Some(exec) = current_execution {
        let mut exec_with_steps = exec;
        exec_with_steps["steps"] = serde_json::to_value(&steps).unwrap();
        executions.push(exec_with_steps);
    }

    archive_data.insert("executions".to_string(), serde_json::to_value(executions).unwrap());
    archive_data.insert("archived_at".to_string(), serde_json::to_value(now()).unwrap());
    archive_data.insert("cutoff_date".to_string(), serde_json::to_value(cutoff_str).unwrap());

    // Write to archive file
    let archive_json = serde_json::to_string_pretty(&archive_data)
        .map_err(|e| format!("Failed to serialize archive: {}", e))?;

    std::fs::write(&archive_path, archive_json)
        .map_err(|e| format!("Failed to write archive file: {}", e))?;

    info!(
        "Archived {} executions and {} execution steps to {}",
        executions_archived, execution_steps_archived, archive_path
    );

    Ok(serde_json::to_value(ArchiveStats {
        executions_archived,
        execution_steps_archived,
        archive_path,
    }).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn delete_archived_executions(older_than_days: i32) -> Result<serde_json::Value, String> {
    info!("Deleting archived executions older than {} days", older_than_days);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let cutoff_date = chrono::Utc::now() - chrono::Duration::days(older_than_days as i64);
    let cutoff_str = cutoff_date.to_rfc3339();

    let where_clause = format!("started_at < '{}'", cutoff_str);

    // Begin transaction
    let tx = conn.unchecked_transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Delete execution steps first (due to foreign key)
    let steps_deleted = tx.execute(
        &format!("DELETE FROM execution_steps WHERE execution_id IN (SELECT id FROM executions WHERE {})", where_clause),
        []
    )
    .map_err(|e| format!("Failed to delete execution steps: {}", e))?;

    // Delete executions
    let executions_deleted = tx.execute(
        &format!("DELETE FROM executions WHERE {}", where_clause),
        []
    )
    .map_err(|e| format!("Failed to delete executions: {}", e))?;

    // Commit transaction
    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    // VACUUM to reclaim space
    conn.execute("VACUUM", [])
        .map_err(|e| format!("Failed to vacuum database: {}", e))?;

    info!(
        "Deleted {} archived executions and {} execution steps",
        executions_deleted, steps_deleted
    );

    Ok(serde_json::json!({
        "executions_deleted": executions_deleted,
        "execution_steps_deleted": steps_deleted,
    }))
}

#[command]
pub async fn vacuum_database() -> Result<String, String> {
    info!("Vacuuming database");

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let db_size_before = std::fs::metadata(&db_path)
        .map(|m| m.len())
        .unwrap_or(0);

    conn.execute("VACUUM", [])
        .map_err(|e| format!("Failed to vacuum database: {}", e))?;

    let db_size_after = std::fs::metadata(&db_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let space_freed = db_size_before.saturating_sub(db_size_after);

    info!(
        "Database vacuumed. Before: {} bytes, After: {} bytes, Freed: {} bytes",
        db_size_before, db_size_after, space_freed
    );

    Ok(format!(
        "Database vacuumed successfully. Freed {} bytes ({} MB)",
        space_freed,
        space_freed / 1024 / 1024
    ))
}

// ============================================================================
// DATA ROWS CRUD
// ============================================================================

#[command]
pub async fn create_data_row(
    data_table_id: String,
    row_index: i32,
    json_data: serde_json::Value,
) -> Result<String, String> {
    info!("Creating data row for table {}", data_table_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let id = gen_id();
    let data_json = json_data.to_string();

    conn.execute(
        "INSERT INTO data_rows (id, data_table_id, row_index, json_data) VALUES (?1, ?2, ?3, ?4)",
        params![id, data_table_id, row_index, data_json]
    )
    .map_err(|e| format!("Failed to create data row: {}", e))?;

    info!("Data row created with ID: {}", id);
    Ok(id)
}

#[command]
pub async fn get_data_rows(data_table_id: Option<String>) -> Result<serde_json::Value, String> {
    info!("Fetching data rows for table {:?}", data_table_id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let rows = if let Some(tid) = data_table_id {
        let mut stmt = conn.prepare("SELECT * FROM data_rows WHERE data_table_id = ?1 ORDER BY row_index")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let result = stmt.query_map([&tid], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "data_table_id": row.get::<_, String>(1)?,
                "row_index": row.get::<_, i32>(2)?,
                "json_data": row.get::<_, String>(3)?,
            }))
        })
        .map_err(|e| format!("Failed to query data rows: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect data rows: {}", e))?;
        result
    } else {
        vec![]
    };

    Ok(serde_json::to_value(rows).map_err(|e| format!("JSON error: {}", e))?)
}

#[command]
pub async fn update_data_row(
    id: String,
    json_data: serde_json::Value,
) -> Result<(), String> {
    info!("Updating data row {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let data_json = json_data.to_string();

    conn.execute(
        "UPDATE data_rows SET json_data = ?1 WHERE id = ?2",
        params![data_json, id]
    )
    .map_err(|e| format!("Failed to update data row: {}", e))?;

    info!("Data row {} updated successfully", id);
    Ok(())
}

#[command]
pub async fn delete_data_row(id: String) -> Result<(), String> {
    info!("Deleting data row {}", id);

    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM data_rows WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete data row: {}", e))?;

    info!("Data row {} deleted successfully", id);
    Ok(())
}

// ============================================================================
// UNIT TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // Helper to create an in-memory test database with schema
    fn create_test_db() -> Connection {
        let conn = Connection::open_in_memory()
            .expect("Failed to create in-memory database");

        // Create a minimal schema for testing
        conn.execute_batch(
            "CREATE TABLE projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                version TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                sync_enabled INTEGER DEFAULT 0,
                last_sync_at TEXT
            );

            CREATE TABLE kernels (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                executable_path TEXT NOT NULL,
                version TEXT NOT NULL,
                is_compatible INTEGER DEFAULT 0,
                is_default_record INTEGER DEFAULT 0,
                is_default_agent INTEGER DEFAULT 0,
                status TEXT DEFAULT 'ACTIVE',
                added_at TEXT NOT NULL,
                last_tested_at TEXT
            );

            CREATE TABLE scripts (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                version TEXT NOT NULL,
                priority TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_executed_at TEXT,
                status TEXT DEFAULT 'DRAFT',
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );"
        ).expect("Failed to create test schema");

        conn
    }

    #[test]
    fn test_gen_id() {
        let id1 = gen_id();
        let id2 = gen_id();

        assert_ne!(id1, id2);
        assert_eq!(id1.len(), 36); // UUID v4 format
        assert!(id1.contains('-'));
    }

    #[test]
    fn test_now() {
        let timestamp = now();
        assert!(timestamp.len() > 0);
        assert!(timestamp.contains('T'));
        // chrono::Utc::now().to_rfc3339() uses +00:00 format, not Z
        assert!(timestamp.contains('+') || timestamp.contains('Z'));
    }

    #[test]
    fn test_check_chrome_version() {
        assert!(check_chrome_version("86.0.4240.198"));
        assert!(check_chrome_version("87.0.4280.88"));
        assert!(check_chrome_version("100.0.4896.127"));
        assert!(!check_chrome_version("85.0.4183.121"));
        assert!(!check_chrome_version("75.0.3770.100"));
        assert!(!check_chrome_version("invalid"));
    }

    #[test]
    fn test_check_chrome_version_edge_cases() {
        // Test minimum supported version
        assert!(check_chrome_version("86.0.0.0"));

        // Note: Current implementation only checks for 86-100
        // Versions above 100 will return false
        assert!(check_chrome_version("100.0.0.0"));
        assert!(!check_chrome_version("101.0.0.0"));
        assert!(!check_chrome_version("120.0.0.0"));

        // Test just below minimum
        assert!(!check_chrome_version("85.9.9.9"));
    }

    #[test]
    fn test_project_crud_operations() {
        let conn = create_test_db();

        // Create a project
        let id = gen_id();
        let created_at = now();
        let updated_at = created_at.clone();

        conn.execute(
            "INSERT INTO projects (id, name, version, description, created_at, updated_at, sync_enabled)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
            params![id, "Test Project", "1.0.0", "Description", created_at, updated_at]
        ).unwrap();

        // Read the project
        let mut stmt = conn.prepare("SELECT * FROM projects WHERE id = ?1").unwrap();
        let project = stmt.query_row([&id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        });

        assert!(project.is_ok());
        let (p_id, name, version) = project.unwrap();
        assert_eq!(p_id, id);
        assert_eq!(name, "Test Project");
        assert_eq!(version, "1.0.0");

        // Update the project
        conn.execute(
            "UPDATE projects SET name = ?1, version = ?2, updated_at = ?3 WHERE id = ?4",
            params!["Updated Project", "2.0.0", now(), id]
        ).unwrap();

        // Verify update
        let updated_name: String = conn
            .query_row("SELECT name FROM projects WHERE id = ?1", [&id], |row| row.get(0))
            .unwrap();
        assert_eq!(updated_name, "Updated Project");

        // Delete the project
        conn.execute("DELETE FROM projects WHERE id = ?1", [&id]).unwrap();

        // Verify deletion
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM projects WHERE id = ?1", [&id], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_kernel_crud_operations() {
        let conn = create_test_db();

        // Create kernels
        let id1 = gen_id();
        let id2 = gen_id();
        let added_at = now();

        // Compatible kernel
        conn.execute(
            "INSERT INTO kernels (id, name, executable_path, version, is_compatible, status, added_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 'ACTIVE', ?6)",
            params![id1, "Chrome 86", "/path/to/chrome86", "86.0.4240.198", 1, added_at]
        ).unwrap();

        // Incompatible kernel
        conn.execute(
            "INSERT INTO kernels (id, name, executable_path, version, is_compatible, status, added_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 'ACTIVE', ?6)",
            params![id2, "Chrome 85", "/path/to/chrome85", "85.0.4183.121", 0, added_at]
        ).unwrap();

        // Read kernels
        let mut stmt = conn.prepare("SELECT id, name, version, is_compatible FROM kernels ORDER BY name").unwrap();
        let kernels: Result<Vec<(String, String, String, bool)>, _> = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, bool>(3)?,
                ))
            })
            .unwrap()
            .collect();

        assert!(kernels.is_ok());
        let kernel_list = kernels.unwrap();
        assert_eq!(kernel_list.len(), 2);
        assert_eq!(kernel_list[0].1, "Chrome 85");
        assert_eq!(kernel_list[1].1, "Chrome 86");
        assert!(!kernel_list[0].3); // Chrome 85 is not compatible
        assert!(kernel_list[1].3);  // Chrome 86 is compatible

        // Test setting default agent
        conn.execute("UPDATE kernels SET is_default_agent = 1 WHERE id = ?1", [&id1]).unwrap();

        // Verify only one default
        let default_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM kernels WHERE is_default_agent = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(default_count, 1);

        // Delete kernel
        conn.execute("DELETE FROM kernels WHERE id = ?1", [&id2]).unwrap();
        let remaining_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM kernels", [], |row| row.get(0))
            .unwrap();
        assert_eq!(remaining_count, 1);
    }

    #[test]
    fn test_script_crud_operations() {
        let conn = create_test_db();

        // Create a project first
        let project_id = gen_id();
        conn.execute(
            "INSERT INTO projects (id, name, version, created_at, updated_at, sync_enabled)
             VALUES (?1, ?2, ?3, datetime('now'), datetime('now'), 0)",
            params![project_id, "Test Project", "1.0.0"]
        ).unwrap();

        // Create a script
        let script_id = gen_id();
        conn.execute(
            "INSERT INTO scripts (id, project_id, name, version, priority, description, created_at, updated_at, status)
             VALUES (?1, ?2, ?3, '1.0.0', 'P1', 'Test script', datetime('now'), datetime('now'), 'DRAFT')",
            params![script_id, project_id, "Login Test"]
        ).unwrap();

        // Read the script
        let mut stmt = conn.prepare("SELECT * FROM scripts WHERE id = ?1").unwrap();
        let script = stmt.query_row([&script_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(4)?,
            ))
        });

        assert!(script.is_ok());
        let (s_id, p_id, name, priority) = script.unwrap();
        assert_eq!(s_id, script_id);
        assert_eq!(p_id, project_id);
        assert_eq!(name, "Login Test");
        assert_eq!(priority, "P1");

        // Update script status
        conn.execute(
            "UPDATE scripts SET status = ?1, updated_at = datetime('now') WHERE id = ?2",
            params!["ACTIVE", script_id]
        ).unwrap();

        // Verify update
        let status: String = conn
            .query_row("SELECT status FROM scripts WHERE id = ?1", [&script_id], |row| row.get(0))
            .unwrap();
        assert_eq!(status, "ACTIVE");

        // Test foreign key constraint (cascade delete)
        conn.execute("DELETE FROM projects WHERE id = ?1", [&project_id]).unwrap();

        // Script should be deleted due to CASCADE
        let script_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM scripts WHERE id = ?1", [&script_id], |row| row.get(0))
            .unwrap();
        assert_eq!(script_count, 0);
    }

    #[test]
    fn test_timestamp_formatting() {
        let timestamp = now();
        // ISO 8601 format should have these characteristics
        assert!(timestamp.contains('T'));
        // chrono::Utc::now().to_rfc3339() uses +00:00 format, not Z
        assert!(timestamp.contains('+') || timestamp.ends_with('Z'));

        // Should be parseable by chrono
        let parsed = chrono::DateTime::parse_from_rfc3339(&timestamp);
        assert!(parsed.is_ok());
    }

    #[test]
    fn test_uuid_formatting() {
        let id = gen_id();
        // UUID v4 format: 8-4-4-4-12 hexadecimal digits
        let parts: Vec<&str> = id.split('-').collect();
        assert_eq!(parts.len(), 5);
        assert_eq!(parts[0].len(), 8);
        assert_eq!(parts[1].len(), 4);
        assert_eq!(parts[2].len(), 4);
        assert_eq!(parts[3].len(), 4);
        assert_eq!(parts[4].len(), 12);

        // All characters should be hexadecimal
        for part in parts {
            assert!(part.chars().all(|c| c.is_ascii_hexdigit()));
        }
    }
}
