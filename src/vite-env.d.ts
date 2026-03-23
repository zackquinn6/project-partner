/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_EMAIL_REDIRECT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
