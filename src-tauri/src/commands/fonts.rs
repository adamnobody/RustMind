use std::collections::BTreeSet;

/// Перечисляет семейства системных шрифтов (уникальные, по алфавиту).
/// Сканирование системных каталогов занимает заметное время (сотни мс),
/// поэтому фронтенд вызывает команду один раз и кэширует результат.
#[tauri::command]
pub fn list_system_fonts() -> Vec<String> {
    let mut db = fontdb::Database::new();
    db.load_system_fonts();

    // BTreeSet: дедупликация (у семейства много начертаний) + сортировка.
    let families: BTreeSet<String> = db
        .faces()
        .filter_map(|face| face.families.first().map(|(name, _)| name.clone()))
        .collect();

    families.into_iter().collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn returns_sorted_unique_families() {
        let fonts = list_system_fonts();
        // На desktop-системе шрифты есть всегда; проверяем инварианты списка.
        let mut sorted = fonts.clone();
        sorted.sort();
        sorted.dedup();
        assert_eq!(fonts, sorted);
    }
}
