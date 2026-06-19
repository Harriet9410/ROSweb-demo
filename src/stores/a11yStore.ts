import { create } from 'zustand';
import type { Locale } from '../i18n';

interface AccessibilityState {
  locale: Locale;
  highContrast: boolean;
  setLocale: (locale: Locale) => void;
  toggleHighContrast: () => void;
  setHighContrast: (v: boolean) => void;
}

const STORED_KEY = 'mrrep-accessibility';

function loadStored(): Partial<AccessibilityState> {
  try {
    const raw = localStorage.getItem(STORED_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function store(state: { locale: Locale; highContrast: boolean }) {
  try { localStorage.setItem(STORED_KEY, JSON.stringify(state)); } catch {}
}

const stored = loadStored();

export const useA11yStore = create<AccessibilityState>((set, get) => ({
  locale: (stored as any).locale || 'en',
  highContrast: (stored as any).highContrast || false,
  setLocale: (locale) => {
    set({ locale });
    store({ locale, highContrast: get().highContrast });
  },
  toggleHighContrast: () => {
    const highContrast = !get().highContrast;
    set({ highContrast });
    store({ locale: get().locale, highContrast });
  },
  setHighContrast: (v) => {
    set({ highContrast: v });
    store({ locale: get().locale, highContrast: v });
  },
}));
