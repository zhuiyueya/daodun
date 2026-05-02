/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WECHAT_SIGN_SERVICE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
