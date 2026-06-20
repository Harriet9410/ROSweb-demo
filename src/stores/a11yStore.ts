import { create } from 'zustand';
import type { Locale } from '../i18n';

interface AccessibilityState {
  locale: Locale;
  highContrast: boolean;
  lightTheme: boolean;
  setLocale: (locale: Locale) => void;
  toggleHighContrast: () => void;
  setHighContrast: (v: boolean) => void;
  toggleLightTheme: () => void;
  setLightTheme: (v: boolean) => void;
}

const STORED_KEY = 'mrrep-accessibility';

function loadStored(): Partial<AccessibilityState> {
  try {
    const raw = localStorage.getItem(STORED_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function store(state: { locale: Locale; highContrast: boolean; lightTheme: boolean }) {
  try { localStorage.setItem(STORED_KEY, JSON.stringify(state)); } catch {}
}

const stored = loadStored();

export const useA11yStore = create<AccessibilityState>((set, get) => ({
  locale: (stored as any).locale || 'en',
  highContrast: (stored as any).highContrast || false,
  lightTheme: (stored as any).lightTheme || false,
  setLocale: (locale) => {
    set({ locale });
    store({ locale, highContrast: get().highContrast, lightTheme: get().lightTheme });
  },
  toggleHighContrast: () => {
    const highContrast = !get().highContrast;
    set({ highContrast });
    store({ locale: get().locale, highContrast, lightTheme: get().lightTheme });
  },
  setHighContrast: (v) => {
    set({ highContrast: v });
    store({ locale: get().locale, highContrast: v, lightTheme: get().lightTheme });
  },
  toggleLightTheme: () => {
    const lightTheme = !get().lightTheme;
    set({ lightTheme });
    store({ locale: get().locale, highContrast: get().highContrast, lightTheme });
  },
  setLightTheme: (v) => {
    set({ lightTheme: v });
    store({ locale: get().locale, highContrast: get().highContrast, lightTheme: v });
  },
}));
