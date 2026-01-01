// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use log::info;

// Database commands
mod commands;
use commands::db::{
    init_database,
    create_project,
    get_projects,
    get_project,
    update_project,
    delete_project,
    create_kernel,
    get_kernels,
    update_kernel,
    delete_kernel,
    create_script,
    get_scripts,
    get_script,
    update_script,
    delete_script,
    update_script_scenarios,
    create_scenario,
    get_scenarios,
    update_scenario,
    delete_scenario,
    create_page,
    get_pages,
    update_page,
    delete_page,
    create_action,
    get_actions,
    update_action,
    delete_action,
    create_locator,
    get_locators,
    update_locator,
    delete_locator,
    create_parameter,
    get_parameters,
    update_parameter,
    delete_parameter,
    create_execution,
    get_executions,
    get_execution,
    update_execution_status,
    delete_execution,
    create_execution_step,
    get_execution_steps,
    update_execution_step_status,
    create_data_table,
    get_data_tables,
    update_data_table,
    delete_data_table,
    create_data_row,
    get_data_rows,
    update_data_row,
    delete_data_row,
    // Database pruning and archiving
    get_database_stats,
    prune_old_executions,
    archive_executions,
    delete_archived_executions,
    vacuum_database,
};

// Engine management commands
use commands::engine::{
    spawn_engine,
    stop_engine,
    stop_all_engines,
    get_running_engines,
    is_engine_running,
    get_engine_status,
    restart_engine,
    get_engine_logs,
    send_engine_command,
    detect_kernels,
    add_kernel_from_path,
    test_kernel_compatibility,
    get_platform_info,
};

// Recorder management commands
use commands::recorder::{
    get_recorder_logs,
    get_recorder_scenarios,
    recorder_action,
    clear_recorder_logs,
    clear_recorder_scenarios,
    add_recorder_log,
    get_available_port,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger
    env_logger::init();

    info!("Starting TraceForge Desktop...");

    // Initialize database
    if let Err(e) = commands::db::init_db_connection() {
        eprintln!("Failed to initialize database: {}", e);
    }

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            init_database,
            create_project,
            get_projects,
            get_project,
            update_project,
            delete_project,
            create_kernel,
            get_kernels,
            update_kernel,
            delete_kernel,
            create_script,
            get_scripts,
            get_script,
            update_script,
            delete_script,
            update_script_scenarios,
            create_scenario,
            get_scenarios,
            update_scenario,
            delete_scenario,
            create_page,
            get_pages,
            update_page,
            delete_page,
            create_action,
            get_actions,
            update_action,
            delete_action,
            create_locator,
            get_locators,
            update_locator,
            delete_locator,
            create_parameter,
            get_parameters,
            update_parameter,
            delete_parameter,
            create_execution,
            get_executions,
            get_execution,
            update_execution_status,
            delete_execution,
            create_execution_step,
            get_execution_steps,
            update_execution_step_status,
            create_data_table,
            get_data_tables,
            update_data_table,
            delete_data_table,
            create_data_row,
            get_data_rows,
            update_data_row,
            delete_data_row,
            // Database pruning and archiving
            get_database_stats,
            prune_old_executions,
            archive_executions,
            delete_archived_executions,
            vacuum_database,
            spawn_engine,
            stop_engine,
            stop_all_engines,
            get_running_engines,
            is_engine_running,
            get_engine_status,
            restart_engine,
            get_engine_logs,
            send_engine_command,
            detect_kernels,
            add_kernel_from_path,
            test_kernel_compatibility,
            get_platform_info,
            // Recorder commands
            get_recorder_logs,
            get_recorder_scenarios,
            recorder_action,
            clear_recorder_logs,
            clear_recorder_scenarios,
            add_recorder_log,
            get_available_port
        ])
        .setup(|_app| {
            info!("TraceForge Desktop initialized successfully");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to TraceForge Desktop!", name)
}
