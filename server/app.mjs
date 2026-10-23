import http from "node:http";
import { readFile, stat, mkdir, writeFile, appendFile } from "node:fs/promises";
import { resolve, extname, sep, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase, now } from "./db.mjs";
import { categories } from "./seed.mjs";
import {
  token,
  digest,
  hashPassword,
  checkPassword,
  fail,
  string,
  email,
  password,
  number,
} from "./security.mjs";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RESERVED = [
  "demo@newsline.local",
  "editor@newsline.local",
  "admin@newsline.local",
];
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};
export async function createApp(options = {}) {
  const config = {
    database: process.env.DATABASE_PATH || join(ROOT, "data/newsline.sqlite"),
    demo: process.env.DEMO_MODE !== "false",
    secure: process.env.COOKIE_SECURE === "true",
    origin: process.env.APP_ORIGIN || "",
    outbox: process.env.MAIL_OUTBOX || join(ROOT, "data/mail-outbox.jsonl"),
    uploads: process.env.UPLOADS_PATH || join(ROOT, "data/uploads"),
    dist: join(ROOT, "dist"),
    ...options,
  };
  const db = await openDatabase(config.database, { demo: config.demo });
  const get = (sql, ...p) => db.prepare(sql).get(...p),
    all = (sql, ...p) => db.prepare(sql).all(...p),
    run = (sql, ...p) => db.prepare(sql).run(...p);
  const routes = [];
  const limits = new Map();
  let requests = 0;
  const route = (method, path, handler) =>
    routes.push({
      method,
      re: new RegExp("^" + path.replace(/:([a-z_]+)/g, "(?<$1>[^/]+)") + "/?$"),
      handler,
    });
  function throttle(key, max = 20, ms = 900000) {
    const t = Date.now();
    const old = limits.get(key);
    const entry = !old || old.until < t ? { count: 0, until: t + ms } : old;
    if (++entry.count > max)
      fail(429, "Too many attempts. Please try again later.");
    limits.set(key, entry);
  }
  function userPublic(u) {
    if (!u) return null;
    const { password, ...rest } = u;
    return {
      ...rest,
      topics: JSON.parse(u.topics),
      notifications: !!u.notifications,
      onboarded: !!u.onboarded,
    };
  }
  function auth(ctx, roles) {
    if (!ctx.user) fail(401, "Please sign in to continue.");
    if (roles && !roles.includes(ctx.user.role))
      fail(403, "You do not have permission for this action.");
    return ctx.user;
  }
  function article(ctx, id) {
    const a = get("SELECT * FROM articles WHERE id=?", number(id));
    if (
      !a ||
      (a.status !== "published" &&
        (!ctx.user ||
          (ctx.user.id !== a.author_id &&
            !["editor", "admin"].includes(ctx.user.role))))
    )
      fail(404, "Story not found.");
    return a;
  }
  function hydrate(a, uid, body = false) {
    const p = get("SELECT * FROM publishers WHERE id=?", a.publisher_id);
    const author = get("SELECT id,name,bio FROM users WHERE id=?", a.author_id);
    const saved = uid
      ? get(
          "SELECT collection_id FROM bookmarks WHERE user_id=? AND article_id=?",
          uid,
          a.id,
        )
      : null;
    const result = {
      ...a,
      publisher: p,
      author,
      read_time: Math.max(1, Math.ceil(a.body.split(/\s+/).length / 220)),
      likes: get("SELECT COUNT(*) AS n FROM likes WHERE article_id=?", a.id).n,
      comments: get(
        "SELECT COUNT(*) AS n FROM comments WHERE article_id=?",
        a.id,
      ).n,
      bookmarked: !!saved,
      collection_id: saved?.collection_id ?? null,
      liked: uid
        ? !!get(
            "SELECT 1 FROM likes WHERE user_id=? AND article_id=?",
            uid,
            a.id,
          )
        : false,
    };
    if (!body) delete result.body;
    return result;
  }
  function notify(uid, title, body, articleId = null) {
    if (get("SELECT notifications FROM users WHERE id=?", uid)?.notifications)
      run(
        "INSERT INTO notifications(user_id,title,body,article_id,created_at) VALUES(?,?,?,?,?)",
        uid,
        title,
        body,
        articleId,
        now(),
      );
  }
  function session(ctx, userId) {
    const raw = token();
    run(
      "INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)",
      digest(raw),
      userId,
      Date.now() + 7 * 86400000,
    );
    ctx.res.setHeader(
      "Set-Cookie",
      `newsline_session=${raw}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${config.secure ? "; Secure" : ""}`,
    );
  }
  function ownCollection(ctx, id) {
    if (id == null || id === "") return null;
    const n = number(id);
    if (
      !get(
        "SELECT id FROM collections WHERE id=? AND user_id=?",
        n,
        auth(ctx).id,
      )
    )
      fail(404, "Collection not found.");
    return n;
  }
  route("GET", "/api/health", () => ({ ok: true, version: "1.0.0" }));
  route("GET", "/api/meta", () => ({
    categories,
    demo: config.demo,
    languages: ["English"],
    countries: [
      "India",
      "United States",
      "United Kingdom",
      "Canada",
      "Australia",
      "Germany",
      "France",
      "United Arab Emirates",
      "Other",
    ],
  }));
  route("GET", "/api/auth/me", (ctx) => ({ user: userPublic(ctx.user) }));
  route("POST", "/api/auth/register", async (ctx) => {
    throttle("register:" + ctx.ip, 10);
    const b = ctx.body;
    const address = email(b.email);
    if (RESERVED.includes(address))
      fail(409, "That email is reserved for the local demo.");
    const name = string(b.name, "Name", 2, 70),
      pass = password(b.password);
    if (get("SELECT id FROM users WHERE email=?", address))
      fail(409, "An account with this email already exists.");
    const result = run(
      "INSERT INTO users(name,email,password,created_at) VALUES(?,?,?,?)",
      name,
      address,
      await hashPassword(pass),
      now(),
    );
    const id = Number(result.lastInsertRowid);
    session(ctx, id);
    notify(
      id,
      "Welcome to Newsline",
      "Make your reading experience yours. Choose topics and follow publishers.",
    );
    return { user: userPublic(get("SELECT * FROM users WHERE id=?", id)) };
  });
  route("POST", "/api/auth/login", async (ctx) => {
    throttle("login:" + ctx.ip, 30);
    const address = email(ctx.body.email);
    throttle("account:" + address, 15);
    const u = get("SELECT * FROM users WHERE email=?", address);
    if (
      !u ||
      (!config.demo && RESERVED.includes(address)) ||
      !(await checkPassword(
        string(ctx.body.password, "Password", 1, 128),
        u.password,
      ))
    )
      fail(401, "Email or password is incorrect.");
    session(ctx, u.id);
    return { user: userPublic(u) };
  });
  route("POST", "/api/auth/logout", (ctx) => {
    if (ctx.session) run("DELETE FROM sessions WHERE token=?", ctx.session);
    ctx.res.setHeader(
      "Set-Cookie",
      `newsline_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${config.secure ? "; Secure" : ""}`,
    );
    return { ok: true };
  });
  route("POST", "/api/auth/forgot", async (ctx) => {
    if (!config.demo)
      fail(
        503,
        "Password recovery requires an email delivery adapter. Contact the site administrator.",
      );
    throttle("reset:" + ctx.ip, 5);
    const address = email(ctx.body.email);
    const u = get("SELECT id FROM users WHERE email=?", address);
    if (u) {
      const raw = token();
      run("DELETE FROM resets WHERE user_id=?", u.id);
      run(
        "INSERT INTO resets(token,user_id,expires) VALUES(?,?,?)",
        digest(raw),
        u.id,
        Date.now() + 900000,
      );
      await mkdir(resolve(config.outbox, ".."), { recursive: true });
      await appendFile(
        config.outbox,
        JSON.stringify({
          to: address,
          subject: "Reset your Newsline password",
          token: raw,
          expires_in_minutes: 15,
          created_at: now(),
        }) + "\n",
        { mode: 0o600 },
      );
    }
    return {
      message:
        "If the account exists, a reset email was written to data/mail-outbox.jsonl. This local demo does not send external email.",
    };
  });
  route("POST", "/api/auth/reset", async (ctx) => {
    throttle("reset-use:" + ctx.ip, 20);
    const raw = string(ctx.body.token, "Reset token", 64, 64);
    const r = get(
      "SELECT * FROM resets WHERE token=? AND expires>?",
      digest(raw),
      Date.now(),
    );
    if (!r) fail(400, "This reset link is invalid or expired.");
    const hashed = await hashPassword(password(ctx.body.password));
    db.exec("BEGIN");
    try {
      run("UPDATE users SET password=? WHERE id=?", hashed, r.user_id);
      run("DELETE FROM resets WHERE user_id=?", r.user_id);
      run("DELETE FROM sessions WHERE user_id=?", r.user_id);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return { ok: true };
  });
  route("PATCH", "/api/me", (ctx) => {
    const u = auth(ctx),
      b = ctx.body;
    const topics = b.topics ?? JSON.parse(u.topics);
    if (!Array.isArray(topics) || topics.some((t) => !categories.includes(t)))
      fail(400, "Choose valid topics.");
    const theme = b.theme ?? u.theme;
    if (!["light", "dark", "sepia"].includes(theme))
      fail(400, "Invalid theme.");
    const size = Number(b.font_size ?? u.font_size);
    if (!Number.isInteger(size) || size < 14 || size > 28)
      fail(400, "Reading size must be 14–28.");
    if (b.language && b.language !== "English")
      fail(400, "This release supports English.");
    run(
      "UPDATE users SET name=?,bio=?,country=?,language=?,topics=?,theme=?,font_size=?,notifications=?,onboarded=? WHERE id=?",
      string(b.name ?? u.name, "Name", 2, 70),
      typeof b.bio === "string" ? b.bio.trim().slice(0, 500) : u.bio,
      string(b.country ?? u.country, "Country", 2, 60),
      "English",
      JSON.stringify([...new Set(topics)]),
      theme,
      size,
      b.notifications === undefined ? u.notifications : b.notifications ? 1 : 0,
      b.onboarded === undefined ? u.onboarded : b.onboarded ? 1 : 0,
      u.id,
    );
    return { user: userPublic(get("SELECT * FROM users WHERE id=?", u.id)) };
  });
  route("POST", "/api/me/password", async (ctx) => {
    const u = auth(ctx);
    if (
      !(await checkPassword(
        string(ctx.body.current_password, "Current password", 1, 128),
        u.password,
      ))
    )
      fail(400, "Current password is incorrect.");
    run(
      "UPDATE users SET password=? WHERE id=?",
      await hashPassword(password(ctx.body.password)),
      u.id,
    );
    run("DELETE FROM sessions WHERE user_id=?", u.id);
    session(ctx, u.id);
    return { ok: true };
  });
  route("GET", "/api/me/export", (ctx) => {
    const u = auth(ctx);
    return {
      profile: userPublic(u),
      bookmarks: all("SELECT * FROM bookmarks WHERE user_id=?", u.id),
      collections: all("SELECT * FROM collections WHERE user_id=?", u.id),
      follows: all("SELECT * FROM follows WHERE user_id=?", u.id),
      comments: all("SELECT * FROM comments WHERE user_id=?", u.id),
      history: all("SELECT * FROM history WHERE user_id=?", u.id),
    };
  });
  route("GET", "/api/articles", (ctx) => {
    const q = ctx.url.searchParams,
      uid = ctx.user?.id;
    let where = ["a.status='published'"],
      params = [];
    if (q.get("q")) {
      where.push(
        "(a.title LIKE ? ESCAPE '\\' OR a.excerpt LIKE ? ESCAPE '\\' OR a.body LIKE ? ESCAPE '\\')",
      );
      const term =
        "%" +
        q
          .get("q")
          .slice(0, 150)
          .replace(/[\\%_]/g, "\\$&") +
        "%";
      params.push(term, term, term);
    }
    if (q.get("category") && q.get("category") !== "All") {
      where.push("a.category=?");
      params.push(q.get("category"));
    }
    if (q.get("publisher")) {
      where.push("a.publisher_id=?");
      params.push(number(q.get("publisher")));
    }
    if (q.get("feed") === "following") {
      auth(ctx);
      where.push(
        "a.publisher_id IN (SELECT publisher_id FROM follows WHERE user_id=?)",
      );
      params.push(uid);
    }
    if (q.get("feed") === "foryou" && uid) {
      const topics = JSON.parse(ctx.user.topics);
      if (topics.length) {
        where.push("a.category IN (" + topics.map(() => "?").join(",") + ")");
        params.push(...topics);
      }
    }
    const clause = where.join(" AND ");
    const page = Math.max(
      1,
      Math.min(100000, Math.trunc(Number(q.get("page"))) || 1),
    );
    const limit = Math.max(
      1,
      Math.min(48, Math.trunc(Number(q.get("limit"))) || 12),
    );
    const sort =
      q.get("sort") === "trending"
        ? "a.views DESC,a.published_at DESC"
        : "a.published_at DESC";
    return {
      items: all(
        `SELECT a.* FROM articles a WHERE ${clause} ORDER BY ${sort} LIMIT ? OFFSET ?`,
        ...params,
        limit,
        (page - 1) * limit,
      ).map((a) => hydrate(a, uid)),
      total: get(
        `SELECT COUNT(*) AS n FROM articles a WHERE ${clause}`,
        ...params,
      ).n,
      page,
      limit,
    };
  });
  route("GET", "/api/articles/:id", (ctx) => ({
    article: hydrate(article(ctx, ctx.params.id), ctx.user?.id, true),
  }));
  route("POST", "/api/articles/:id/read", (ctx) => {
    const a = article(ctx, ctx.params.id);
    if (a.status !== "published") return { ok: true };
    if (ctx.user) {
      const h = get(
        "SELECT read_at FROM history WHERE user_id=? AND article_id=?",
        ctx.user.id,
        a.id,
      );
      if (!h || Date.now() - Date.parse(h.read_at) > 1800000)
        run("UPDATE articles SET views=views+1 WHERE id=?", a.id);
      run(
        "INSERT INTO history(user_id,article_id,read_at) VALUES(?,?,?) ON CONFLICT(user_id,article_id) DO UPDATE SET read_at=excluded.read_at",
        ctx.user.id,
        a.id,
        now(),
      );
    }
    return { ok: true };
  });
  route("PUT", "/api/articles/:id/bookmark", (ctx) => {
    const u = auth(ctx),
      a = article(ctx, ctx.params.id);
    if (a.status !== "published")
      fail(400, "Only published stories can be saved.");
    const c = ownCollection(ctx, ctx.body.collection_id);
    run(
      "INSERT INTO bookmarks(user_id,article_id,collection_id,created_at) VALUES(?,?,?,?) ON CONFLICT(user_id,article_id) DO UPDATE SET collection_id=excluded.collection_id",
      u.id,
      a.id,
      c,
      now(),
    );
    return { bookmarked: true };
  });
  route("DELETE", "/api/articles/:id/bookmark", (ctx) => {
    run(
      "DELETE FROM bookmarks WHERE user_id=? AND article_id=?",
      auth(ctx).id,
      number(ctx.params.id),
    );
    return { bookmarked: false };
  });
  route("PUT", "/api/articles/:id/like", (ctx) => {
    const a = article(ctx, ctx.params.id);
    auth(ctx);
    if (a.status !== "published")
      fail(400, "Only published stories can be liked.");
    run(
      "INSERT OR IGNORE INTO likes(user_id,article_id) VALUES(?,?)",
      ctx.user.id,
      a.id,
    );
    return { ok: true };
  });
  route("DELETE", "/api/articles/:id/like", (ctx) => {
    run(
      "DELETE FROM likes WHERE user_id=? AND article_id=?",
      auth(ctx).id,
      number(ctx.params.id),
    );
    return { ok: true };
  });
  route("GET", "/api/articles/:id/comments", (ctx) => {
    const a = article(ctx, ctx.params.id);
    return {
      items: all(
        "SELECT c.*,u.name,u.role FROM comments c JOIN users u ON u.id=c.user_id WHERE article_id=? ORDER BY c.created_at",
        a.id,
      ),
    };
  });
  route("POST", "/api/articles/:id/comments", (ctx) => {
    const u = auth(ctx),
      a = article(ctx, ctx.params.id);
    if (a.status !== "published")
      fail(400, "Comments are available for published stories.");
    throttle("comment:" + u.id, 30, 60000);
    const body = string(ctx.body.body, "Comment", 1, 2000);
    let parent = null;
    if (ctx.body.parent_id) {
      parent = number(ctx.body.parent_id);
      if (
        !get(
          "SELECT id FROM comments WHERE id=? AND article_id=?",
          parent,
          a.id,
        )
      )
        fail(400, "Reply target is not part of this story.");
    }
    const result = run(
      "INSERT INTO comments(user_id,article_id,parent_id,body,created_at) VALUES(?,?,?,?,?)",
      u.id,
      a.id,
      parent,
      body,
      now(),
    );
    const recipient = parent
      ? get("SELECT user_id FROM comments WHERE id=?", parent).user_id
      : a.author_id;
    if (recipient !== u.id)
      notify(
        recipient,
        parent ? "A new reply to your comment" : "A new comment on your story",
        u.name + ": " + body.slice(0, 100),
        a.id,
      );
    return { id: Number(result.lastInsertRowid) };
  });
  route("DELETE", "/api/comments/:id", (ctx) => {
    const u = auth(ctx),
      c = get("SELECT * FROM comments WHERE id=?", number(ctx.params.id));
    if (!c) fail(404, "Comment not found.");
    if (c.user_id !== u.id && u.role !== "admin")
      fail(403, "You can only remove your own comments.");
    run("DELETE FROM comments WHERE id=?", c.id);
    return { ok: true };
  });
  route("GET", "/api/publishers", (ctx) => ({
    items: all("SELECT * FROM publishers").map((p) => ({
      ...p,
      followers: get(
        "SELECT COUNT(*) AS n FROM follows WHERE publisher_id=?",
        p.id,
      ).n,
      stories: get(
        "SELECT COUNT(*) AS n FROM articles WHERE publisher_id=? AND status='published'",
        p.id,
      ).n,
      following: ctx.user
        ? !!get(
            "SELECT 1 FROM follows WHERE user_id=? AND publisher_id=?",
            ctx.user.id,
            p.id,
          )
        : false,
    })),
  }));
  route("PUT", "/api/publishers/:id/follow", (ctx) => {
    const u = auth(ctx),
      id = number(ctx.params.id);
    if (!get("SELECT id FROM publishers WHERE id=?", id))
      fail(404, "Publisher not found.");
    run(
      "INSERT OR IGNORE INTO follows(user_id,publisher_id) VALUES(?,?)",
      u.id,
      id,
    );
    return { following: true };
  });
  route("DELETE", "/api/publishers/:id/follow", (ctx) => {
    run(
      "DELETE FROM follows WHERE user_id=? AND publisher_id=?",
      auth(ctx).id,
      number(ctx.params.id),
    );
    return { following: false };
  });
  route("GET", "/api/collections", (ctx) => ({
    items: all(
      "SELECT c.*,(SELECT COUNT(*) FROM bookmarks b JOIN articles a ON a.id=b.article_id WHERE b.collection_id=c.id AND a.status='published') AS count FROM collections c WHERE user_id=?",
      auth(ctx).id,
    ),
  }));
  route("POST", "/api/collections", (ctx) => {
    const id = run(
      "INSERT INTO collections(user_id,name) VALUES(?,?)",
      auth(ctx).id,
      string(ctx.body.name, "Collection name", 1, 60),
    ).lastInsertRowid;
    return { id: Number(id) };
  });
  route("PATCH", "/api/collections/:id", (ctx) => {
    const id = ownCollection(ctx, ctx.params.id);
    run(
      "UPDATE collections SET name=? WHERE id=?",
      string(ctx.body.name, "Collection name", 1, 60),
      id,
    );
    return { ok: true };
  });
  route("DELETE", "/api/collections/:id", (ctx) => {
    const id = ownCollection(ctx, ctx.params.id);
    run("DELETE FROM collections WHERE id=?", id);
    return { ok: true };
  });
  route("GET", "/api/bookmarks", (ctx) => {
    const uid = auth(ctx).id;
    let clause = "",
      params = [uid];
    if (ctx.url.searchParams.get("collection")) {
      clause = " AND b.collection_id=?";
      params.push(ownCollection(ctx, ctx.url.searchParams.get("collection")));
    }
    return {
      items: all(
        "SELECT a.* FROM bookmarks b JOIN articles a ON a.id=b.article_id WHERE b.user_id=? AND a.status='published'" +
          clause +
          " ORDER BY b.created_at DESC",
        ...params,
      ).map((a) => hydrate(a, uid)),
    };
  });
  route("GET", "/api/history", (ctx) => ({
    items: all(
      "SELECT a.*,h.read_at FROM history h JOIN articles a ON a.id=h.article_id WHERE h.user_id=? AND a.status='published' ORDER BY h.read_at DESC LIMIT 100",
      auth(ctx).id,
    ).map((a) => hydrate(a, ctx.user.id)),
  }));
  route("DELETE", "/api/history", (ctx) => {
    run("DELETE FROM history WHERE user_id=?", auth(ctx).id);
    return { ok: true };
  });
  route("GET", "/api/notifications", (ctx) => ({
    items: all(
      "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
      auth(ctx).id,
    ),
    unread: get(
      "SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND read=0",
      ctx.user.id,
    ).n,
  }));
  route("PATCH", "/api/notifications", (ctx) => {
    run("UPDATE notifications SET read=1 WHERE user_id=?", auth(ctx).id);
    return { ok: true };
  });
  route("GET", "/api/studio", (ctx) => {
    const u = auth(ctx);
    let rows;
    if (ctx.url.searchParams.get("review") === "true") {
      auth(ctx, ["editor", "admin"]);
      rows = all(
        "SELECT * FROM articles WHERE status='review' ORDER BY updated_at DESC",
      );
    } else
      rows = all(
        "SELECT * FROM articles WHERE author_id=? ORDER BY updated_at DESC",
        u.id,
      );
    return {
      items: rows.map((a) => hydrate(a, u.id)),
      stats: {
        published: rows.filter((a) => a.status === "published").length,
        drafts: rows.filter((a) => a.status === "draft").length,
        views: rows.reduce((s, a) => s + a.views, 0),
      },
    };
  });
  function articleInput(ctx, old) {
    const u = auth(ctx),
      b = ctx.body;
    const status = b.status ?? old?.status ?? "draft";
    if (!["draft", "review", "published", "archived"].includes(status))
      fail(400, "Invalid story status.");
    if (
      u.role === "reader" &&
      (!["draft", "review"].includes(status) || old?.status === "published")
    )
      fail(403, "An editor must review and publish your story.");
    if (old && old.author_id !== u.id && !["editor", "admin"].includes(u.role))
      fail(403, "You can only edit your own stories.");
    if (
      old &&
      old.author_id !== u.id &&
      u.role === "editor" &&
      old.status !== "review"
    )
      fail(403, "Editors may review submitted stories.");
    const category = b.category ?? old?.category;
    if (!categories.includes(category)) fail(400, "Choose a valid category.");
    const publisher = number(b.publisher_id ?? old?.publisher_id);
    if (!get("SELECT id FROM publishers WHERE id=?", publisher))
      fail(400, "Choose a publisher.");
    const image = string(
      b.image ?? old?.image ?? "/images/city.webp",
      "Image",
      1,
      200,
    );
    if (
      !/^\/(images\/(city|technology|culture)\.webp|uploads\/[a-f0-9]{64}\.(jpg|png|webp))$/.test(
        image,
      )
    )
      fail(400, "Choose a bundled cover or upload an image.");
    return {
      title: string(b.title ?? old?.title, "Headline", 8, 180),
      excerpt: string(b.excerpt ?? old?.excerpt, "Summary", 20, 400),
      body: string(b.body ?? old?.body, "Story", 80, 50000),
      category,
      publisher,
      image,
      status,
    };
  }
  function announce(a) {
    for (const f of all(
      "SELECT user_id FROM follows WHERE publisher_id=?",
      a.publisher_id,
    )) {
      if (f.user_id !== a.author_id)
        notify(
          f.user_id,
          "A new story from " +
            get("SELECT name FROM publishers WHERE id=?", a.publisher_id).name,
          a.title,
          a.id,
        );
    }
  }
  route("POST", "/api/articles", (ctx) => {
    const u = auth(ctx);
    throttle("story:" + u.id, 30, 60000);
    const a = articleInput(ctx),
      time = now();
    const result = run(
      "INSERT INTO articles(author_id,publisher_id,title,excerpt,body,category,image,status,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      u.id,
      a.publisher,
      a.title,
      a.excerpt,
      a.body,
      a.category,
      a.image,
      a.status,
      time,
      time,
      a.status === "published" ? time : null,
    );
    const id = Number(result.lastInsertRowid);
    if (a.status === "published")
      announce(get("SELECT * FROM articles WHERE id=?", id));
    return { id };
  });
  route("PATCH", "/api/articles/:id", (ctx) => {
    const old = article(ctx, ctx.params.id),
      a = articleInput(ctx, old);
    const firstPublish = a.status === "published" && !old.published_at;
    run(
      "UPDATE articles SET publisher_id=?,title=?,excerpt=?,body=?,category=?,image=?,status=?,updated_at=?,published_at=? WHERE id=?",
      a.publisher,
      a.title,
      a.excerpt,
      a.body,
      a.category,
      a.image,
      a.status,
      now(),
      firstPublish ? now() : old.published_at,
      old.id,
    );
    if (firstPublish) {
      announce(get("SELECT * FROM articles WHERE id=?", old.id));
      if (old.author_id !== ctx.user.id)
        notify(old.author_id, "Your story has been published", a.title, old.id);
    }
    return { id: old.id };
  });
  route("DELETE", "/api/articles/:id", (ctx) => {
    const u = auth(ctx),
      a = article(ctx, ctx.params.id);
    if (u.id !== a.author_id && u.role !== "admin")
      fail(403, "Only the author or administrator can delete this story.");
    run("DELETE FROM articles WHERE id=?", a.id);
    return { ok: true };
  });
  route("POST", "/api/uploads", async (ctx) => {
    auth(ctx);
    throttle("upload:" + ctx.user.id, 15, 60000);
    const s = string(ctx.body.data, "Image", 10, 3000000);
    const match = s.match(
      /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/,
    );
    if (!match) fail(400, "Upload a PNG, JPEG, or WebP image.");
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length > 2 * 1024 * 1024)
      fail(413, "Image must be smaller than 2 MB.");
    const type = match[1];
    const valid =
      type === "png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : type === "jpeg"
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP";
    if (!valid) fail(400, "The image contents do not match its file type.");
    const filename = token() + "." + (type === "jpeg" ? "jpg" : type);
    await mkdir(config.uploads, { recursive: true });
    await writeFile(join(config.uploads, filename), bytes);
    return { url: "/uploads/" + filename };
  });
  route("GET", "/api/admin", (ctx) => {
    auth(ctx, ["admin"]);
    return {
      users: all(
        "SELECT id,name,email,role,created_at FROM users ORDER BY id DESC",
      ),
      articles: all(
        "SELECT id,title,status,author_id FROM articles ORDER BY updated_at DESC",
      ),
      stats: {
        users: get("SELECT COUNT(*) AS n FROM users").n,
        stories: get("SELECT COUNT(*) AS n FROM articles").n,
        comments: get("SELECT COUNT(*) AS n FROM comments").n,
        views: get("SELECT COALESCE(SUM(views),0) AS n FROM articles").n,
      },
    };
  });
  route("PATCH", "/api/admin/users/:id", (ctx) => {
    const u = auth(ctx, ["admin"]),
      id = number(ctx.params.id),
      role = ctx.body.role;
    if (id === u.id) fail(400, "You cannot change your own role.");
    if (!["reader", "editor", "admin"].includes(role))
      fail(400, "Invalid role.");
    if (!get("SELECT id FROM users WHERE id=?", id))
      fail(404, "User not found.");
    run("UPDATE users SET role=? WHERE id=?", role, id);
    run("DELETE FROM sessions WHERE user_id=?", id);
    return { ok: true };
  });
  route("PATCH", "/api/admin/articles/:id", (ctx) => {
    auth(ctx, ["admin"]);
    const id = number(ctx.params.id);
    if (!get("SELECT id FROM articles WHERE id=?", id))
      fail(404, "Story not found.");
    if (!["archived", "published"].includes(ctx.body.status))
      fail(400, "Invalid moderation action.");
    run(
      "UPDATE articles SET status=?,updated_at=?,published_at=COALESCE(published_at,?) WHERE id=?",
      ctx.body.status,
      now(),
      now(),
      id,
    );
    return { ok: true };
  });
  async function serveFile(res, path) {
    const info = await stat(path);
    if (!info.isFile()) return false;
    const data = await readFile(path);
    res.writeHead(200, {
      "Content-Type": MIME[extname(path)] || "application/octet-stream",
      "Content-Length": data.length,
      "Cache-Control": path.includes("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    });
    res.end(data);
    return true;
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    );
    try {
      if (++requests % 500 === 0) {
        const t = Date.now();
        for (const [k, v] of limits) if (v.until < t) limits.delete(k);
        run("DELETE FROM sessions WHERE expires<?", t);
        run("DELETE FROM resets WHERE expires<?", t);
      }
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) {
        res.setHeader("Cache-Control", "no-store");
        const ip = req.socket.remoteAddress || "unknown";
        throttle("api:" + ip, 500, 60000);
        let body = {};
        if (!["GET", "HEAD"].includes(req.method)) {
          const origin = req.headers.origin;
          const expected =
            config.origin ||
            `${config.secure ? "https" : "http"}://${req.headers.host}`;
          if (origin && origin !== expected)
            fail(403, "This origin is not allowed.");
          if (req.headers["x-newsline-client"] !== "web")
            fail(403, "Missing application request header.");
          if (
            !String(req.headers["content-type"] || "").startsWith(
              "application/json",
            )
          )
            fail(415, "Use application/json.");
          let size = 0,
            chunks = [];
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 3100000) fail(413, "Request is too large.");
            chunks.push(chunk);
          }
          try {
            body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
          } catch {
            fail(400, "Invalid JSON.");
          }
          if (!body || Array.isArray(body) || typeof body !== "object")
            fail(400, "Use a JSON object.");
        }
        const raw = String(req.headers.cookie || "")
          .split(";")
          .map((x) => x.trim())
          .find((x) => x.startsWith("newsline_session="))
          ?.slice(17);
        const hashed = raw ? digest(raw) : null;
        const user = hashed
          ? get(
              "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?",
              hashed,
              Date.now(),
            )
          : null;
        const ctx = {
          req,
          res,
          url,
          body,
          ip,
          user:
            !config.demo && user && RESERVED.includes(user.email) ? null : user,
          session: hashed,
        };
        let matched = false;
        for (const r of routes) {
          const m = url.pathname.match(r.re);
          if (req.method === r.method && m) {
            matched = true;
            ctx.params = m.groups || {};
            const data = await r.handler(ctx);
            res.writeHead(200, {
              "Content-Type": "application/json; charset=utf-8",
            });
            res.end(JSON.stringify(data));
            break;
          }
        }
        if (!matched) fail(404, "API endpoint not found.");
        return;
      }
      if (req.method !== "GET" && req.method !== "HEAD")
        fail(405, "Method not allowed.");
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        fail(400, "Invalid URL.");
      }
      if (pathname.startsWith("/uploads/")) {
        const name = pathname.slice(9);
        if (!/^[a-f0-9]{64}\.(jpg|png|webp)$/.test(name))
          fail(404, "Image not found.");
        try {
          await serveFile(res, join(config.uploads, name));
          return;
        } catch {
          fail(404, "Image not found.");
        }
      }
      const full = resolve(config.dist, "." + pathname);
      if (full !== config.dist && !full.startsWith(config.dist + sep))
        fail(403, "Forbidden.");
      try {
        if (await serveFile(res, full)) return;
      } catch {}
      if (extname(pathname)) fail(404, "File not found.");
      try {
        await serveFile(res, join(config.dist, "index.html"));
      } catch {
        fail(
          503,
          "Frontend build is missing. Run npm install and npm run build.",
        );
      }
    } catch (e) {
      if (res.headersSent) {
        res.end();
        return;
      }
      const status =
        e.status ||
        (String(e.message).includes("UNIQUE constraint") ? 409 : 500);
      if (status === 500) console.error(e);
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(
        JSON.stringify({
          error:
            status === 500
              ? "Something went wrong. Please try again."
              : status === 409 && !e.status
                ? "This item already exists."
                : e.message,
        }),
      );
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  return {
    server,
    db,
    config,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((e) => {
          db.close();
          e ? reject(e) : resolve();
        }),
      ),
  };
}
