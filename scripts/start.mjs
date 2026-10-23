import { loadEnvironment, ROOT } from "./env.mjs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
loadEnvironment();
if (!existsSync(join(ROOT, "dist/index.html"))) {
  console.error(
    "The frontend build is missing. Run npm install, then npm run build.",
  );
  process.exit(1);
}
const { createApp } = await import("../server/app.mjs");
const port = Number(process.env.PORT || 3000),
  host = process.env.HOST || "127.0.0.1";
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT must be between 1 and 65535.");
  process.exit(1);
}
const app = await createApp();
app.server.listen(port, host, () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`\nNewsline is ready: ${url}\n`);
  console.log(
    app.config.demo
      ? "Local demo accounts: demo@newsline.local, editor@newsline.local, admin@newsline.local\nPassword: Newsline@123"
      : "Demo accounts disabled. Use npm run create-admin if this is a fresh database.",
  );
  console.log("\nKeep this window open. Press Ctrl+C to stop.");
  if (process.argv.includes("--open")) {
    let child;
    if (process.platform === "win32")
      child = spawn("cmd.exe", ["/c", "start", "", url], {
        stdio: "ignore",
        windowsHide: true,
      });
    else
      child = spawn(
        process.platform === "darwin" ? "open" : "xdg-open",
        [url],
        { stdio: "ignore" },
      );
    child.on("error", () => console.log("Open the URL above in your browser."));
    child.unref();
  }
});
app.server.on("error", (e) => {
  console.error(
    e.code === "EADDRINUSE"
      ? `Port ${port} is already used. Close the other Newsline window, or set PORT=3002 in .env.`
      : e,
  );
  process.exit(1);
});
let closing = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    app.close().then(() => process.exit(0));
  });
