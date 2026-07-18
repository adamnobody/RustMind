use std::fs;
use std::path::Path;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(Path::new(&path), content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_file(from: String, to: String) -> Result<(), String> {
    fs::rename(Path::new(&from), Path::new(&to)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    fs::remove_file(Path::new(&path)).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env::temp_dir;

    #[test]
    fn round_trip_read_write() {
        let mut path = temp_dir();
        path.push("rustmind_test_round_trip.rustmind");
        let path_str = path.to_string_lossy().to_string();

        let content = r#"{"version":1,"documentName":"Test","nodes":[],"edges":[]}"#;
        write_file(path_str.clone(), content.to_string()).expect("write failed");
        let read_back = read_file(path_str.clone()).expect("read failed");
        assert_eq!(read_back, content);

        fs::remove_file(&path).ok();
    }

    #[test]
    fn read_missing_file_returns_error() {
        let result = read_file("/nonexistent/path/file.rustmind".to_string());
        assert!(result.is_err());
    }
}
