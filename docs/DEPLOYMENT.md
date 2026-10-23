# Deployment

## Included local Docker setup

From the project directory:

```bash
docker compose up --build -d
```

Open **http://localhost:3000**. Compose binds to loopback and uses a persistent named volume for `/app/data`. The provided image serves the already-built `dist/` directory. Run `npm run build` before rebuilding the Docker image after changing React source.

```bash
docker compose logs -f
docker compose down
```

`docker compose down` keeps the named data volume. Do not add `-v` unless you deliberately intend to delete the database and uploads. Docker execution was not available in the verification environment; the files are provided for deployment use.

## Hosting the full app

Choose a Node 24 host or VM/container with persistent disk storage. The app needs a continuously running Node process and a writable `data` directory. Deploying only `dist/` on a static host cannot provide authentication or persistence.

The server start command is:

```bash
node scripts/start.mjs
```

Use `HOST=0.0.0.0` when binding inside a container/platform that provides networking. Set `PORT` to the value assigned by your host. A health check is available at `/api/health`.

For HTTPS behind a reverse proxy, configure:

```dotenv
HOST=0.0.0.0
PORT=3000
DEMO_MODE=false
COOKIE_SECURE=true
APP_ORIGIN=https://news.example.com
DATABASE_PATH=/app/data/newsline.sqlite
UPLOADS_PATH=/app/data/uploads
```

Use your own real HTTPS origin. Forward the path without stripping `/api` or `/uploads`. Your proxy should terminate TLS and impose suitable request size/rate limits. Do not expose the Node development server publicly.

Use a **fresh database** for a clean non-demo launch. With demo mode disabled, the six example publisher records are still initialized, but sample stories and demo users are not created. Existing reserved demo users cannot authenticate with demo mode disabled. Create a genuine administrator:

```bash
npm run create-admin
```

In Docker, use an interactive shell/exec on the running container, for example `docker compose exec newsline npm run create-admin`, after configuring the service for non-demo mode. The CLI does not overwrite existing accounts.

## Operational considerations

- Persist the database and uploaded images together. Take consistent backups while the process is stopped, or use an SQLite-aware online backup process.
- Keep `.env` and runtime data outside version control and source archives.
- Demo recovery writes tokens to a local outbox. Production recovery returns an explicit unavailable message until an email-delivery adapter is implemented. It does not silently claim to send email.
- Configure publisher data for your organization in `server/seed.mjs` before a fresh deployment, or through a deliberate database migration.
- This version uses one SQLite connection and in-memory rate limiting. Horizontal scaling and multi-region storage require additional architecture.
- Adapt the privacy/community text to your deployment and content policies.

No hosted URL is created as part of the downloadable-source delivery.
