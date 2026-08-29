import { defineBoot } from '#q-app/wrappers';

// Создаем наш кастомный логгер
const createLogger = (isEnabled: boolean) => {
  // Если логи выключены, возвращаем пустые функции
  if (!isEnabled) {
    return {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {},
    };
  }

  return {
    log: (...args: unknown[]) => console.log('[APP LOG]:', ...args),
    warn: (...args: unknown[]) => console.warn('[APP WARN]:', ...args),
    error: (...args: unknown[]) => console.error('[APP ERROR]:', ...args),
    info: (...args: unknown[]) => console.info('[APP INFO]:', ...args),
  };
};

export const logger = createLogger(Boolean(process.env.ENABLE_LOGS));

export default defineBoot(({ app }) => {
  // Делаем логгер доступным глобально в шаблонах Vue 3 (опционально)
  app.config.globalProperties.$logger = logger;
});
