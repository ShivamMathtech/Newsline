# Windows setup and troubleshooting

## Normal launch

Install the **Node.js 24.x Windows x64 installer** from the official Node.js website. Extract the ZIP to a writable directory, for example `G:\major_projects\newsline`. Then double-click `START-WINDOWS.cmd`.

The launcher changes to its own directory, so a path containing spaces works. A browser window should open at `http://127.0.0.1:3000`. The application writes its database and uploaded covers to `data` inside the extracted project folder.

No database server needs to be installed. The provided frontend is already built, and all article images are local.

## Useful commands

Open Command Prompt in the extracted `newsline` folder:

```bat
node --version
node scripts\start.mjs
```

For source editing:

```bat
npm ci
npm run dev
```

Open `http://localhost:4173` in development mode. To update the normal runnable build:

```bat
npm run build
```

## Common issues

| Symptom | Fix |
| --- | --- |
| Window closes or `node` is not recognized | Install Node.js 24.x, then reopen the terminal and launcher. |
| Node version message | Use Node 24.x; this release intentionally checks its supported major version. |
| `ERR_UNKNOWN_BUILTIN_MODULE` / SQLite module error | An old Node executable is being used. Run `where node` and `node --version`; remove the old PATH entry or select Node 24. |
| Port 3000 is already used | Close the other Newsline terminal, or copy `.env.example` to `.env` and change `PORT=3002`. Open the URL printed by the launcher. |
| Browser does not open | Manually open `http://127.0.0.1:3000` while the terminal remains running. |
| JSON says frontend build is missing | Restore `dist/` from the ZIP, or run `npm ci` and `npm run build`. |
| Blank page after opening an HTML file | Use the launcher and HTTP URL; do not double-click `index.html`. |
| `vite` is not recognized | Run `npm ci` before development. The ready-to-run launcher does not require Vite. |
| npm network errors | Internet is needed for development dependency installation. Retry on a working connection or run the included compiled build instead. |
| Rollup platform error | Remove an old `node_modules` copied from another OS and run `npm ci` on Windows. This ZIP does not include `node_modules`. |
| `This origin is not allowed` | Keep `APP_ORIGIN` unset for normal local use; when set, it must exactly match the browser origin, including protocol and port. Do not mix `localhost` and `127.0.0.1` if an origin is pinned. |
| Read aloud is unavailable or silent | Check browser/OS speech voices and output volume. Try Chrome or Edge. Some voices require a network connection. |
| Password reset did not send an email | Demo recovery intentionally writes to `data\mail-outbox.jsonl`. Open it locally and paste the latest token into the reset form within 15 minutes. |
| Data appears missing | Run the same extracted folder; each folder has its own `data` directory unless `DATABASE_PATH` points elsewhere. |

## Back up your work

Stop the terminal with Ctrl+C before copying the complete `data` folder and `.env`. Restore that folder into the same project location before restarting. Never overwrite a working data folder with another installation's files without a backup.

## Administrator for a non-demo installation

Use a new database path, set `DEMO_MODE=false`, then run:

```bat
npm run create-admin
```

The CLI asks for name, email and a hidden password. Start the app normally afterward. Reserved demo addresses cannot be used for this account. Use the UI to create other accounts, and the administrator screen to promote editors.
