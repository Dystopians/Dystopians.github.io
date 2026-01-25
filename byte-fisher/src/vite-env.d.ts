/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  turnstile?: {
    render: (element: HTMLElement, options: Record<string, unknown>) => string;
    reset: (widgetId?: string) => void;
    getResponse: (widgetId?: string) => string;
    remove: (widgetId?: string) => void;
  };
}
