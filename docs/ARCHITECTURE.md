# Architecture

## Runtime

A React 19 SPA is built with Vite 7. Its compiled assets are served by a Node.js 24 HTTP server. All application data is in SQLite through `node:sqlite`. The production server imports only Node built-ins, so the packaged build runs without `node_modules`.

The SPA uses hash URLs so links work without special reverse-proxy rewrites. The API is same-origin under `/api`; uploaded covers are served under `/uploads`. Development mode runs Vite on 4173 and the API on 3001 with a proxy. Production mode serves both through one process on 3000 by default.

## Data model

- `users`: password hash, role, profile and preferences.
- `sessions`: hashed opaque session tokens and expiration timestamps.
- `resets`: hashed single-use password-reset tokens and expiration timestamps.
- `publishers`, `articles`: shared editorial sources and story lifecycle.
- `follows`, `likes`, `bookmarks`: unique user/entity relationships.
- `collections`: private reading-list groupings; deletion unfiles bookmarks.
- `comments`: article comments with validated parent references and cascade deletion of replies.
- `history`: one recent read timestamp per user/story.
- `notifications`: in-app events controlled by a user's notification preference.
- `app_meta`: one-time seed marker.

The initial schema is recorded with SQLite `user_version=1`. This release initializes an empty database and does not include migrations from another application's schema. Use explicit versioned migrations when evolving deployed databases.

## Security design

Passwords use scrypt with random salts and constant-time comparison. Session values are random 256-bit tokens; only hashes are stored. The HTTP-only cookie has a seven-day lifetime and SameSite=Lax. Enable its Secure flag for HTTPS deployments. Password changes revoke other sessions; recovery revokes all existing sessions.

Unsafe requests require JSON and the `X-Newsline-Client: web` header. Browser Origin is checked against the configured application origin or direct request host. There is no cross-origin API allowance. Roles and ownership are checked on the server; frontend controls are only a convenience.

SQL queries use bound parameters. User article/comment text is rendered as React text, not HTML. The production response includes CSP, frame denial and nosniff headers. Uploads accept bounded PNG/JPEG/WebP content with file-signature checks, randomized filenames and a restricted serving path. Uploaded content is public and is not a private document store.

Rate limits are in-memory and scoped to the running instance. Database writes are synchronous and short; this is designed for a small single-node deployment. Place a reverse proxy in front of public deployments for shared rate limiting, body limits, HTTPS and operational logging. File signatures are checked, but malware scanning and image decode/re-encoding are not included.

## Editorial lifecycle

Readers create a draft and submit it as `review`. Editors can review submissions and publish them. An editor can maintain their own published articles, while another author's published article requires an administrator to change. Readers cannot self-publish or modify a published article. Administrators can moderate all records and change other users' roles.

The first publication through the editor workflow notifies followers who have enabled updates and the submitting author. Admin archival/restoration is moderation and does not send a fresh publishing notification. Deletion cascades related bookmarks, reactions, comments and notifications.

## Counts

No popularity values are fabricated. Likes and followers count actual stored rows. Views count signed-in reading events with a 30-minute deduplication window per user/article. Clearing a user's history removes that deduplication record; it does not decrease an article's aggregate view count. Guest reads do not increment views. "Most read" uses recorded views and recency as a tie-breaker.

## Source entry points

- `src/App.jsx`: shell, global context and route selection.
- `src/lib.jsx`: API wrapper, query hook and route helpers.
- `src/pages/Feed.jsx`: feeds, search and publishers.
- `src/pages/Reader.jsx`: reader, comments and article controls.
- `src/pages/Account.jsx`: collections, settings, profile and history.
- `src/pages/Studio.jsx`: drafting, review and administration.
- `server/app.mjs`: endpoint implementation and HTTP boundary.

External news feeds, email providers, payments, OAuth and browser push are extension points, not mocked working integrations.
