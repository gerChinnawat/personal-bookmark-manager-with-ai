import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    // Auth0's app config has a fixed SPA callback of http://localhost:3000/callback
    // (see DECISIONS.md ADR-010) — the API runs on 3001 to free this port.
    port: 3000,
  },
})
