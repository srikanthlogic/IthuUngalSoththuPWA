/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTO_REFRESH_INTERVAL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}