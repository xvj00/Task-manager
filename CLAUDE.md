# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## О проекте

**Artem List** — система управления задачами с системой баллов и наград.

Роли пользователей:
- `admin` — администратор системы (первый зарегистрированный). Управляет пользователями, балансами, призами.
- `user` — обычный пользователь. Может создавать проекты, задачи, выполнять задачи, получать баллы.

Проектные роли (в pivot-таблице `project_user`): `owner`, `editor`, `member`.

Стек: Laravel 11 (API, порт 8001) + React 19 + Vite 8 (порт 5173) + MySQL (XAMPP).

## Команды

### Бэкенд (`artem-list/backend`)
```bash
php artisan serve --host=127.0.0.1 --port=8001   # запустить API сервер
php artisan migrate                               # применить миграции
php artisan migrate:fresh                         # сбросить и применить заново
php artisan migrate:fresh --seed                  # сбросить + заполнить тестовыми данными
php artisan route:list                            # список всех API маршрутов
php artisan storage:link                          # симлинк для файлов (нужно один раз)
```

### Фронтенд (`artem-list/frontend`)
```bash
npm run dev      # запустить Vite dev сервер (127.0.0.1:5173)
npm run build    # сборка для production
npm run lint     # ESLint
```

> **Важно про IPv6**: Vite настроен с `host: '127.0.0.1'` — открывать только `http://127.0.0.1:5173`, не `localhost:5173` (Яндекс Браузер может не открыть). Laravel сервер тоже запускать с `--host=127.0.0.1`.

## Архитектура

### Бэкенд

- **Авторизация**: Laravel Sanctum (токены). `POST /api/register` — первый зарегистрированный пользователь становится `admin`, все последующие — `user`. Роль меняется через `PUT /api/admin/users/{id}`.
- **Проверка прав**: `$request->user()->isAdmin()` — метод в модели `User`. Устаревший алиас `isCreator()` сохранён для обратной совместимости.
- **Маршруты**: все защищённые маршруты под `auth:sanctum` в `routes/api.php`.
- **Жизненный цикл задачи**: `open` → `in_progress` (берут задачу) → `review` (сдают на проверку) → `done` / `in_progress` (подтверждают/отклоняют). Admin может `archive` любую задачу.
- **Баллы**: начисляются при `approve`. Хранятся в `users.balance`. Все изменения логируются в таблице `transactions` с типом `credit`/`debit`.
- **Уведомления**: кастомная таблица `notifications` (не встроенная Laravel). Создаются через `Notification::create()`. Фронтенд опрашивает каждые 30 секунд.

### Проекты и папки

- **Папки**: `folders` + `folder_user` pivot (роли: owner/editor/member). Содержат проекты.
- **Проекты**: `projects` + `project_user` pivot (роли: owner/editor/member). Создатель = owner.
- **Приглашение**: по `username` (`POST /api/projects/{id}/invite`) или по ссылке (`invite_token` UUID).
- **Вступление по ссылке**: `POST /api/projects/join/{token}`.

### Фронтенд

- **Состояние авторизации**: Zustand стор в `src/store/authStore.js` — токен в `localStorage` под ключом `al_token`. Axios интерцептор автоматически добавляет Bearer токен и редиректит на `/login` при 401.
- **Базовый URL API**: `http://127.0.0.1:8001/api` в `src/api/axios.js`.
- **Роутинг**: React Router v7. `AppLayout` оборачивает все защищённые маршруты. Сайдбар обновляет данные пользователя каждые 60 секунд.
- **Колокольчик уведомлений**: `src/components/common/NotificationsBell.jsx` — опрашивает `/api/notifications` каждые 30 секунд.

### Схема БД (ключевые таблицы)

| Таблица | Ключевые поля |
|---|---|
| `users` | `role` (admin/user), `username`, `balance` |
| `folders` | `owner_id` |
| `folder_user` | `folder_id`, `user_id`, `role` (owner/editor/member) |
| `projects` | `folder_id` (nullable), `owner_id`, `invite_token` (UUID) |
| `project_user` | `project_id`, `user_id`, `role` (owner/editor/member) |
| `tasks` | `status`, `priority`, `creator_id`, `assignee_id`, `reward_points`, `project_id` |
| `subtasks` | `task_id`, `title`, `is_done`, `order` |
| `task_comments` | `task_id`, `user_id`, `content` |
| `task_attachments` | `task_id`, `user_id`, `filename`, `original_name`, `file_size` |
| `transactions` | `type` (credit/debit), `amount`, `task_id`, `created_by` |
| `prizes` | `cost_points`, `quantity` (-1 = неограничено), `is_active` |
| `prize_requests` | `status` (pending/approved/rejected) |
| `notifications` | `type`, `data` (JSON), `read_at` |

## Важные соглашения

- Количество призов `-1` означает неограниченный запас.
- `reward_points` на задаче — рекомендуемое количество баллов; можно изменить при подтверждении.
- Исполнитель видит задачи со статусом `open` и задачи, назначенные на него.
- Файловые вложения хранятся в `storage/app/public/attachments/`, доступны через `/storage/attachments/` (после `artisan storage:link`).
- `.env` бэкенда: `DB_DATABASE=artem_list`, `APP_URL=http://127.0.0.1:8001`, `SANCTUM_STATEFUL_DOMAINS=127.0.0.1:5173`.
