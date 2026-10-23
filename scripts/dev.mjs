import { loadEnvironment, ROOT } from "./env.mjs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
loadEnvironment();
const vite = join(ROOT, "node_modules/vite/bin/vite.js");
if (!existsSync(vite)) {
  console.error("Development dependencies are missing. Run npm ci first.");
  process.exit(1);
}
const children = [];
children.push(
  spawn(process.execPath, [join(ROOT, "server/index.mjs")], {
    stdio: "inherit",
    env: { ...process.env, PORT: "3001", HOST: "127.0.0.1" },
  }),
);
children.push(
  spawn(process.execPath, [vite, "--host", "0.0.0.0", "--port", "4173"], {
    stdio: "inherit",
    env: process.env,
  }),
);
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  for (const c of children) c.kill();
  setTimeout(() => process.exit(code), 150).unref();
}
for (const c of children) {
  c.on("error", (e) => {
    console.error(e);
    close(1);
  });
  c.on("exit", (code) => close(code || 0));
}
process.on("SIGINT", () => close());
process.on("SIGTERM", () => close());
