#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:planner.db", vec![tauri_plugin_sql::Migration {
                    version: 1,
                    description: "initial schema",
                    sql: include_str!("../migrations/0001_init.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                }])
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
