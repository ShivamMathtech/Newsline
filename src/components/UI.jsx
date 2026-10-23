import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Check,
  ArrowUpRight,
  X,
  ArrowRight,
  BookOpen,
  RefreshCw,
  Plus,
} from "lucide-react";
import { useApp, send, ago } from "../lib.jsx";
export function Logo() {
  return (
    <a className="brand" href="#/" aria-label="Newsline home">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M3 30 9 8H18L23 21 27 8H36L30 32H21L16 20 13 30Z"
          fill="currentColor"
        />
      </svg>
      <span>
        Newsline<span className="brand-dot">.</span>
      </span>
    </a>
  );
}
export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}) {
  return (
    <button className={`btn ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({ title, children, ...props }) {
  return (
    <button className="icon-btn" title={title} aria-label={title} {...props}>
      {children}
    </button>
  );
}
export function PublisherMark({ publisher, small = false }) {
  return (
    <span
      className={"publisher-mark " + (small ? "small" : "")}
      style={{ background: publisher?.color || "#157f75" }}
    >
      {publisher?.initials || "N"}
    </span>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    const targets = () =>
      [
        ...el.querySelectorAll(
          'button,input,select,textarea,a[href],[tabindex="0"]',
        ),
      ].filter((e) => !e.disabled);
    targets()[0]?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const f = targets();
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
          e.preventDefault();
          f[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-shade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <IconButton title="Close dialog" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Empty({
  title = "A little quiet here",
  text = "Explore a story and make this space yours.",
  action,
  children,
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <BookOpen size={30} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
      {children}
    </div>
  );
}
export function QueryState({ query, children }) {
  if (query.loading)
    return (
      <div className="skeleton-grid" aria-label="Loading stories" role="status">
        {[1, 2, 3].map((i) => (
          <div className="skeleton" key={i}>
            <div />
            <span />
            <span />
          </div>
        ))}
      </div>
    );
  if (query.error)
    return (
      <div className="error-box" role="alert">
        <p>{query.error}</p>
        <Button variant="secondary" onClick={query.reload}>
          <RefreshCw size={16} />
          Try again
        </Button>
      </div>
    );
  return children(query.data);
}
export function PageHead({ eyebrow, title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
export function SectionHead({ title, href, link = "View all", children }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {href ? (
        <a className="text-link" href={href}>
          {link}
          <ArrowUpRight size={16} />
        </a>
      ) : (
        children
      )}
    </div>
  );
}
export function SaveButton({ article, onChange }) {
  const { user, requireAuth, toast, bump } = useApp();
  const [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(article.bookmarked);
  useEffect(() => setSaved(article.bookmarked), [article.bookmarked]);
  return (
    <button
      className={"save-btn " + (saved ? "saved" : "")}
      aria-label={saved ? "Remove bookmark" : "Save story"}
      title={saved ? "Remove bookmark" : "Save story"}
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!requireAuth()) return;
        setBusy(true);
        try {
          await send(
            `/articles/${article.id}/bookmark`,
            saved ? "DELETE" : "PUT",
          );
          setSaved(!saved);
          toast(
            saved ? "Removed from saved stories" : "Saved to your reading list",
          );
          bump();
          onChange?.();
        } catch (err) {
          toast(err.message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
export function StoryCard({
  article,
  compact = false,
  hero = false,
  onChange,
  children,
}) {
  return (
    <article
      className={
        "story-card " + (compact ? "compact " : "") + (hero ? "hero-story" : "")
      }
    >
      <a href={"#/article/" + article.id} className="story-image">
        <img
          src={article.image}
          alt={article.title}
          loading={hero ? "eager" : "lazy"}
        />
        {hero && (
          <span className="image-label">
            THE BIG PICTURE <ArrowUpRight size={14} />
          </span>
        )}
      </a>
      <div className="story-content">
        <div className="story-category">
          {article.category}
          <span>•</span>
          <span>{article.read_time} min read</span>
        </div>
        <a href={"#/article/" + article.id} className="story-title">
          <h3>{article.title}</h3>
        </a>
        {!compact && <p className="story-excerpt">{article.excerpt}</p>}
        <div className="story-footer">
          <a
            className="publisher-byline"
            href={"#/publisher/" + article.publisher.id}
          >
            <PublisherMark publisher={article.publisher} small />
            <span>{article.publisher.name}</span>
          </a>
          <span className="story-time">{ago(article.published_at)}</span>
          <SaveButton article={article} onChange={onChange} />
        </div>
        {children}
      </div>
    </article>
  );
}
export function FollowButton({ publisher, onChange }) {
  const { requireAuth, toast, bump } = useApp();
  const [following, setFollowing] = useState(publisher.following),
    [busy, setBusy] = useState(false);
  useEffect(() => setFollowing(publisher.following), [publisher.following]);
  useEffect(() => {
    const sync = (e) => {
      if (e.detail.id === publisher.id) setFollowing(e.detail.following);
    };
    window.addEventListener("newsline:follow", sync);
    return () => window.removeEventListener("newsline:follow", sync);
  }, [publisher.id]);
  return (
    <Button
      variant={following ? "secondary" : "soft"}
      className="follow-btn"
      disabled={busy}
      onClick={async () => {
        if (!requireAuth()) return;
        setBusy(true);
        try {
          await send(
            `/publishers/${publisher.id}/follow`,
            following ? "DELETE" : "PUT",
          );
          setFollowing(!following);
          window.dispatchEvent(
            new CustomEvent("newsline:follow", {
              detail: { id: publisher.id, following: !following },
            }),
          );
          bump();
          onChange?.();
        } catch (e) {
          toast(e.message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      {following ? <Check size={14} /> : <Plus size={14} />}{" "}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
export function PublisherCard({ publisher }) {
  return (
    <article className="publisher-card">
      <a href={"#/publisher/" + publisher.id}>
        <PublisherMark publisher={publisher} />
        <h3>{publisher.name}</h3>
        <p>{publisher.category}</p>
      </a>
      <FollowButton publisher={publisher} />
    </article>
  );
}
export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Gate({ children }) {
  const { user, setAuth } = useApp();
  return user ? (
    children
  ) : (
    <Empty
      title="Make yourself at home"
      text="Sign in to save stories, follow publishers and build a feed around you."
      action={
        <Button onClick={() => setAuth("login")}>
          Sign in to Newsline <ArrowRight size={17} />
        </Button>
      }
    />
  );
}
