import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.mjs";
import { digest } from "../server/security.mjs";
let app,
  root,
  url,
  reader,
  editor,
  admin,
  second,
  readerId,
  storyId,
  collectionId,
  commentId;
class Client {
  constructor() {
    this.cookie = "";
  }
  async request(path, method = "GET", body, extra = {}) {
    const r = await fetch(url + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Newsline-Client": "web",
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const cookie = r.headers.get("set-cookie");
    if (cookie) this.cookie = cookie.split(";")[0];
    return { status: r.status, data: await r.json(), headers: r.headers };
  }
  async login(address) {
    const r = await this.request("/auth/login", "POST", {
      email: address,
      password: "Newsline@123",
    });
    assert.equal(r.status, 200, r.data.error);
    return r.data.user;
  }
}
const newStory = {
  title: "A practical perspective on city design",
  excerpt:
    "A carefully written example of a community story submitted by a reader.",
  body: "A reader can share an original story with the local community. This paragraph is long enough to satisfy the application’s editorial validation.\n\nA second paragraph adds useful context for a thoughtful review.",
  category: "World",
  publisher_id: 1,
  image: "/images/city.webp",
  status: "draft",
};
before(async () => {
  root = await mkdtemp(join(tmpdir(), "newsline-test-"));
  app = await createApp({
    database: join(root, "app.sqlite"),
    outbox: join(root, "mail.jsonl"),
    uploads: join(root, "uploads"),
    demo: true,
  });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  url = "http://127.0.0.1:" + app.server.address().port;
  reader = new Client();
  editor = new Client();
  admin = new Client();
  second = new Client();
});
after(async () => {
  await app.close();
  await rm(root, { recursive: true, force: true });
});
test("public feed, search, categories and production static output", async () => {
  const c = new Client();
  let r = await c.request("/articles");
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 16);
  assert.equal(r.data.items.length, 12);
  assert.equal(r.data.items[0].is_demo, 1);
  assert.equal(r.data.items[0].body, undefined);
  r = await c.request("/articles?q=computing");
  assert.ok(r.data.total > 0);
  assert.ok(r.data.total < 16);
  r = await c.request("/articles?q=%25");
  assert.equal(r.data.total, 0);
  r = await c.request("/articles?page=1.8&limit=3.9");
  assert.equal(r.status, 200);
  assert.equal(r.data.page, 1);
  assert.equal(r.data.items.length, 3);
  r = await c.request("/articles?category=Technology");
  assert.ok(r.data.items.every((a) => a.category === "Technology"));
  assert.equal((await fetch(url + "/")).status, 200);
  assert.match(
    (await fetch(url + "/")).headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
  assert.equal((await fetch(url + "/missing.png")).status, 404);
});
test("registration, validation, session cookie and password storage", async () => {
  let r = await reader.request("/auth/register", "POST", {
    name: "Test Reader",
    email: "reader@example.com",
    password: "Testing1234!",
  });
  assert.equal(r.status, 200, r.data.error);
  readerId = r.data.user.id;
  assert.equal(r.data.user.role, "reader");
  assert.equal(r.data.user.password, undefined);
  assert.match(r.headers.get("set-cookie"), /HttpOnly/);
  const stored = app.db
    .prepare("SELECT password FROM users WHERE id=?")
    .get(readerId).password;
  assert.ok(!stored.includes("Testing1234!"));
  assert.equal((await reader.request("/auth/me")).data.user.id, readerId);
  r = await second.request("/auth/register", "POST", {
    name: "Other Reader",
    email: "other@example.com",
    password: "Testing1234!",
  });
  assert.equal(r.status, 200);
  r = await new Client().request("/auth/register", "POST", {
    name: "x",
    email: "bad",
    password: "short",
  });
  assert.equal(r.status, 400);
  r = await new Client().request("/auth/register", "POST", {
    name: "New Person",
    email: "reader@example.com",
    password: "Testing1234!",
  });
  assert.equal(r.status, 409);
});
test("unauthenticated writes, forbidden origins, and missing client headers are blocked", async () => {
  const c = new Client();
  assert.equal(
    (await c.request("/collections", "POST", { name: "No auth" })).status,
    401,
  );
  assert.equal(
    (
      await reader.request(
        "/collections",
        "POST",
        { name: "CSRF" },
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await reader.request(
        "/collections",
        "POST",
        { name: "CSRF" },
        { "X-Newsline-Client": "" },
      )
    ).status,
    403,
  );
  assert.equal((await reader.request("/admin")).status, 403);
  assert.equal(
    (await reader.request("/me", "PATCH", { topics: ["not a real category"] }))
      .status,
    400,
  );
});
test("preferences persist and filter the personalised feed", async () => {
  let r = await reader.request("/me", "PATCH", {
    topics: ["Technology"],
    country: "India",
    theme: "sepia",
    font_size: 22,
    onboarded: true,
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.font_size, 22);
  r = await reader.request("/articles?feed=foryou");
  assert.ok(r.data.items.every((a) => a.category === "Technology"));
  assert.equal(
    (await reader.request("/me", "PATCH", { font_size: 100 })).status,
    400,
  );
});
test("publisher follows are idempotent and drive the following feed", async () => {
  await reader.request("/publishers/1/follow", "PUT", {});
  await reader.request("/publishers/1/follow", "PUT", {});
  const r = await reader.request("/articles?feed=following");
  assert.ok(r.data.items.length > 0);
  assert.ok(r.data.items.every((a) => a.publisher_id === 1));
  const p = (await reader.request("/publishers")).data.items.find(
    (p) => p.id === 1,
  );
  assert.equal(p.followers, 1);
  assert.equal(p.following, true);
});
test("private collections, bookmarks, moves and deletion keep ownership intact", async () => {
  let r = await reader.request("/collections", "POST", { name: "Weekend" });
  assert.equal(r.status, 200);
  collectionId = r.data.id;
  assert.equal(
    (
      await second.request("/collections/" + collectionId, "PATCH", {
        name: "Stolen",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await second.request("/articles/1/bookmark", "PUT", {
        collection_id: collectionId,
      })
    ).status,
    404,
  );
  await reader.request("/articles/1/bookmark", "PUT", {
    collection_id: collectionId,
  });
  await reader.request("/articles/1/bookmark", "PUT", {
    collection_id: collectionId,
  });
  assert.equal((await reader.request("/bookmarks")).data.items.length, 1);
  assert.equal((await second.request("/bookmarks")).data.items.length, 0);
  await reader.request("/collections/" + collectionId, "DELETE", {});
  r = await reader.request("/bookmarks");
  assert.equal(r.data.items[0].collection_id, null);
});
test("read history deduplicates views and can be cleared", async () => {
  const before = app.db
    .prepare("SELECT views FROM articles WHERE id=1")
    .get().views;
  await reader.request("/articles/1/read", "POST", {});
  await reader.request("/articles/1/read", "POST", {});
  assert.equal(
    app.db.prepare("SELECT views FROM articles WHERE id=1").get().views,
    before + 1,
  );
  assert.equal((await reader.request("/history")).data.items.length, 1);
  await reader.request("/history", "DELETE", {});
  assert.equal((await reader.request("/history")).data.items.length, 0);
});
test("likes are idempotent and removable", async () => {
  await reader.request("/articles/1/like", "PUT", {});
  await reader.request("/articles/1/like", "PUT", {});
  let r = await reader.request("/articles/1");
  assert.equal(r.data.article.likes, 1);
  assert.equal(r.data.article.liked, true);
  await reader.request("/articles/1/like", "DELETE", {});
  assert.equal((await reader.request("/articles/1")).data.article.likes, 0);
});
test("comments, replies, stored text, notifications, and delete authorization", async () => {
  const text = '<script>alert("x")</script> A thoughtful comment';
  let r = await reader.request("/articles/1/comments", "POST", { body: text });
  assert.equal(r.status, 200);
  commentId = r.data.id;
  assert.equal(
    (await second.request("/comments/" + commentId, "DELETE", {})).status,
    403,
  );
  r = await second.request("/articles/1/comments", "POST", {
    body: "A reply from a different reader.",
    parent_id: commentId,
  });
  assert.equal(r.status, 200);
  assert.equal(
    (
      await second.request("/articles/2/comments", "POST", {
        body: "Invalid parent",
        parent_id: commentId,
      })
    ).status,
    400,
  );
  assert.equal(
    (await reader.request("/articles/1/comments")).data.items[0].body,
    text,
  );
  assert.ok(
    (await reader.request("/notifications")).data.items.some((n) =>
      n.title.includes("reply"),
    ),
  );
  await reader.request("/notifications", "PATCH", {});
  assert.equal((await reader.request("/notifications")).data.unread, 0);
});
test("reader draft is private and cannot bypass review; editor publishes it", async () => {
  let r = await reader.request("/articles", "POST", {
    ...newStory,
    status: "published",
  });
  assert.equal(r.status, 403);
  r = await reader.request("/articles", "POST", newStory);
  assert.equal(r.status, 200, r.data.error);
  storyId = r.data.id;
  assert.equal(
    (await new Client().request("/articles/" + storyId)).status,
    404,
  );
  assert.equal(
    (
      await second.request("/articles/" + storyId, "PATCH", {
        ...newStory,
        title: "Stolen article title",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await reader.request("/articles/" + storyId, "PATCH", {
        ...newStory,
        status: "review",
      })
    ).status,
    200,
  );
  await editor.login("editor@newsline.local");
  assert.ok(
    (await editor.request("/studio?review=true")).data.items.some(
      (a) => a.id === storyId,
    ),
  );
  r = await editor.request("/articles/" + storyId, "PATCH", {
    status: "published",
  });
  assert.equal(r.status, 200, r.data.error);
  assert.equal(
    (await new Client().request("/articles/" + storyId)).status,
    200,
  );
  assert.ok(
    (await reader.request("/notifications")).data.items.some(
      (n) => n.title === "Your story has been published",
    ),
  );
  assert.equal(
    (
      await reader.request("/articles/" + storyId, "PATCH", {
        ...newStory,
        status: "draft",
      })
    ).status,
    403,
  );
});
test("administrator roles and moderation are restricted and enforced", async () => {
  await admin.login("admin@newsline.local");
  assert.equal((await editor.request("/admin")).status, 403);
  const adminUser = (await admin.request("/auth/me")).data.user;
  assert.equal(
    (
      await admin.request("/admin/users/" + adminUser.id, "PATCH", {
        role: "reader",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await admin.request("/admin/articles/" + storyId, "PATCH", {
        status: "archived",
      })
    ).status,
    200,
  );
  assert.equal(
    (await new Client().request("/articles/" + storyId)).status,
    404,
  );
  assert.equal(
    (
      await admin.request("/admin/articles/" + storyId, "PATCH", {
        status: "published",
      })
    ).status,
    200,
  );
});
test("image uploads validate bytes and serve only allowed filenames", async () => {
  let r = await reader.request("/uploads", "POST", {
    data:
      "data:image/png;base64," +
      Buffer.from("not a png file").toString("base64"),
  });
  assert.equal(r.status, 400);
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=";
  r = await reader.request("/uploads", "POST", {
    data: "data:image/png;base64," + png,
  });
  assert.equal(r.status, 200);
  const asset = await fetch(url + r.data.url);
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get("content-type"), "image/png");
  assert.equal((await fetch(url + "/uploads/schema.sql")).status, 404);
});
test("password reset writes only to the local outbox, expires and is single use", async () => {
  const c = new Client();
  const r = await c.request("/auth/forgot", "POST", {
    email: "other@example.com",
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.token, undefined);
  const mail = JSON.parse(
    (await readFile(join(root, "mail.jsonl"), "utf8")).trim(),
  );
  assert.equal(mail.to, "other@example.com");
  const reset = await c.request("/auth/reset", "POST", {
    token: mail.token,
    password: "FreshPassword123!",
  });
  assert.equal(reset.status, 200);
  assert.equal((await second.request("/auth/me")).data.user, null);
  assert.equal(
    (
      await c.request("/auth/reset", "POST", {
        token: mail.token,
        password: "AnotherPassword123!",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await c.request("/auth/login", "POST", {
        email: "other@example.com",
        password: "FreshPassword123!",
      })
    ).status,
    200,
  );
  await c.request("/auth/forgot", "POST", { email: "other@example.com" });
  const expired = JSON.parse(
    (await readFile(join(root, "mail.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .at(-1),
  );
  app.db
    .prepare("UPDATE resets SET expires=0 WHERE token=?")
    .run(digest(expired.token));
  assert.equal(
    (
      await c.request("/auth/reset", "POST", {
        token: expired.token,
        password: "AnotherPassword123!",
      })
    ).status,
    400,
  );
});
test("password change revokes other sessions and export never includes hashes", async () => {
  const other = new Client();
  await other.request("/auth/login", "POST", {
    email: "reader@example.com",
    password: "Testing1234!",
  });
  assert.equal(
    (
      await reader.request("/me/password", "POST", {
        current_password: "wrong",
        password: "ChangedPassword123!",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await reader.request("/me/password", "POST", {
        current_password: "Testing1234!",
        password: "ChangedPassword123!",
      })
    ).status,
    200,
  );
  assert.equal((await other.request("/auth/me")).data.user, null);
  const data = (await reader.request("/me/export")).data;
  assert.equal(data.profile.password, undefined);
  assert.ok(Array.isArray(data.bookmarks));
  assert.equal(data.profile.id, readerId);
});
test("data persists after restarting the server", async () => {
  await app.close();
  app = await createApp({
    database: join(root, "app.sqlite"),
    outbox: join(root, "mail.jsonl"),
    uploads: join(root, "uploads"),
    demo: true,
  });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  url = "http://127.0.0.1:" + app.server.address().port;
  assert.equal((await reader.request("/auth/me")).data.user.id, readerId);
  assert.equal((await reader.request("/bookmarks")).data.items.length, 1);
  assert.equal((await reader.request("/articles")).data.total, 17);
});
test("production mode disables reserved demo accounts and local password recovery", async () => {
  await app.close();
  app = await createApp({ database: join(root, "app.sqlite"), demo: false });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  url = "http://127.0.0.1:" + app.server.address().port;
  assert.equal((await admin.request("/auth/me")).data.user, null);
  assert.equal(
    (
      await new Client().request("/auth/login", "POST", {
        email: "admin@newsline.local",
        password: "Newsline@123",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await new Client().request("/auth/forgot", "POST", {
        email: "reader@example.com",
      })
    ).status,
    503,
  );
});
