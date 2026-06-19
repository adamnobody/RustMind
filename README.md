# RustMind

Редактор интеллект-карт, схем и блок-схем (аналог Xmind) на базе Tauri 2.x, React, TypeScript и React Flow.

## Технологический стек

- **Бэкенд:** Tauri 2.x (Rust)
- **Фронтенд:** React 18 + TypeScript (strict mode) + Vite
- **Холст и связи:** React Flow (`@xyflow/react`)
- **Состояние:** Zustand (с middleware `immer` и `persist`)
- **Авто-расположение:** Dagre
- **Стилизация:** CSS Modules + clsx
- **Тестирование:** Vitest + React Testing Library

## Структура папок

Проект организован по методологии Feature-Sliced Design (FSD):
- `src-tauri/` — Rust бэкенд и Tauri-команды
- `src/app/` — Инициализация приложения, провайдеры, глобальные роуты и лэйауты
- `src/features/` — Изолированные бизнес-фичи (canvas, nodes, edges, layout, toolbar, persistence)
- `src/store/` — Глобальные Zustand-сторы
- `src/shared/` — Переиспользуемый UI-кит, хуки, утилиты и типы
- `tests/` — Интеграционные и юнит-тесты

## Команды

```bash
# Запуск в режиме разработки
npm run tauri dev

# Сборка приложения
npm run tauri build

# Запуск тестов
npm test
```
