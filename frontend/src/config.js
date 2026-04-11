/** Базовый URL API (как в axios). Переопределите через VITE_API_BASE_URL в .env */
export const apiBaseURL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api';

/** Origin бэкенда без /api — для превью вложений (img, iframe, fetch) */
export function getApiOrigin() {
  try {
    const u = new URL(apiBaseURL);
    return u.origin;
  } catch {
    return 'http://127.0.0.1:8001';
  }
}

export const APP_TITLE = 'Таск-менеджер';
