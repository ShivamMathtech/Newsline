# Verification report

Verified on **23 October 2026** with **Node.js v24.19.0** on Linux and the managed Chromium browser.

## Completed checks

| Check | Result |
| --- | --- |
| React/Vite production build | Passed |
| Backend syntax checks | Passed |
| API integration suite | 16 passed, 0 failed |
| ZIP CRC integrity and per-file SHA-256 manifest | Passed |
| Extracted release in a directory containing spaces | Passed |
| Launch with no `node_modules` | Passed |
| Compiled HTML, JavaScript, CSS and local image serving | Passed |
| Demo sign-in through the extracted release | Passed |
| Collection creation and bookmark persistence through extracted release | Passed |

## Integration coverage

The tests create temporary SQLite databases and make real HTTP requests. They cover:

1. Public feed, full-text matching, category filters, pagination and static output.
2. Registration validation, password hashing and session cookie behavior.
3. Unauthenticated writes, role restrictions, hostile origins and missing client headers.
4. Persisted preferences and personalized feeds.
5. Idempotent publisher follows and filtered following feed.
6. Collection ownership, unique bookmarks, moves and unfiling after collection deletion.
7. Reading history and deduplicated view counts.
8. Idempotent likes and removal.
9. Comments, validated replies, plain-text storage, notifications and delete ownership.
10. Private reader drafts, review submission and editor publication.
11. Administrator restrictions and story archival/restoration.
12. Image signature validation, serving and restricted upload paths.
13. Local password-reset outbox, token expiry, single-use behavior and session revocation.
14. Password changes and data exports without password hashes.
15. Database/session/bookmark persistence after restarting the server.
16. Non-demo mode disabling reserved demo identities and local-only recovery.

Run again with `npm test` from the project folder. Tests do not use or overwrite your normal `data` folder.

## Browser checks

- Desktop home/feed, bundled editorial imagery, navigation and article reader.
- Search for "computing" returned matching stories.
- Bundled Reader sign-in showed the demo account identity.
- Saving a story made it appear in Saved stories.
- Moving that story to Weekend reads updated its collection and count.
- Creating and saving a draft made it appear in Creator studio.
- Responsive home and reader layouts checked in 390-pixel-wide browser frames.
- Responsive settings checked in a 360-pixel-wide browser frame.

The responsive check frames were temporary QA files and are excluded from the ZIP. Browser QA data is also excluded. A fresh database and demo records are generated when the delivered project first runs.

## Verification limits

Windows batch launchers were reviewed and use standard Command Prompt syntax, but were not executed on a Windows host. The same Node launcher was executed from the extracted archive on Linux with a path containing spaces. Docker configuration was provided but not executed here. Native iOS/Android devices, screen readers, load testing, browser speech output, external email, and live news feeds were not tested. External email/live feeds are not implemented integrations in this release.

## Release contents

The archive includes source, the compiled frontend, local images, package lock, setup scripts, Docker files, documentation, tests and third-party notices. It excludes runtime databases, private `.env` files, `node_modules`, temporary screenshots, generated QA pages and credentials other than the documented public demo accounts.
