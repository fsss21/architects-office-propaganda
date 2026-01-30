# Классический Петербург

React-приложение (React + JS + CSS Modules) на Vite. Проект о памятниках и архитектуре Санкт-Петербурга.

## Стек

- **React 18** + **React Router**
- **Vite** — сборка и dev-сервер
- **CSS Modules** — стили компонентов (`.module.css`)
- **MUI (Material UI)** — иконки

## Запуск

```bash
# Установка зависимостей
npm install

# Режим разработки
npm run dev

# Сборка для продакшена
npm run build

# Просмотр собранного приложения
npm run preview
```

После `npm run dev` откройте в браузере адрес, который выведет Vite (обычно http://localhost:5173).

## Структура

- `src/` — исходный код:
  - `App.jsx`, `main.jsx` — точка входа и роутинг
  - `components/` — переиспользуемые компоненты (Header, PhotoGallery, ProgressLine, VideoPreview)
  - `pages/` — страницы: MainMenu, SubMenu, Catalog, CatalogItem
  - `context/` — CatalogFilterContext для фильтров каталога
  - `assets/` — изображения
- `public/data/` — JSON: `catalogItems.json`, `progressPoints.json`
- Стили страниц и компонентов — в соответствующих `*.module.css`

## Маршруты

- `/` — главное меню
- `/submenu` — подменю с прогресс-линией
- `/catalog` — каталог памятников (с фильтрами и поиском)
- `/catalog/:id` — карточка памятника

## Если не ставится `npm install` (EPERM / EFTYPE / esbuild)

На Windows часто мешают антивирус и заблокированные файлы.

1. **Чистая переустановка**
   - Закройте Cursor/IDE и все терминалы в этой папке.
   - Удалите папку `node_modules` и файл `package-lock.json`.
   - Откройте PowerShell **от имени администратора**, перейдите в папку проекта и выполните:
   ```powershell
   Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
   Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
   npm install
   ```

2. **Ошибка EFTYPE при запуске `esbuild.exe`**
   - Часто антивирус (в т.ч. Windows Defender) блокирует или удаляет бинарник esbuild.
   - Добавьте папку проекта в исключения антивируса:  
     Параметры Windows → Обновление и безопасность → Безопасность Windows → Защита от вирусов → Управление настройками → Исключения → Добавить папку `D:\projects\react\architects-office-propaganda`.

3. **Альтернатива: pnpm**
   ```powershell
   npm install -g pnpm
   Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
   Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
   pnpm install
   pnpm dev
   ```
