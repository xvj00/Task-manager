# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## О проекте

**Artem List** — система управления задачами с системой баллов и наград. Две роли: `creator` (создаёт задачи, подтверждает выполнение, выдаёт баллы) и `executor` (берёт задачи, сдаёт на проверку, обменивает баллы на призы).

Стек: Laravel 11 (API, порт 8001) + React 19 + Vite 8 (порт 5173) + MySQL (XAMPP).

## Команды

### Бэкенд (`artem-list/backend`)
```bash
php artisan serve --port=8001       # запустить API сервер
php artisan migrate                 # применить миграции
php artisan migrate:fresh           # сбросить и применить заново
php artisan migrate:fresh --seed    # сбросить + заполнить тестовыми данными
php artisan route:list              # список всех API маршрутов
```

### Фронтенд (`artem-list/frontend`)
```bash
npm run dev      # запустить Vite dev сервер (127.0.0.1:5173)
npm run build    # сборка для production
npm run lint     # ESLint
```

> **Важно про IPv6**: Vite настроен с `host: '127.0.0.1'` — открывать только `http://127.0.0.1:5173`, не `localhost:5173` (Яндекс Браузер не открывает).

## Архитектура

### Бэкенд

- **Авторизация**: Laravel Sanctum (токены). `POST /api/register` — первый зарегистрированный пользователь становится `creator`, все последующие — `executor`. Роль меняется через `PUT /api/admin/users/{id}`.
- **Маршруты**: все защищённые маршруты под `auth:sanctum` в `routes/api.php`.
- **Жизненный цикл задачи**: `open` → `in_progress` (executor берёт) → `review` (executor сдаёт) → `done` / `in_progress` (creator подтверждает/отклоняет). Creator может `archive` любую задачу.
- **Баллы**: начисляются при `approve`. Хранятся в `users.balance`. Все изменения логируются в таблице `transactions` с типом `credit`/`debit`.
- **Уведомления**: кастомная таблица `notifications` (не встроенная Laravel). Создаются через `Notification::create()` внутри контроллеров. Фронтенд опрашивает каждые 30 секунд.

### Фронтенд

- **Состояние авторизации**: Zustand стор в `src/store/authStore.js` — токен в `localStorage` под ключом `al_token`. Axios интерцептор автоматически добавляет Bearer токен и редиректит на `/login` при 401.
- **Базовый URL API**: `http://localhost:8001/api` в `src/api/axios.js`.
- **Роутинг**: React Router v7. `AppLayout` оборачивает все защищённые маршруты, проверяет токен и вызывает `fetchMe()` при монтировании. Сайдбар автоматически обновляет данные пользователя (баланс) каждые 60 секунд.
- **Колокольчик уведомлений**: `src/components/common/NotificationsBell.jsx` — опрашивает `/api/notifications` каждые 30 секунд, показывает счётчик непрочитанных, дропдаун с переходом по клику.

### Схема БД (ключевые таблицы)

| Таблица | Ключевые поля |
|---|---|
| `users` | `role` (creator/executor), `balance` |
| `tasks` | `status`, `priority`, `creator_id`, `assignee_id`, `reward_points`, `category`, `rejection_reason` |
| `task_logs` | история изменений статусов |
| `transactions` | `type` (credit/debit), `amount`, `task_id`, `created_by` |
| `prizes` | `cost_points`, `quantity` (-1 = неограничено), `is_active` |
| `prize_requests` | `status` (pending/approved/rejected) |
| `notifications` | `type`, `data` (JSON), `read_at` |

## Важные соглашения

- Проверка прав создателя: `$request->user()->isCreator()` — метод определён в модели `User`.
- Исполнитель видит только задачи со статусом `open` и задачи, назначенные на него (`TaskController::index`).
- `reward_points` на задаче — рекомендуемое количество баллов; creator может изменить его при подтверждении.
- Количество призов `-1` означает неограниченный запас.
- `.env` бэкенда: `DB_DATABASE=artem_list`, `APP_URL=http://localhost:8001`, `SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:5174`.
