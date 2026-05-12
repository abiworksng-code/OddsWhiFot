/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_THE_ODDS_API_KEY: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
