import type { ChatPosition } from '@/shared/types/settings';

const SETTINGS_KEY = 'fw_settings';

export interface AppSettings {
  sidebarExpanded: boolean;
  chatPosition: ChatPosition;
  selectedChannelId: string | null;
  // Сюда в будущем можно добавить theme: 'light' | 'dark', volume: number и т.д.
}

const DEFAULT_SETTINGS: AppSettings = {
  sidebarExpanded: true,
  chatPosition: 'standard',
  selectedChannelId: null,
};

export const StorageService = {
  getSettings(): AppSettings {
    const items = localStorage.getItem(SETTINGS_KEY);

    if (!items) {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      const settings = JSON.parse(items);

      return { ...DEFAULT_SETTINGS, ...settings };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    const settings = this.getSettings();
    console.log({ settings, key });
    return settings[key];
  },

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    const settings = this.getSettings();
    settings[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  update(updates: Partial<AppSettings>): void {
    const settings = this.getSettings();
    const newSettings = { ...settings, ...updates };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  },
};
