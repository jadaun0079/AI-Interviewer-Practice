<<<<<<< HEAD
# AI Interviewer Practice (MongoDB Atlas edition)

Students sign up, upload their resume as a **PDF**, and take a **voice interview**. The AI reads the resume, asks questions out loud, listens to the spoken answers (speech is converted to text in the browser), rates every answer from 1 to 10 and finishes with a report and a 7-day study plan.

## Folder layout

```
AI-Interviewer-Practice/
  backend/     Everything for the server (Node.js, Express, TypeScript, MongoDB Atlas, Claude API)
  frontend/    Everything for the website (React, TypeScript, Vite, browser speech)
  scripts/     setup.js: creates backend/.env for you
  demo/        Old single-file demo (only works inside a claude.ai artifact)
  package.json Root shortcuts: install everything, run both apps with one command
```

## Quick start (Windows, macOS, Linux)

Requirements: Node.js 20 or newer, a MongoDB Atlas cluster, an Anthropic API key.

Run these in a terminal opened in the `AI-Interviewer-Practice` folder:

```
npm install        # installs the root tools, backend and frontend dependencies
npm run setup      # creates backend/.env with a fresh JWT secret
```

Open `backend/.env` and fill in two values:

```
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@your-cluster.xxxxx.mongodb.net/
ANTHROPIC_API_KEY=your-key
```

Then start everything:

```
npm run dev        # backend on :4000 and frontend on :5173 in one terminal
```

Open http://localhost:5173 in Chrome, Edge or Safari, create an account, upload a PDF and start the interview.

### MongoDB Atlas checklist
1. **Database Access**: create a database user and password.
2. **Network Access**: add your current IP address (use `0.0.0.0/0` only while testing).
3. **Connect -> Drivers**: copy the connection string into `MONGODB_URI`. Remove the `< >` brackets. If the password contains special characters such as `@ : / ?`, URL-encode them.

The app stores its data in a database called `ai_interviewer` (change with `MONGODB_DB`). Collections: `users`, `refreshtokens`, `resumes`, `interviews` (answers are stored inside each interview). Indexes are created automatically on startup.

## How the interview works
1. **Login first.** Every page except login and sign-up needs an account.
2. **Upload a PDF.** The backend extracts the text (or paste text instead).
3. **Choose** role, difficulty, type, number of questions and voice language (English India/US or Hindi).
4. **Questions come from the resume.** The AI refers to the projects, tools and experience it finds there.
5. **The browser speaks each question**, then listens. Your answer is submitted after 4 seconds of silence, or press Submit.
6. **The AI rates each answer** (score, strengths, fixes, ideal answer) and says the feedback out loud.
7. **Final report** with the overall score, weak topics, resume tips and a 7-day plan.

## API summary (`/api/v1`)

| Endpoint | Success | Error status codes |
|---|---|---|
| `POST /auth/signup` | 201 | 409, 422, 429 |
| `POST /auth/login` | 200 | 401, 403 (locked), 422, 429 |
| `POST /auth/refresh` | 200 | 401, 403 (token reuse) |
| `POST /auth/logout` | 204 | |
| `GET, PATCH /users/me` | 200 | 401, 404, 422 |
| `POST /resumes` (PDF), `POST /resumes/text` | 201 | 401, 402, 413, 415, 422 |
| `GET /resumes`, `GET, DELETE /resumes/:id` | 200 / 204 | 400, 401, 404 |
| `POST /interviews` | 201 | 401, 402, 404, 422, 429, 502, 504 |
| `GET /interviews`, `GET /interviews/:id` | 200 | 400, 401, 404 |
| `POST /interviews/:id/answer` | 201 | 404, 409, 422, 429, 502, 504 |
| `POST /interviews/:id/finish` | 200 | 404, 409, 502, 504 |
| `GET /interviews/:id/report` | 200 | 404, 409 |
| `DELETE /interviews/:id` | 204 | 400, 401, 404 |
| `GET /health`, `GET /ready` | 200 | 503 |

All responses use `{ success, data, meta }` or `{ success: false, error: { code, message, details }, meta }`.

## Security notes
- **Never commit `backend/.env`.** It is already in `.gitignore`. Put real secrets only there.
- Passwords are hashed with bcrypt; login locks for 15 minutes after 5 wrong tries; refresh tokens rotate and are stored hashed; every query is filtered by the logged-in user.
- Resume and answer text is treated as data, never as instructions to the AI.
- If you ever paste a database password or API key into a chat, a screenshot or a public repo, rotate it right away.

## What was tested
The backend has been run against a MongoDB-compatible database with a stand-in for the AI (57 automated API checks: signup, login, lockout, token rotation and reuse detection, PDF upload, interview creation, answers, double-submit protection, report, other-user access, plan limit, error codes). The frontend compiles and builds.
Not tested: the real MongoDB Atlas cluster, the real Claude API, and the browser voice features (they need a real microphone).

## Not included yet
Email verification and password reset, Google login, admin panel, payments, background job queue, automated test files in the repo, OCR for scanned PDFs.

## License
MIT
=======
# AI-Interviewer-Practice
>>>>>>> 4f745b6cb0cd020560d49840901d84a7f9bf4ad8
