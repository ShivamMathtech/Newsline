import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { hashPassword } from "./security.mjs";
import { publishers, stories } from "./seed.mjs";
export const now = () => new Date().toISOString();
export async function openDatabase(path, { demo = true } = {}) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  const run = (sql, ...p) => db.prepare(sql).run(...p);
  if (!db.prepare("SELECT id FROM publishers LIMIT 1").get()) {
    for (const p of publishers)
      run(
        "INSERT INTO publishers(name,slug,initials,color,description,category) VALUES(?,?,?,?,?,?)",
        ...p,
      );
  }
  if (
    demo &&
    !db.prepare("SELECT value FROM app_meta WHERE key='demo_seeded'").get()
  ) {
    const hash = await hashPassword("Newsline@123");
    db.exec("BEGIN");
    try {
      const people = [
        ["Alex Morgan", "demo@newsline.local", "reader"],
        ["Jamie Chen", "editor@newsline.local", "editor"],
        ["Newsline Admin", "admin@newsline.local", "admin"],
      ];
      for (const [name, email, role] of people)
        run(
          "INSERT INTO users(name,email,password,role,onboarded,topics,created_at) VALUES(?,?,?,?,1,?,?)",
          name,
          email,
          hash,
          role,
          JSON.stringify(["Technology", "World", "Culture"]),
          now(),
        );
      const author = db
        .prepare("SELECT id FROM users WHERE email='editor@newsline.local'")
        .get().id;
      for (let i = 0; i < stories.length; i++) {
        const [
          title,
          excerpt,
          category,
          image,
          publisher,
          paragraphs,
          featured,
        ] = stories[i];
        const published = new Date(Date.now() - i * 3600000).toISOString();
        run(
          "INSERT INTO articles(author_id,publisher_id,title,excerpt,body,category,image,status,featured,is_demo,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
          author,
          publisher,
          title,
          excerpt,
          paragraphs.join("\n\n"),
          category,
          `/images/${image}.webp`,
          "published",
          featured ? 1 : 0,
          1,
          published,
          published,
          published,
        );
      }
      const reader = db
        .prepare("SELECT id FROM users WHERE email='demo@newsline.local'")
        .get().id;
      run(
        "INSERT INTO collections(user_id,name) VALUES(?,?)",
        reader,
        "Weekend reads",
      );
      run("INSERT INTO follows(user_id,publisher_id) VALUES(?,?)", reader, 2);
      run(
        "INSERT INTO notifications(user_id,title,body,created_at) VALUES(?,?,?,?)",
        reader,
        "A fresh perspective starts here",
        "Welcome to Newsline. Explore a story, follow a publisher, or build your reading list.",
        now(),
      );
      run("INSERT INTO app_meta(key,value) VALUES('demo_seeded','1')");
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return db;
}
