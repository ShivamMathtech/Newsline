import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Headphones,
  Square,
  Type,
  Sun,
  Moon,
  Bookmark,
  Check,
  ArrowUpRight,
  Trash2,
} from "lucide-react";
import { useQuery, useApp, send, date, ago, initials } from "../lib.jsx";
import {
  QueryState,
  PublisherMark,
  Button,
  IconButton,
  SaveButton,
  FollowButton,
  SectionHead,
  StoryCard,
  Field,
  Modal,
} from "../components/UI.jsx";
export default function Reader({ id }) {
  const { user, requireAuth, toast, setUser } = useApp();
  const query = useQuery("/articles/" + id, user?.id);
  const comments = useQuery("/articles/" + id + "/comments", user?.id);
  const publishers = useQuery("/publishers", user?.id);
  const [comment, setComment] = useState(""),
    [reply, setReply] = useState(null),
    [busy, setBusy] = useState(false),
    [reading, setReading] = useState(false),
    [size, setSize] = useState(user?.font_size || 19),
    [theme, setTheme] = useState(user?.theme || "light"),
    [controls, setControls] = useState(false),
    [progress, setProgress] = useState(0),
    [shared, setShared] = useState(false);
  const related = useQuery("/articles?limit=4", user?.id);
  useEffect(() => {
    send("/articles/" + id + "/read").catch(() => {});
    return () => window.speechSynthesis?.cancel();
  }, [id, user?.id]);
  useEffect(() => {
    const track = () => {
      const el = document.querySelector(".article-body");
      if (el) {
        const rect = el.getBoundingClientRect();
        setProgress(
          Math.max(
            0,
            Math.min(100, ((innerHeight - rect.top) / rect.height) * 100),
          ),
        );
      }
    };
    window.addEventListener("scroll", track, { passive: true });
    track();
    return () => window.removeEventListener("scroll", track);
  }, [query.data]);
  async function like(a) {
    if (!requireAuth()) return;
    try {
      await send("/articles/" + id + "/like", a.liked ? "DELETE" : "PUT");
      query.reload();
    } catch (e) {
      toast(e.message, "error");
    }
  }
  async function submit(e) {
    e.preventDefault();
    if (!requireAuth()) return;
    setBusy(true);
    try {
      await send("/articles/" + id + "/comments", "POST", {
        body: comment,
        parent_id: reply?.id,
      });
      setComment("");
      setReply(null);
      comments.reload();
      toast("Your comment is posted");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: query.data.article.title,
          url: location.href,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(location.href);
        toast("Story link copied");
      } else setShared(true);
    } catch (e) {
      if (e.name !== "AbortError") setShared(true);
    }
  }
  function listen(a) {
    if (!("speechSynthesis" in window)) {
      toast(
        "Read aloud is unavailable in this browser. Try Chrome or Edge.",
        "error",
      );
      return;
    }
    if (reading) {
      speechSynthesis.cancel();
      setReading(false);
      return;
    }
    const speech = new SpeechSynthesisUtterance(a.title + ". " + a.body);
    speech.lang = "en";
    speech.rate = 0.95;
    speech.onend = () => setReading(false);
    speech.onerror = () => {
      setReading(false);
      toast("Read aloud stopped. Check your browser’s speech support.");
    };
    speechSynthesis.cancel();
    speechSynthesis.speak(speech);
    setReading(true);
  }
  async function saveReading() {
    if (user) {
      try {
        const d = await send("/me", "PATCH", { font_size: size, theme });
        setUser(d.user);
        toast("Reading preferences saved");
      } catch (e) {
        toast(e.message, "error");
      }
    }
    setControls(false);
  }
  return (
    <QueryState query={query}>
      {({ article: a }) => (
        <div className={"reader reader-" + theme}>
          <div className="reading-progress" style={{ width: progress + "%" }} />
          <div className="reader-top">
            <a className="back-link" href="#/">
              <ArrowLeft size={17} />
              Back to stories
            </a>
            <div className="reader-tools">
              <IconButton
                title="Reading preferences"
                onClick={() => setControls(!controls)}
              >
                <Type size={20} />
              </IconButton>
              <IconButton
                title={reading ? "Stop listening" : "Listen to story"}
                onClick={() => listen(a)}
              >
                {reading ? <Square size={18} /> : <Headphones size={20} />}
              </IconButton>
              <SaveButton article={a} />
              <IconButton title="Share story" onClick={share}>
                <Share2 size={19} />
              </IconButton>
            </div>
          </div>
          {controls && (
            <div className="reading-settings">
              <Field label={"Text size · " + size + "px"}>
                <input
                  type="range"
                  min="14"
                  max="28"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                />
              </Field>
              <div className="theme-buttons">
                {["light", "sepia", "dark"].map((t) => (
                  <button
                    key={t}
                    className={t === theme ? "selected" : ""}
                    onClick={() => setTheme(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Button onClick={saveReading}>Apply</Button>
            </div>
          )}
          <div className="article-heading">
            <span className="eyebrow">
              {a.category}{" "}
              <span className="muted">/ {a.read_time} MIN READ</span>
            </span>
            <h1>{a.title}</h1>
            <p className="article-deck">{a.excerpt}</p>
            <div className="article-byline">
              <a
                className="publisher-summary"
                href={"#/publisher/" + a.publisher_id}
              >
                <PublisherMark publisher={a.publisher} />
                <div>
                  <strong>{a.publisher.name}</strong>
                  <span>
                    By {a.author.name} · {date(a.published_at || a.created_at)}
                  </span>
                </div>
              </a>
              {publishers.data && (
                <FollowButton
                  publisher={
                    publishers.data.items.find(
                      (p) => p.id === a.publisher_id,
                    ) || a.publisher
                  }
                />
              )}
            </div>
          </div>
          <figure className="article-figure">
            <img src={a.image} alt={a.title} />
            {!!a.is_demo && (
              <figcaption>
                Illustrative AI-generated image · Sample editorial story, not a
                report of a real event.
              </figcaption>
            )}
          </figure>
          <div className="article-reading">
            <aside className="article-social">
              <button
                aria-label={a.liked ? "Unlike story" : "Like story"}
                className={a.liked ? "liked" : ""}
                onClick={() => like(a)}
              >
                <Heart size={21} fill={a.liked ? "currentColor" : "none"} />
                <span>{a.likes}</span>
              </button>
              <a
                href="#comments"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("comments")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                aria-label="Read comments"
              >
                <MessageCircle size={21} />
                <span>{comments.data?.items.length || 0}</span>
              </a>
              <IconButton title="Share story" onClick={share}>
                <Share2 size={20} />
              </IconButton>
            </aside>
            <div className="article-body" style={{ fontSize: size }}>
              {a.body
                .split(/\n\s*\n/)
                .map((p, i) =>
                  i === 0 && p.length < 150 ? (
                    <h2 key={i}>{p}</h2>
                  ) : (
                    <p key={i}>{p}</p>
                  ),
                )}
              <div className="end-mark">◆</div>
              <div className="article-tags">
                <a href={"#/explore?category=" + a.category}>{a.category}</a>
                <a href={"#/publisher/" + a.publisher_id}>{a.publisher.name}</a>
              </div>
              <div className="article-reaction">
                <span>Was this worth your time?</span>
                <Button
                  variant={a.liked ? "soft" : "secondary"}
                  onClick={() => like(a)}
                >
                  <Heart size={17} fill={a.liked ? "currentColor" : "none"} />
                  {a.liked ? "Appreciated" : "Appreciate"} · {a.likes}
                </Button>
              </div>
              <section id="comments" className="comments-section">
                <SectionHead
                  title={
                    "The conversation (" +
                    (comments.data?.items.length || 0) +
                    ")"
                  }
                />
                <p className="muted">
                  Share a thoughtful perspective. Be curious. Be kind.
                </p>
                {reply && (
                  <div className="reply-banner">
                    Replying to {reply.name}
                    <button onClick={() => setReply(null)}>Cancel</button>
                  </div>
                )}
                <form className="comment-form" onSubmit={submit}>
                  <textarea
                    aria-label="Your comment"
                    placeholder={
                      user
                        ? "Add to the conversation…"
                        : "Sign in and share your perspective…"
                    }
                    maxLength={2000}
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div>
                    <small>{comment.length}/2000</small>
                    <Button disabled={busy}>
                      {user ? "Post comment" : "Sign in to comment"}
                      <ArrowUpRight size={16} />
                    </Button>
                  </div>
                </form>
                <QueryState query={comments}>
                  {(d) =>
                    d.items.map((c) => (
                      <div
                        key={c.id}
                        className={"comment " + (c.parent_id ? "reply" : "")}
                      >
                        <span className="avatar">{initials(c.name)}</span>
                        <div>
                          <strong>{c.name}</strong>
                          <span className="comment-date">
                            {ago(c.created_at)}
                            {c.parent_id ? " · Reply" : ""}
                          </span>
                          <p>{c.body}</p>
                          <div className="comment-actions">
                            <button
                              onClick={() => {
                                if (requireAuth()) {
                                  setReply(c);
                                  document
                                    .querySelector(".comment-form textarea")
                                    ?.focus();
                                }
                              }}
                            >
                              Reply
                            </button>
                            {(user?.id === c.user_id ||
                              user?.role === "admin") && (
                              <button
                                aria-label="Delete comment"
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      "Delete this comment and its replies?",
                                    )
                                  )
                                    return;
                                  try {
                                    await send("/comments/" + c.id, "DELETE");
                                    comments.reload();
                                  } catch (e) {
                                    toast(e.message, "error");
                                  }
                                }}
                              >
                                <Trash2 size={13} />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </QueryState>
              </section>
            </div>
          </div>
          <SectionHead
            title="Keep your curiosity going"
            href="#/explore"
            link="Explore more"
          />
          <QueryState query={related}>
            {(d) => (
              <div className="discover-grid">
                {d.items
                  .filter((s) => s.id !== a.id)
                  .slice(0, 3)
                  .map((s) => (
                    <StoryCard key={s.id} article={s} />
                  ))}
              </div>
            )}
          </QueryState>
          {shared && (
            <Modal title="Share this story" onClose={() => setShared(false)}>
              <Field label="Copy this link">
                <input
                  readOnly
                  value={location.href}
                  onFocus={(e) => e.target.select()}
                />
              </Field>
            </Modal>
          )}
        </div>
      )}
    </QueryState>
  );
}
