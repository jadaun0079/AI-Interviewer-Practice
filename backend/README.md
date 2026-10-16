# Backend

Node.js + Express + TypeScript API with MongoDB Atlas (Mongoose) and the Claude API.

```
src/
  config/env.ts          validated settings (reads backend/.env)
  db/connect.ts          MongoDB Atlas connection
  models/index.ts        User, RefreshToken, Resume, Interview (Mongoose)
  middleware/            auth, validation, rate limits, error handler
  modules/               auth, users, resumes, interviews routes
  ai/                    Claude client, prompts, output schemas
  lib/                   errors, logger, ids, PDF text extraction
  app.ts, server.ts
```

Commands (run inside this folder): `npm run dev`, `npm run build`, `npm start`, `npm run typecheck`.
Settings: copy `.env.example` to `.env` (or run `npm run setup` in the project root).
