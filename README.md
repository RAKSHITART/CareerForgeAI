# CareerForge AI

A career preparation web app for students and early-career developers. You build a profile once, paste or upload a job description, and the app compares the job with what you can actually back up. It then builds a resume for that job, runs a spoken mock interview for the role, and tracks your applications.

The one rule behind the design: **nothing goes on a resume unless the candidate can defend it.** Skills carry a proficiency level and evidence. Skills you do not have are never added for you. When a job asks for something you lack, you are asked to confirm it yourself, at the level you choose.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Demo account](#demo-account)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [How the main parts work](#how-the-main-parts-work)
- [Testing](#testing)
- [Security](#security)
- [Deployment notes](#deployment-notes)
- [Known limits](#known-limits)
- [Not built yet](#not-built-yet)

## Features

**Profile and skills**
- Step-by-step profile wizard (personal details, education, skills, projects, experience, certificates, resume style). It starts empty, validates each step, saves in one transaction, and restores unsaved progress.
- Skills catalog of 266 skills with aliases, so `ReactJS`, `React.js` and `react` are one skill. Pick from the catalog by search or category. Custom skills are allowed and flagged, with "did you mean" suggestions for typos.
- Every skill has a level (Not familiar to Expert) and evidence (used in a project, coursework, work, or a written note). A skill rated Intermediate or higher with no evidence is treated as unverified.

**Job description analyzer**
- Paste a job description or upload a PDF, DOCX or TXT file.
- Reads required and preferred skills (section aware), minimum degree and years of experience. Uses a built-in rule engine, or Gemini when a key is configured.
- Compares the job with your verified profile and explains each result: matched, needs evidence, learning, missing.
- Analyses are saved, and re-run against your current profile whenever you open them.

**Resume builder**
- Builds a resume for a specific job in one step. Only the skills and projects that job calls for are shown. Everything else stays in your profile and is one click away under "Left off for this job".
- A "Skills this job asks for" panel lists what the job wants that you have not listed. You choose which ones you really have and at what level. Confirmed skills are saved to your profile.
- Six templates that look the same in the browser preview and in the Word file (Google style, classic serif, modern, technical fresher, experienced professional, compact one page). Optional photo.
- Edit any line in place, or switch a line back to your original wording.
- Export to Word (.docx), or print to PDF from the browser.
- Every save is re-checked on the server: skills that are not in your profile are removed and levels are capped to what you recorded.
- Check an existing resume: upload or paste it and see claims that contradict your profile.

**Mock interviews**
- A spoken conversation. The interviewer reads each question aloud, listens, treats a pause as the end of your answer, reacts, asks a follow-up when the answer is weak, and scores each answer. Typing is available as a fallback.
- Questions are specific to the role. Question banks exist for eleven role families (test engineer, data analyst, data scientist, full stack, frontend, backend, DevOps, system engineer, Java developer, business analyst, software engineer). Your own skills are used only when they fit the role.
- Interview types: technical, HR, behavioural, project based (built from your own projects), and mixed. Three difficulty levels. You can ask for more questions at the end without repeats.
- A final report lists every question, your answer, the score, and what a strong answer covers.

**Everything else**
- Skill growth: roadmaps per skill with exercises, a mini project and links to official documentation. A skill is added to your profile only up to the level your progress supports.
- Job tracker: a board with applied, interview and follow-up dates. Due follow-ups appear as notifications.
- Accounts: sign up and sign in, password reset by emailed link, change password, download your data as JSON, delete your account.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite through Prisma (swap the provider for PostgreSQL in production) |
| Validation | Zod, shared between the browser and the API |
| Auth | bcrypt password hashes, signed HTTP-only session cookie |
| Documents | `docx` (Word export), `mammoth` (DOCX read), `pdf-parse` (PDF read) |
| Email | nodemailer (SMTP) |
| AI (optional) | Google Gemini over REST |
| Voice | Browser Web Speech API |
| Tests | Vitest, Testing Library, jsdom |

## Getting started

Requirements: Node.js 18.17 or newer, and an internet connection for the first install (Prisma downloads its engine).

```bash
git clone <your-repository-url>
cd <repository-folder>

cp .env.example .env      # on Windows Command Prompt: copy .env.example .env
npm install
npm run setup             # generates the Prisma client and creates the SQLite database
npm run dev
```

Open http://localhost:3000 and create an account.

`.env` can stay mostly empty for local development. See [Configuration](#configuration).

## Configuration

Copy `.env.example` to `.env`. This file is ignored by git. Never commit it.

| Variable | Needed | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite file. Default: `file:./dev.db` (stored in `prisma/`). |
| `JWT_SECRET` | In production | 32 or more random characters. Generate one with `openssl rand -hex 32`. The app refuses to start in production without it. A fixed development value is used locally. |
| `APP_URL` | In production | Public address of the app. Used in password reset links. |
| `GEMINI_API_KEY` | Optional | Enables AI scoring of interview answers and AI reading of job descriptions. |
| `GEMINI_MODEL` | Optional | Model name. Default: `gemini-flash-latest`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | In production | Sends password reset emails. Without SMTP, in development only, the reset link is shown on screen and printed to the server console. |
| `NEXT_PUBLIC_DEMO_LOGIN` | Optional | Set to `true` to show a demo sign-in button on the login page. Local use only. |

### About AI scoring

The app works without a Gemini key. Without one, interview answers are scored by an offline check that measures whether the key points and a clear structure are present. That check cannot judge whether what you said is correct, and the interview screen says so. For real evaluation, create a free key at https://aistudio.google.com, put it in `.env`, restart the server, and use **Settings, Test AI connection** to confirm it works. The test reports the exact reason when it fails (wrong key, unknown model name, quota).

## Demo account

```bash
npm run prisma:seed
```

This creates `alex@careerforge.ai` with the password `password123`, filled with a sample profile, two projects, an internship and a tracked application. Running it again resets that user only. If sign-in fails, run `npm run check:login`: it reports which database file is in use, whether the user exists, and whether the password matches.

Do not leave the demo account in a public deployment.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run setup` | Generate the Prisma client and create or update the database |
| `npm run prisma:seed` | Create the demo account |
| `npm run check:login` | Diagnose a failing sign-in |
| `npm test` | Run the test suite |
| `npm run typecheck` | TypeScript check without emitting files |
| `npm run lint` | ESLint through Next.js |

## Project structure

```
prisma/                 schema.prisma, seed.js, dev.db (local database)
scripts/                check-login.js
src/
  app/
    api/                route handlers (auth, profile, jd, resumes, interviews, learning,
                        applications, notifications, account, ai)
    dashboard/          signed-in pages (profile, skills, jd-analyzer, resumes, interviews,
                        skill-growth, job-tracker, analytics, settings)
    onboarding/         profile wizard
    login, register, forgot-password, reset-password
  components/           shared UI kit, skill picker, voice hook
  lib/                  auth, validation schemas, skills catalog, skill families, templates,
                        rate limiter, mailer
  services/
    ai/                 job description reader, skill matcher, resume tailor, interview engine
                        and role question banks, answer evaluator, learning planner, Gemini client
    documents/          Word generator, file text extraction, resume parser
  middleware.ts         redirects signed-out visitors away from the dashboard
tests/                  unit, route and component tests
```

## How the main parts work

**Skills matching.** Both the job's requirements and your skills are mapped to canonical names through the catalog, then compared. A skill counts as a verified match only when it has a recognised level above Beginner and some evidence. A technology that appears in your projects but not in your skills list is reported as "needs confirmation" rather than missing.

**Tailoring a resume.** The job's skills are mapped to a small set of skill families (for example data analytics, testing, backend). A profile skill is shown when the job names it or belongs to a family the job clearly needs. A general resume with no job keeps every skill. Projects are ordered by how many of their technologies match the job. The summary is one factual sentence built from your education and your evidence-backed skills, or your own summary if you wrote one.

**Interviews.** The engine finds the role family from the job title and draws that family's questions first, at the chosen difficulty. Skills named in the job description come next, then your own skills if they fit the role, then fundamentals. The browser handles speech: the interviewer's questions are spoken in short chunks, the microphone opens only after speech has finished, and the answer is submitted after about three seconds of silence. If the browser's speech service is unreachable or the microphone is blocked, the screen says why and switches to typing.

**Word export.** The preview and the `.docx` use the same template definitions, so section order, fonts, headings and the photo layout match. The exporter honours lines you switched back to your original wording.

## Testing

```bash
npm test
```

The suite covers the skills catalog, the job description reader, skill matching, resume tailoring and its server-side audit, Word export (including a render with a photo), file parsing for real DOCX and PDF files, validation schemas, the interview engine and role question banks, the answer evaluator, the voice hook against a mocked speech API, and route security (password reset, skill promotion limits, resume save audit). Two component tests guard against a modal stealing focus while you type, and against the interview page failing to start in React development mode.

Route tests use an in-memory stand-in for Prisma. No test needs a database or network access.

## Security

What is in place:
- Passwords hashed with bcrypt. Sessions are signed, HTTP-only cookies that carry a per-user version number, so changing a password signs out every other device.
- Password reset uses a single-use, 30-minute token. Only a hash of the token is stored.
- Login, registration, reset, upload and AI endpoints are rate limited (in memory, see the note under Deployment).
- Every API route is scoped to the signed-in user, and linked records (resume, job description) are checked for ownership.
- Request bodies are validated with Zod. Uploads are limited to 2 MB and to PDF, DOCX and TXT.
- Pasted text is passed to the AI model as quoted data, never as instructions.
- Security headers are set in `next.config.mjs`.

What is not in place: multi-factor authentication, email verification at sign-up, and an explicit CSRF origin check (cookies are same-site, and the API only accepts JSON). See [Not built yet](#not-built-yet).

## Deployment notes

- Set `JWT_SECRET`, `APP_URL` and the SMTP variables. Serve over HTTPS.
- SQLite is fine for one server process. For several instances, switch the Prisma provider to PostgreSQL and replace the in-memory rate limiter in `src/lib/rate-limit.ts` with a shared store such as Redis. The interface is one function.
- Remove the demo account and do not set `NEXT_PUBLIC_DEMO_LOGIN`.
- The microphone and speech features need a secure context. They work on `localhost` and on HTTPS, not on plain HTTP over a network.
