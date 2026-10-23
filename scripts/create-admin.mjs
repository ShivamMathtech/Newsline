import { loadEnvironment, ROOT } from "./env.mjs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { hashPassword, email, password, string } from "../server/security.mjs";
import { openDatabase, now } from "../server/db.mjs";
loadEnvironment();
const reader = createInterface({ input: stdin, output: stdout });
let db;
try {
  const name = string(
    process.env.ADMIN_NAME || (await reader.question("Administrator name: ")),
    "Name",
    2,
    70,
  );
  const address = email(
    process.env.ADMIN_EMAIL || (await reader.question("Administrator email: ")),
  );
  if (
    [
      "demo@newsline.local",
      "editor@newsline.local",
      "admin@newsline.local",
    ].includes(address)
  )
    throw new Error("Choose an email other than a reserved demo account.");
  let pass = process.env.ADMIN_PASSWORD;
  if (!pass) {
    reader.close();
    if (!stdin.isTTY)
      throw new Error(
        "Use an interactive terminal or supply ADMIN_PASSWORD in the environment.",
      );
    stdout.write("Password (10+ characters, hidden): ");
    pass = await new Promise((resolve, reject) => {
      let input = "";
      stdin.setRawMode(true);
      stdin.resume();
      const handle = (chunk) => {
        for (const ch of chunk.toString()) {
          if (ch === "\r" || ch === "\n") {
            stdin.off("data", handle);
            stdin.setRawMode(false);
            stdin.pause();
            stdout.write("\n");
            resolve(input);
            return;
          }
          if (ch === "\u0003") {
            stdin.setRawMode(false);
            stdin.pause();
            reject(new Error("Cancelled."));
            return;
          }
          if (ch === "\u007f" || ch === "\b") {
            input = input.slice(0, -1);
            continue;
          }
          if (ch >= " ") input += ch;
        }
      };
      stdin.on("data", handle);
    });
  }
  password(pass);
  db = await openDatabase(
    process.env.DATABASE_PATH || join(ROOT, "data/newsline.sqlite"),
    { demo: false },
  );
  if (db.prepare("SELECT id FROM users WHERE email=?").get(address))
    throw new Error(
      "This email already has an account. Use the existing administrator to change its role.",
    );
  db.prepare(
    "INSERT INTO users(name,email,password,role,onboarded,created_at) VALUES(?,?,?,?,1,?)",
  ).run(name, address, await hashPassword(pass), "admin", now());
  console.log("Administrator created.");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  reader.close();
  db?.close();
}
