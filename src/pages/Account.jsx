import { useState } from "react";
import {
  Plus,
  Folder,
  Bookmark,
  PenLine,
  Trash2,
  CheckCheck,
  Bell,
  ArrowUpRight,
  Check,
  Download,
  LogOut,
  Heart,
  Settings,
  BookOpen,
  Shield,
  Search,
} from "lucide-react";
import {
  useApp,
  useQuery,
  send,
  api,
  ago,
  go,
  initials,
  date,
} from "../lib.jsx";
import {
  PageHead,
  SectionHead,
  StoryCard,
  QueryState,
  Empty,
  Button,
  IconButton,
  Modal,
  Field,
} from "../components/UI.jsx";
export function SavedPage() {
  const { toast } = useApp();
  const [selected, setSelected] = useState(""),
    [search, setSearch] = useState(""),
    [dialog, setDialog] = useState(null),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false);
  const collections = useQuery("/collections"),
    stories = useQuery(
      "/bookmarks" + (selected ? "?collection=" + selected : ""),
    );
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await send(
        dialog === "new" ? "/collections" : "/collections/" + selected,
        dialog === "new" ? "POST" : "PATCH",
        { name },
      );
      setDialog(null);
      collections.reload();
      toast("Collection saved");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm("Delete this collection? Your stories will remain saved."))
      return;
    try {
      await send("/collections/" + selected, "DELETE");
      setSelected("");
      collections.reload();
      toast("Collection deleted");
    } catch (e) {
      toast(e.message, "error");
    }
  }
  return (
    <>
      <PageHead
        eyebrow="YOUR PERSONAL READING LIST"
        title="Good stories, kept close."
        subtitle="A little space for everything you want to come back to."
      >
        <Button
          onClick={() => {
            setName("");
            setDialog("new");
          }}
        >
          <Plus size={17} />
          New collection
        </Button>
      </PageHead>
      <div className="saved-layout">
        <aside className="collection-sidebar">
          <button
            className={!selected ? "active" : ""}
            onClick={() => setSelected("")}
          >
            <Bookmark size={18} />
            All saved stories
          </button>
          {collections.data?.items.map((c) => (
            <button
              key={c.id}
              className={String(c.id) === String(selected) ? "active" : ""}
              onClick={() => setSelected(c.id)}
            >
              <Folder size={18} />
              <span>{c.name}</span>
              <small>{c.count}</small>
            </button>
          ))}
        </aside>
        <section>
          <div className="saved-toolbar">
            <div className="inline-search">
              <Search size={17} />
              <input
                aria-label="Search saved stories"
                placeholder="Search saved stories"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {selected && (
              <>
                <IconButton
                  title="Rename collection"
                  onClick={() => {
                    setName(
                      collections.data.items.find((c) => c.id === selected)
                        ?.name || "",
                    );
                    setDialog("rename");
                  }}
                >
                  <PenLine size={17} />
                </IconButton>
                <IconButton title="Delete collection" onClick={remove}>
                  <Trash2 size={17} />
                </IconButton>
              </>
            )}
          </div>
          <QueryState query={stories}>
            {(d) => {
              const items = d.items.filter((a) =>
                a.title.toLowerCase().includes(search.toLowerCase()),
              );
              return items.length ? (
                <div className="saved-grid">
                  {items.map((a) => (
                    <StoryCard
                      key={a.id}
                      article={a}
                      onChange={() => {
                        stories.reload();
                        collections.reload();
                      }}
                    >
                      <label className="collection-select">
                        <Folder size={14} />
                        <select
                          aria-label={"Collection for " + a.title}
                          value={a.collection_id ?? ""}
                          onChange={async (e) => {
                            try {
                              await send(
                                "/articles/" + a.id + "/bookmark",
                                "PUT",
                                { collection_id: e.target.value || null },
                              );
                              stories.reload();
                              collections.reload();
                              toast("Story moved");
                            } catch (e) {
                              toast(e.message, "error");
                            }
                          }}
                        >
                          <option value="">Unfiled</option>
                          {collections.data?.items.map((c) => (
                            <option value={c.id} key={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </StoryCard>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Room for your next great read"
                  text="Tap the bookmark on any story to keep it here."
                  action={
                    <a className="btn primary" href="#/explore">
                      Find a story <ArrowUpRight size={16} />
                    </a>
                  }
                />
              );
            }}
          </QueryState>
        </section>
      </div>
      {dialog && (
        <Modal
          title={dialog === "new" ? "A new collection" : "Rename collection"}
          onClose={() => setDialog(null)}
        >
          <form onSubmit={save} className="form-stack">
            <Field label="Collection name">
              <input
                placeholder="e.g. Weekend reads"
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Button disabled={busy}>Save collection</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function HistoryPage() {
  const { toast } = useApp();
  const query = useQuery("/history");
  return (
    <>
      <PageHead
        eyebrow="YOUR READING JOURNEY"
        title="A story worth returning to."
        subtitle="Your 100 most recently read stories, all in one place."
      >
        <Button
          variant="secondary"
          onClick={async () => {
            if (!confirm("Clear your reading history?")) return;
            try {
              await send("/history", "DELETE");
              query.reload();
              toast("Reading history cleared");
            } catch (e) {
              toast(e.message, "error");
            }
          }}
        >
          <Trash2 size={16} />
          Clear history
        </Button>
      </PageHead>
      <QueryState query={query}>
        {(d) =>
          d.items.length ? (
            <div className="discover-grid">
              {d.items.map((a) => (
                <StoryCard key={a.id} article={a} />
              ))}
            </div>
          ) : (
            <Empty
              title="Your journey starts with a story"
              text="Read a story while signed in and it will appear here."
              action={
                <a className="btn primary" href="#/">
                  Explore today
                </a>
              }
            />
          )
        }
      </QueryState>
    </>
  );
}
export function NotificationsPage() {
  const { toast, bump } = useApp();
  const query = useQuery("/notifications");
  async function read() {
    try {
      await send("/notifications", "PATCH");
      query.reload();
      bump();
    } catch (e) {
      toast(e.message, "error");
    }
  }
  return (
    <>
      <PageHead
        eyebrow="STAY IN THE LOOP"
        title="A little news for you."
        subtitle="New stories from publishers you follow, replies, and account updates."
      >
        <Button variant="secondary" onClick={read}>
          <CheckCheck size={17} />
          Mark all as read
        </Button>
      </PageHead>
      <QueryState query={query}>
        {(d) =>
          d.items.length ? (
            <div className="notification-list">
              {d.items.map((n) => (
                <article key={n.id} className={!n.read ? "unread" : ""}>
                  <span className="notification-symbol">
                    <Bell size={20} />
                  </span>
                  <div>
                    <span className="small-text muted">
                      {ago(n.created_at)}
                    </span>
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                    {n.article_id && (
                      <a
                        className="text-link"
                        href={"#/article/" + n.article_id}
                      >
                        Read story <ArrowUpRight size={15} />
                      </a>
                    )}
                  </div>
                  {!n.read && <span className="unread-dot" />}
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="You’re all caught up"
              text="Follow a publisher to hear about their next story."
            />
          )
        }
      </QueryState>
    </>
  );
}
export function SettingsPage() {
  const { user, setUser, meta, toast } = useApp();
  const [tab, setTab] = useState("Profile"),
    [form, setForm] = useState({ ...user }),
    [busy, setBusy] = useState(false),
    [current, setCurrent] = useState(""),
    [pass, setPass] = useState("");
  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await send("/me", "PATCH", form);
      setUser(d.user);
      toast("Your preferences are saved");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function change(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await send("/me/password", "POST", {
        current_password: current,
        password: pass,
      });
      setCurrent("");
      setPass("");
      toast("Password updated. Other sessions have been signed out.");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function exportData() {
    try {
      const data = await api("/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        }),
        url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "newsline-my-data.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Your data export is ready");
    } catch (e) {
      toast(e.message, "error");
    }
  }
  return (
    <>
      <PageHead
        eyebrow="MAKE YOURSELF AT HOME"
        title="A little more you."
        subtitle="Your profile, your interests, your reading experience."
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {["Profile", "Interests", "Reading", "Notifications", "Security"].map(
            (t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
                <ArrowUpRight size={15} />
              </button>
            ),
          )}
        </nav>
        <section className="settings-card">
          <h2>{tab}</h2>
          {tab === "Security" ? (
            <>
              <form onSubmit={change} className="form-stack">
                <Field label="Current password">
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                  />
                </Field>
                <Field
                  label="New password"
                  hint="At least 10 characters. Other signed-in sessions will be ended."
                >
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={128}
                    required
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                  />
                </Field>
                <Button disabled={busy}>Update password</Button>
              </form>
              <div className="settings-divider" />
              <h3>Your information belongs to you.</h3>
              <p className="muted">
                Download your profile, bookmarks, follows, comments and reading
                history.
              </p>
              <Button variant="secondary" onClick={exportData}>
                <Download size={16} />
                Export my data
              </Button>
              <p className="fine-print">
                For account removal, the local administrator can manage the
                SQLite database after backing it up. Self-service account
                deletion is not included.
              </p>
            </>
          ) : (
            <form className="form-stack" onSubmit={save}>
              {tab === "Profile" && (
                <>
                  <div className="profile-avatar">
                    <span className="avatar large">{initials(form.name)}</span>
                    <div>
                      <strong>{user.name}</strong>
                      <p className="muted">{user.email}</p>
                    </div>
                  </div>
                  <Field label="Full name">
                    <input
                      required
                      minLength={2}
                      maxLength={70}
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                    />
                  </Field>
                  <Field label="A little about you">
                    <textarea
                      maxLength={500}
                      placeholder="What makes you curious?"
                      value={form.bio}
                      onChange={(e) => update("bio", e.target.value)}
                    />
                  </Field>
                  <div className="form-row">
                    <Field label="Country">
                      <select
                        value={form.country}
                        onChange={(e) => update("country", e.target.value)}
                      >
                        {meta.countries.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Edition">
                      <select value="English" onChange={() => {}}>
                        <option>English</option>
                      </select>
                    </Field>
                  </div>
                  <small className="muted">
                    Country is a profile preference. The current release
                    includes an English edition.
                  </small>
                </>
              )}
              {tab === "Interests" && (
                <>
                  <p className="muted">
                    Choose what you’d like to see in your For you feed. Select
                    none to see every topic.
                  </p>
                  <div className="topic-picker">
                    {meta.categories.map((c) => (
                      <button
                        type="button"
                        key={c}
                        className={form.topics.includes(c) ? "selected" : ""}
                        onClick={() =>
                          update(
                            "topics",
                            form.topics.includes(c)
                              ? form.topics.filter((t) => t !== c)
                              : [...form.topics, c],
                          )
                        }
                      >
                        {c}
                        {form.topics.includes(c) ? (
                          <Check size={17} />
                        ) : (
                          <Plus size={17} />
                        )}
                      </button>
                    ))}
                  </div>
                  <a className="text-link" href="#/publishers">
                    Discover publishers to follow <ArrowUpRight size={16} />
                  </a>
                </>
              )}
              {tab === "Reading" && (
                <>
                  <Field label="Appearance">
                    <div className="theme-buttons">
                      {["light", "sepia", "dark"].map((t) => (
                        <button
                          type="button"
                          key={t}
                          onClick={() => update("theme", t)}
                          className={form.theme === t ? "selected" : ""}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label={"Reading text size · " + form.font_size + "px"}>
                    <input
                      type="range"
                      min={14}
                      max={28}
                      value={form.font_size}
                      onChange={(e) =>
                        update("font_size", Number(e.target.value))
                      }
                    />
                  </Field>
                  <div
                    className={"reading-preview reader-" + form.theme}
                    style={{ fontSize: form.font_size }}
                  >
                    A good story stays with you long after the last line.
                  </div>
                </>
              )}
              {tab === "Notifications" && (
                <>
                  <label className="toggle-row">
                    <div>
                      <strong>In-app updates</strong>
                      <p>New stories, replies and publishing updates.</p>
                    </div>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={form.notifications}
                      onChange={(e) =>
                        update("notifications", e.target.checked)
                      }
                    />
                  </label>
                  <p className="muted">
                    Newsline checks for updates while it’s open. Browser push
                    and email newsletters are not enabled.
                  </p>
                </>
              )}
              <div className="form-actions">
                <Button disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                  <Check size={17} />
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
export function ProfilePage() {
  const { user } = useApp();
  const query = useQuery("/studio");
  const bookmarks = useQuery("/bookmarks");
  return (
    <>
      <div className="profile-cover">
        <span>Stay curious.</span>
      </div>
      <div className="profile-heading">
        <span className="avatar xl">{initials(user.name)}</span>
        <div>
          <span className="eyebrow">
            {user.role === "reader" ? "CURIOUS MIND" : user.role.toUpperCase()}
          </span>
          <h1>{user.name}</h1>
          <p>
            {user.bio || "Every great story starts with a little curiosity."}
          </p>
          <span className="muted">
            {user.country} · Joined {date(user.created_at)}
          </span>
        </div>
        <a className="btn secondary" href="#/settings">
          <PenLine size={16} />
          Edit profile
        </a>
      </div>
      <div className="stats-grid">
        <div>
          <Bookmark size={20} />
          <strong>{bookmarks.data?.items.length || 0}</strong>
          <span>Saved stories</span>
        </div>
        <div>
          <BookOpen size={20} />
          <strong>{query.data?.stats.published || 0}</strong>
          <span>Published stories</span>
        </div>
        <div>
          <Heart size={20} />
          <strong>{user.topics.length}</strong>
          <span>Interests</span>
        </div>
      </div>
      <SectionHead title="Your stories" href="#/studio" link="Creator studio" />
      <QueryState query={query}>
        {(d) =>
          d.items.filter((a) => a.status === "published").length ? (
            <div className="discover-grid">
              {d.items
                .filter((a) => a.status === "published")
                .map((a) => (
                  <StoryCard article={a} key={a.id} />
                ))}
            </div>
          ) : (
            <Empty
              title="Your perspective has a place here"
              text="Create a draft in the studio and submit it for editorial review."
              action={
                <a className="btn primary" href="#/write">
                  <PenLine size={16} />
                  Write a story
                </a>
              }
            />
          )
        }
      </QueryState>
    </>
  );
}
export function AboutPage({ help = false }) {
  return (
    <div className="info-page">
      <PageHead
        eyebrow="A FRESH PERSPECTIVE"
        title={
          help
            ? "A little help along the way."
            : "Good stories bring us closer."
        }
        subtitle={
          help
            ? "Everything you need to feel at home in Newsline."
            : "Newsline is a reader and publishing workspace inspired by the supplied Newsline UI kit."
        }
      />
      {help ? (
        <>
          <section>
            <h2>Find your next story</h2>
            <p>
              Browse Today, search in Discover, or open a topic. Follow
              publishers to fill your Following feed. Set interests in Settings
              for a personalised For you feed.
            </p>
          </section>
          <section>
            <h2>Keep the stories you love</h2>
            <p>
              Sign in and tap a bookmark on any story. Saved stories lets you
              organise them into collections. Deleting a collection keeps its
              stories in All saved.
            </p>
          </section>
          <section>
            <h2>Share your perspective</h2>
            <p>
              Open Creator studio to write a story. Readers can save drafts and
              submit for review. Editors and administrators can publish.
              Publishing creates in-app updates for followers who have
              notifications enabled.
            </p>
          </section>
          <section>
            <h2>Sign in to the local demo</h2>
            <p>
              Use the Reader, Editor or Admin buttons in the sign-in window. The
              shared demo password is <code>Newsline@123</code>. These accounts
              are for local evaluation.
            </p>
          </section>
          <section>
            <h2>Reset a password</h2>
            <p>
              In demo mode, the recovery flow writes a reset email to{" "}
              <code>data/mail-outbox.jsonl</code> in the project directory. Copy
              its token into the reset form. Tokens expire after 15 minutes and
              work once. No email is sent externally.
            </p>
          </section>
          <section>
            <h2>Need to run the project?</h2>
            <p>
              See README.md and docs/WINDOWS-SETUP.md in the source ZIP for
              setup, demo accounts and troubleshooting.
            </p>
          </section>
        </>
      ) : (
        <>
          <section>
            <h2>About this edition</h2>
            <p>
              The included stories and publishers are fictional sample content
              written to demonstrate the application. Editorial images were
              created with AI. This edition does not fetch breaking news or
              claim to report current events.
            </p>
            <p>
              Newsline includes persistent accounts, reading lists, publisher
              follows, comments, drafts, review and publishing. Your stories can
              replace the sample content through Creator studio.
            </p>
          </section>
          <section>
            <h2>Community guidelines</h2>
            <p>
              Be thoughtful, respectful and accurate. Publish only content you
              have permission to share. Disagree with ideas without attacking
              the people behind them. Do not post private information or harmful
              content.
            </p>
          </section>
          <section>
            <h2>Privacy</h2>
            <p>
              Accounts, preferences, articles and reading activity are stored in
              the app’s local SQLite database. Session cookies keep you signed
              in. No advertising trackers, external analytics, or third-party
              news requests are included.
            </p>
            <p>
              Uploaded cover images are public to anyone who has their URL. Do
              not upload private documents. Read aloud uses your browser’s
              speech service; its availability and processing depend on your
              browser and selected voice.
            </p>
            <p>
              You can export your profile data in Settings and clear your
              reading history. The local administrator controls the database and
              backups. This page describes the included implementation and
              should be adapted before public hosting.
            </p>
          </section>
        </>
      )}
      <a className="btn primary" href="#/">
        Back to your stories <ArrowUpRight size={16} />
      </a>
    </div>
  );
}
