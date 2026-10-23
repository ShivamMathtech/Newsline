# Newsline

**Your world. In perspective.**

A complete local news reader and publishing application built for Shivam Singh, inspired by the supplied **Newsline — News App UI Kit** reference. The teal-and-white interface adapts to phones, tablets and desktops. This is a responsive React web application, not an Android APK or iOS binary.

## Start on Windows — no build required

1. Install **Node.js 24.x** from [nodejs.org](https://nodejs.org/). Close and reopen your terminal after installing.
2. Extract this entire ZIP. Do not launch files inside the ZIP preview.
3. Open **START-WINDOWS.cmd** in the extracted `newsline` folder.
4. Visit **http://127.0.0.1:3000** if the browser does not open automatically.
5. Keep the terminal window open. Press **Ctrl+C** to stop.

The ZIP includes the compiled frontend in `dist/`. The backend uses Node's built-in HTTP, crypto and SQLite modules. **You do not need `npm install`, Python, MongoDB, an API key, or an internet connection to run the included build after Node is installed.**

For macOS/Linux: `bash start.sh` or `npm start` from this folder.

## Try the demo

Open **Sign in**, then choose Reader, Editor or Admin. You can also type these credentials:

| Account | Email | Password |
| --- | --- | --- |
| Reader | `demo@newsline.local` | `Newsline@123` |
| Editor | `editor@newsline.local` | `Newsline@123` |
| Administrator | `admin@newsline.local` | `Newsline@123` |

You may create a separate account through the registration form. New accounts are readers.

**Content note:** The default edition contains 16 fictional sample stories, six fictional publishers and three bundled AI-generated editorial images. It does not connect to a live news provider. Use Creator studio to write and publish your own stories. No external email is sent: demo password-reset messages are written to `data/mail-outbox.jsonl`.

## Included workflows

- Accounts: registration, sign-in/out, onboarding, password change, and local password recovery.
- Feed: top stories, personalised topic feed, following feed, category filters, pagination and search.
- Publishers: profiles, follow/unfollow, and follower/story counts.
- Reader: complete articles, font size, light/dark/sepia appearance, browser read aloud, share link, likes, comments and replies.
- Reading list: save/remove stories, create/rename/delete collections, move stories between collections, and search saved stories.
- Reading history: signed-in reads, recent history and clear history.
- Notifications: welcome messages, publisher updates, comment replies and publication updates; refreshed once per minute while the app is open.
- Creator studio: create/edit drafts, upload a cover, preview, submit for review, and publish.
- Administration: account roles, review workflow, publishing, archiving and deleting stories.
- Profile/preferences: name, bio, country preference, topic interests, reading appearance, notification preference and JSON data export.
- Persistent SQLite data, HTTP API, integration tests, Windows scripts and Docker configuration.

## Roles and editorial workflow

| Role | Capabilities |
| --- | --- |
| Reader | Read and interact; create/edit own drafts; submit for review. Cannot self-publish or alter an already-published story. |
| Editor | Reader capabilities; publish own stories; review and edit submitted stories. Cannot administer roles or edit another author's already-published stories. |
| Admin | Manage account roles and all stories, including publishing, editing, archiving and deletion. Cannot demote their own account. |

The six publishers form a shared editorial workspace. A submitting writer selects a publisher; an editor reviews the submission. This release does not model separate publisher owners or paid subscriptions.

## A five-minute walkthrough

1. Sign in as Reader. Open a story and bookmark it.
2. Open Saved stories. Create a collection and choose it from the story's collection dropdown.
3. Follow a publisher. Open Following to see its stories.
4. Open Creator studio, write a headline/summary/body, and submit for review.
5. Sign out and sign in as Editor. Open Creator studio → Review queue, open the submission, and publish it.
6. Return as Reader. The published story is public and a publication notification is available.
7. Sign in as Admin to manage roles and moderate the editorial workspace.

## Edit the source

Only source development needs dependency installation:

```bash
npm ci
npm run dev
```

Development frontend: **http://localhost:4173**. API: **http://127.0.0.1:3001**. Vite proxies API and upload requests to the backend. Keep `APP_ORIGIN` unset during ordinary development.

On Windows, `SETUP-WINDOWS.cmd` installs the locked dependencies and builds the frontend; `DEV-WINDOWS.cmd` starts development mode afterward.

```bash
npm run build
npm test
npm run check
npm start
```

After changing frontend source, run `npm run build` before using the normal launcher. Backend changes need a server restart. Do not open `index.html` directly.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/` | React app, responsive CSS, components and feature pages |
| `server/app.mjs` | HTTP routes, access checks, validation and file serving |
| `server/db.mjs`, `server/schema.sql` | SQLite initialization and schema |
| `server/security.mjs` | Password hashing, tokens and validators |
| `server/seed.mjs` | Original sample stories and publisher data |
| `public/images/` | Bundled images for development and rebuilding |
| `dist/` | Ready-to-run compiled frontend |
| `scripts/` | Cross-platform startup, development and admin creation |
| `tests/` | Isolated API integration tests |
| `docs/` | Setup, architecture, API, deployment, verification and licenses |
| `data/` | Created on first run; database, uploads and local reset outbox |

## Storage and configuration

Defaults work without an `.env` file. Copy `.env.example` to `.env` to change the port or deployment settings. `data/newsline.sqlite` is created automatically and retained across restarts. The ZIP excludes development databases, QA accounts, temporary checks and `node_modules`.

Before replacing an installation, stop Newsline and back up the **entire `data` folder** and your `.env`. Keep the SQLite `-wal`/`-shm` files if present. Do not run two instances against a copied database while backing it up.

## Deployment and scope

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Use a Node host with a persistent filesystem, or Docker. Static-only hosting of `dist/` does not run the API or database.

This release is a functional local application and a maintainable starting point for hosting. It includes session security and role checks, but is not a claim of enterprise security certification or large-scale load testing. Public hosting requires HTTPS, non-demo accounts and appropriate backup/operational policies.

Not included: live news ingestion, SMTP/email delivery, OAuth, native mobile binaries, paid subscriptions, browser push, multilingual translation, publisher ownership, rich-text/Markdown rendering, offline service workers, self-service account deletion or a rich admin publisher editor. Country is a saved profile preference, not a geographic news filter. Read aloud depends on browser/OS voice support.

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for what was actually tested.
