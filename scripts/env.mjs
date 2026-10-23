import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export function loadEnvironment() {
  process.chdir(ROOT);
  const major = Number(process.versions.node.split(".")[0]);
  if (major !== 24) {
    console.error(
      "Newsline requires Node.js 24.x. Install the Node.js 24 LTS release, reopen your terminal, and try again.",
    );
    process.exit(1);
  }
  if (existsSync(join(ROOT, ".env"))) process.loadEnvFile(join(ROOT, ".env"));
}
