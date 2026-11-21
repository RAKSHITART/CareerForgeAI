# CareerForge AI

A career-prep app built on one rule: **never put anything on a resume that the candidate cannot back up.**

You build a profile once (picking skills from a catalog, not typing them). Paste or upload a job description and the app compares it with your *verified* profile. It then tailors a resume by reordering and highlighting what is true, lets you practise interviews, builds roadmaps for the skills you lack, and tracks your applications.

Stack: Next.js 14 (App Router) · TypeScript · Tailwind · Prisma + SQLite · Zod · docx.

## Quick start

```bash
cp .env.example .env        # then edit it (see below)
npm install
npm run setup               # prisma generate + create the SQLite database
npm run dev                 # http://localhost:3000
```

Optional demo data: `npm run prisma:seed` creates `alex@careerforge.ai` / `password123`. To show a one-click demo button on the login page set `NEXT_PUBLIC_DEMO_LOGIN=true`. **Never enable the demo account on a public server.**

Upgrading from an older copy? The schema gained a password-reset table and a session version column. Run `npm run setup` once; your existing data is kept.

### Configuration (`.env`)

| Variable | Needed | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | SQLite file, default `file:./dev.db` |
| `JWT_SECRET` | **production** | 32+ random characters (`openssl rand -hex 32`). The app refuses to start in production without it. |
| `APP_URL` | production | Used in password-reset links |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | optional | Live AI for job-description reading and interview feedback. Without a key the built-in engine runs. Check Google's docs for a current model id; the default is `gemini-flash-latest`. If the model id is rejected the server logs a warning once and falls back to the built-in engine. |
| `SMTP_*`, `MAIL_FROM` | production | Sends password-reset emails. Without SMTP, **in development only**, the reset link is shown on screen and printed to the server console. |

`.env` is git-ignored. Never share it or put it in a zip.

## What it does

- **Skills catalog (266 skills, with aliases).** Search or browse by category and tap to add. `ReactJS`, `React.js` and `react` are one skill; `Postgres` is `PostgreSQL`; `k8s` is `Kubernetes`. Custom skills are allowed (and flagged), with "did you mean" suggestions for typos. Skills record a proficiency level plus evidence (project, coursework, work, note). A skill rated Intermediate or higher with no evidence is treated as *unverified*.
- **Profile wizard.** Starts empty, validates every step with the same schemas the server uses, saves atomically (no duplicates), and restores unsaved progress. The Profile page shows a strength checklist and links to each section.
- **JD analyzer.** Paste or upload (.pdf/.docx/.txt). Section-aware required vs. preferred detection. Analyses are saved, recomputed against your *current* profile, and can be re-run after you improve it. Scores are estimates, not employer or ATS decisions.
- **Resume builder.** Builds immediately for any job, even when you lack some of its skills. A "Skills this job asks for" panel then lets you confirm, one by one, the ones you genuinely have (you choose the level; it is saved to your profile). Six templates (default: a Google-style single column) that look the same in the preview and the Word file, optional photo, inline editing, "use my original wording", style choices that persist, duplicate and compare, Word export, print to PDF. The server re-audits every save: skills not in your profile are removed, levels are capped to what you recorded, "Just started" skills appear only as "currently learning".
- **Check an existing resume.** Upload or paste your current resume; see claims that contradict your profile and add missing skills in one tap.
- **Mock interviews.** A continuous conversation: the interviewer speaks each question, listens, treats a pause as the end of your answer, reacts, asks a follow-up when your answer is weak, scores every answer, and offers more questions or your report at the end. Typing is available as a fallback. Questions come from the job's skills, your skills and your projects. **Proper scoring (judging whether your answers are correct) needs a Gemini key**; without one the app uses an offline key-point check and says so. Use *Settings → Test AI connection* to verify your key.
- **Skill growth.** Roadmaps by skill category, respecting current and target level. Adding a skill to your profile is capped by roadmap progress (30% minimum; 100% plus a written description unlocks Intermediate).
- **Job tracker.** Board with follow-up and interview dates; reminders appear in notifications.
- **Account.** Forgot/reset password by emailed link, change password (signs out other devices), data export, delete with password.

## Security notes

Passwords are bcrypt-hashed; sessions are signed, HTTP-only cookies tied to a per-user version that changes on password change; login, registration, reset and AI endpoints are rate-limited (in memory, so use Redis if you run several instances); every API route is scoped to the signed-in user and checks ownership of linked records; AI prompts treat pasted text as quoted data. Review `next.config.mjs` security headers before deploying behind your own proxy.

## Tests

```bash
npm test          # 93 tests: catalog, matching, tailoring audit, route security, Word export, parsing, validation, interview engine, voice logic, modal typing
npm run typecheck
```

## Known limits

- The matcher compares *named skills*. It cannot judge the depth of your experience.
- Scanned (image-only) PDFs cannot be read; paste the text instead.
- Learning links point to official documentation home pages and a few free courses. They are suggestions and are not checked automatically.
- Email verification at sign-up is not implemented.
- SQLite is fine for one server; move to Postgres for multi-instance deployments.
