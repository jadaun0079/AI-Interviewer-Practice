# Frontend

React + TypeScript + Vite. In development, requests to `/api` are proxied to the backend on port 4000.

```
src/
  main.tsx, App.tsx      routes and page shell
  auth.tsx               login state (access token in memory, refresh cookie)
  api.ts                 API client with automatic token refresh
  speech.ts              browser text-to-speech and speech recognition
  pages/                 AuthPage, Dashboard, Interview, Report
  styles.css
```

Commands (run inside this folder): `npm run dev`, `npm run build`, `npm run preview`.
Voice needs Chrome, Edge or Safari and microphone permission.
