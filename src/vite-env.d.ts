/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_ADMIN_APP_URL?: string;
  readonly VITE_IO_API_BASE_URL?: string;
  readonly VITE_ENABLE_SODA_COHORT?: string;
  readonly VITE_HCAPTCHA_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
