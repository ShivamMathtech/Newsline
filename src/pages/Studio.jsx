import { useEffect, useState } from "react";
import {
  PenLine,
  Plus,
  ArrowUpRight,
  Eye,
  Trash2,
  ImagePlus,
  Check,
  Send,
  FileText,
  Search,
  Users,
  BookOpen,
  MessageCircle,
  Save,
} from "lucide-react";
import { useApp, useQuery, send, go, ago, initials } from "../lib.jsx";
import {
  PageHead,
  QueryState,
  Empty,
  Button,
  IconButton,
  Field,
  SectionHead,
} from "../components/UI.jsx";
export function StudioPage() {
  const { user, toast } = useApp();
  const [tab, setTab] = useState("all");
  const query = useQuery("/studio" + (tab === "review" ? "?review=true" : ""));
  async function remove(id) {
    if (!confirm("Permanently delete this story and its comments?")) return;
    try {
      await send("/articles/" + id, "DELETE");
      query.reload();
      toast("Story deleted");
    } catch (e) {
      toast(e.message, "error");
    }
  }
  return (
    <>
      <PageHead
        eyebrow="CREATOR STUDIO"
        title="Your perspective matters."
        subtitle="A place to turn a little curiosity into a great story."
      >
        <a href="#/write" className="btn primary">
          <Plus size={17} />
          Write a story
        </a>
      </PageHead>
      <QueryState query={query}>
        {(d) => (
          <>
            <div className="stats-grid">
              <div>
                <BookOpen size={21} />
                <strong>{d.stats.published}</strong>
                <span>Published stories</span>
              </div>
              <div>
                <FileText size={21} />
                <strong>{d.stats.drafts}</strong>
                <span>Drafts in progress</span>
              </div>
              <div>
                <Eye size={21} />
                <strong>{d.stats.views}</strong>
                <span>Signed-in reads</span>
              </div>
            </div>
            <div className="tabs studio-tabs">
              {[
                ["all", "All stories"],
                ["published", "Published"],
                ["draft", "Drafts"],
                ...(user.role === "reader"
                  ? [["submitted", "Submitted"]]
                  : [["review", "Review queue"]]),
              ].map(([v, l]) => (
                <button
                  key={v}
                  className={tab === v ? "active" : ""}
                  onClick={() => setTab(v)}
                >
                  {l}
                </button>
              ))}
            </div>
            {d.items.filter(
              (a) =>
                tab === "all" ||
                tab === "review" ||
                a.status === (tab === "submitted" ? "review" : tab),
            ).length ? (
              <div className="studio-list">
                {d.items
                  .filter(
                    (a) =>
                      tab === "all" ||
                      tab === "review" ||
                      a.status === (tab === "submitted" ? "review" : tab),
                  )
                  .map((a) => (
                    <article key={a.id}>
                      <img src={a.image} alt="" />
                      <div>
                        <span className={"status-badge " + a.status}>
                          {a.status === "review" ? "In review" : a.status}
                        </span>
                        <h3>{a.title}</h3>
                        <span className="muted small-text">
                          {a.category} · {ago(a.updated_at)} · {a.views} reads
                          {tab === "review" ? " · " + a.author.name : ""}
                        </span>
                      </div>
                      <div className="studio-actions">
                        {a.status === "published" && (
                          <a
                            className="icon-btn"
                            aria-label="View story"
                            href={"#/article/" + a.id}
                          >
                            <Eye size={18} />
                          </a>
                        )}
                        {!(
                          user.role === "reader" && a.status === "published"
                        ) && (
                          <a className="btn secondary" href={"#/edit/" + a.id}>
                            <PenLine size={15} />
                            {tab === "review" ? "Review" : "Edit"}
                          </a>
                        )}
                        {(a.author_id === user.id || user.role === "admin") && (
                          <IconButton
                            title="Delete story"
                            onClick={() => remove(a.id)}
                          >
                            <Trash2 size={17} />
                          </IconButton>
                        )}
                      </div>
                    </article>
                  ))}
              </div>
            ) : (
              <Empty
                title={
                  tab === "review"
                    ? "The review queue is clear"
                    : "Every story starts somewhere"
                }
                text={
                  tab === "review"
                    ? "Submitted stories will appear here."
                    : "Write your first draft. You can take your time with it."
                }
                action={
                  <a className="btn primary" href="#/write">
                    <PenLine size={16} />
                    Write a story
                  </a>
                }
              />
            )}
          </>
        )}
      </QueryState>
    </>
  );
}
const EMPTY = {
  title: "",
  excerpt: "",
  body: "",
  category: "Technology",
  publisher_id: 1,
  image: "/images/city.webp",
  status: "draft",
};
export function EditorPage({ id }) {
  const { meta, user, toast } = useApp();
  const query = useQuery(id ? "/articles/" + id : "/meta");
  const publishers = useQuery("/publishers");
  const [form, setForm] = useState(EMPTY),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(false);
  useEffect(() => {
    if (id && query.data?.article) setForm(query.data.article);
  }, [id, query.data]);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const update = (key, v) => {
    setForm((p) => ({ ...p, [key]: v }));
    setDirty(true);
  };
  async function save(status) {
    setBusy(true);
    setError("");
    try {
      const d = await send(
        id ? "/articles/" + id : "/articles",
        id ? "PATCH" : "POST",
        { ...form, status },
      );
      setDirty(false);
      toast(
        status === "published"
          ? "Your story is published"
          : status === "review"
            ? "Story submitted for review"
            : "Draft saved",
      );
      go("/studio");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast("Choose an image smaller than 2 MB.", "error");
      return;
    }
    setBusy(true);
    try {
      const data = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const d = await send("/uploads", "POST", { data });
      update("image", d.url);
      toast("Cover image uploaded");
    } catch (e) {
      toast(e.message || "Could not upload image", "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <QueryState query={query}>
      {() => (
        <>
          <PageHead
            eyebrow="CREATOR STUDIO"
            title={id ? "Shape your story." : "Start with a little curiosity."}
            subtitle="Clear ideas. Your own words. A perspective worth sharing."
          >
            <a className="btn secondary" href="#/studio">
              Back to studio
            </a>
          </PageHead>
          <div className="editor-toolbar">
            <span className="muted">
              {dirty ? "Unsaved changes" : id ? "Story loaded" : "New story"} ·{" "}
              {form.body.trim() ? form.body.trim().split(/\s+/).length : 0}{" "}
              words
            </span>
            <div>
              <Button variant="secondary" onClick={() => setPreview(!preview)}>
                <Eye size={16} />
                {preview ? "Edit" : "Preview"}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => save("draft")}
              >
                <Save size={16} />
                Save draft
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  save(user.role === "reader" ? "review" : "published")
                }
              >
                <Send size={16} />
                {user.role === "reader" ? "Submit for review" : "Publish story"}
              </Button>
            </div>
          </div>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          {preview ? (
            <article className="editor-preview">
              <span className="eyebrow">{form.category} · DRAFT PREVIEW</span>
              <h1>{form.title || "Your story headline"}</h1>
              <p className="article-deck">{form.excerpt}</p>
              <img src={form.image} alt="Cover preview" />
              <div className="article-body">
                {form.body.split(/\n\s*\n/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </article>
          ) : (
            <div className="editor-layout">
              <section className="editor-main form-stack">
                <Field
                  label="Headline"
                  hint="8–180 characters. Give your reader a clear reason to care."
                >
                  <textarea
                    className="headline-input"
                    placeholder="A great story starts with…"
                    minLength={8}
                    maxLength={180}
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                  />
                </Field>
                <Field
                  label="Short summary"
                  hint="20–400 characters. The introduction readers see in the feed."
                >
                  <textarea
                    value={form.excerpt}
                    maxLength={400}
                    onChange={(e) => update("excerpt", e.target.value)}
                    placeholder="What is this story about?"
                  />
                </Field>
                <Field
                  label="Your story"
                  hint="At least 80 characters. Use blank lines between paragraphs. Text is rendered safely as plain text."
                >
                  <textarea
                    className="body-input"
                    maxLength={50000}
                    value={form.body}
                    onChange={(e) => update("body", e.target.value)}
                    placeholder="Give your perspective some room to grow…"
                  />
                </Field>
              </section>
              <aside className="editor-options">
                <h3>The finishing touches</h3>
                <Field label="Topic">
                  <select
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                  >
                    {meta.categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Publisher">
                  <select
                    value={form.publisher_id}
                    onChange={(e) =>
                      update("publisher_id", Number(e.target.value))
                    }
                  >
                    {publishers.data?.items.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Cover image">
                  <img
                    className="cover-preview"
                    src={form.image}
                    alt="Current story cover"
                  />
                </Field>
                <div className="cover-choices">
                  {["city", "technology", "culture"].map((n) => (
                    <button
                      key={n}
                      title={n + " cover"}
                      aria-label={"Select " + n + " cover"}
                      className={
                        form.image.includes(n + ".webp") ? "selected" : ""
                      }
                      onClick={() => update("image", "/images/" + n + ".webp")}
                    >
                      <img src={"/images/" + n + ".webp"} alt={n} />
                    </button>
                  ))}
                </div>
                <label className="upload-button">
                  <ImagePlus size={18} />
                  Upload cover
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy}
                    onChange={(e) => upload(e.target.files[0])}
                  />
                </label>
                <small className="muted">PNG, JPG or WebP · Up to 2 MB</small>
                <div className="editor-guidance">
                  <Check size={19} />
                  <strong>Before you share</strong>
                  <p>
                    Check your facts, credit your sources, and use images you
                    have permission to publish.
                  </p>
                  {user.role === "reader" && (
                    <p>
                      An editor will review your submission before it goes live.
                    </p>
                  )}
                  <p>Save your draft before leaving this page.</p>
                </div>
              </aside>
            </div>
          )}
        </>
      )}
    </QueryState>
  );
}
export function AdminPage() {
  const { user, toast } = useApp();
  const [tab, setTab] = useState("users"),
    [search, setSearch] = useState("");
  const query = useQuery("/admin");
  if (user.role !== "admin")
    return (
      <Empty
        title="Administrator access required"
        text="Sign in with an administrator account to manage this workspace."
      />
    );
  async function role(id, value) {
    try {
      await send("/admin/users/" + id, "PATCH", { role: value });
      query.reload();
      toast("Role updated. Existing sessions for this user were signed out.");
    } catch (e) {
      toast(e.message, "error");
    }
  }
  async function moderate(a) {
    try {
      await send("/admin/articles/" + a.id, "PATCH", {
        status: a.status === "published" ? "archived" : "published",
      });
      query.reload();
      toast("Story updated");
    } catch (e) {
      toast(e.message, "error");
    }
  }
  return (
    <>
      <PageHead
        eyebrow="WORKSPACE ADMINISTRATION"
        title="A thoughtful community starts here."
        subtitle="Manage accounts and keep the editorial workspace organised."
      />
      <QueryState query={query}>
        {(d) => (
          <>
            <div className="stats-grid four">
              {[
                ["users", "Members", Users],
                ["stories", "Stories", BookOpen],
                ["comments", "Comments", MessageCircle],
                ["views", "Reads", Eye],
              ].map(([key, label, Icon]) => (
                <div key={key}>
                  <Icon size={20} />
                  <strong>{d.stats[key]}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="admin-toolbar">
              <div className="tabs">
                <button
                  className={tab === "users" ? "active" : ""}
                  onClick={() => setTab("users")}
                >
                  Members
                </button>
                <button
                  className={tab === "articles" ? "active" : ""}
                  onClick={() => setTab("articles")}
                >
                  Stories
                </button>
              </div>
              <div className="inline-search">
                <Search size={17} />
                <input
                  aria-label="Search administration"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="table-wrap">
              {tab === "users" ? (
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Email</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.users
                      .filter((u) =>
                        (u.name + u.email)
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .map((u) => (
                        <tr key={u.id}>
                          <td>
                            <span className="member-cell">
                              <span className="avatar small">
                                {initials(u.name)}
                              </span>
                              {u.name}
                            </span>
                          </td>
                          <td>{u.email}</td>
                          <td>
                            <select
                              aria-label={"Role for " + u.name}
                              disabled={u.id === user.id}
                              value={u.role}
                              onChange={(e) => role(u.id, e.target.value)}
                            >
                              <option value="reader">Reader</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Story</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.articles
                      .filter((a) =>
                        a.title.toLowerCase().includes(search.toLowerCase()),
                      )
                      .map((a) => (
                        <tr key={a.id}>
                          <td>{a.title}</td>
                          <td>
                            <span className={"status-badge " + a.status}>
                              {a.status}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <a href={"#/edit/" + a.id} className="text-link">
                                Edit
                              </a>
                              <Button
                                variant="secondary"
                                onClick={() => moderate(a)}
                              >
                                {a.status === "published"
                                  ? "Archive"
                                  : "Publish"}
                              </Button>
                              <IconButton
                                title="Delete story"
                                onClick={async () => {
                                  if (
                                    !confirm("Permanently delete this story?")
                                  )
                                    return;
                                  try {
                                    await send("/articles/" + a.id, "DELETE");
                                    query.reload();
                                    toast("Story deleted");
                                  } catch (e) {
                                    toast(e.message, "error");
                                  }
                                }}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
