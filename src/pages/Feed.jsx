import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  SlidersHorizontal,
  Search,
  TrendingUp,
  Sparkles,
  Globe,
  Cpu,
  Briefcase,
  FlaskConical,
  Palette,
  Heart,
  Medal,
  MapPin,
} from "lucide-react";
import { useApp, useQuery, go } from "../lib.jsx";
import {
  PageHead,
  SectionHead,
  StoryCard,
  QueryState,
  Empty,
  Button,
  PublisherMark,
  PublisherCard,
  FollowButton,
} from "../components/UI.jsx";
const icons = {
  Technology: Cpu,
  World: Globe,
  Business: Briefcase,
  Science: FlaskConical,
  Culture: Palette,
  Lifestyle: Heart,
  Sports: Medal,
  Travel: MapPin,
};
export function HomePage({ following = false }) {
  const { user, meta, requireAuth } = useApp();
  const [category, setCategory] = useState("All"),
    [feed, setFeed] = useState("all"),
    [page, setPage] = useState(1);
  const stories = useQuery(
    `/articles?category=${category}&feed=${following ? "following" : feed}&page=${page}&limit=12`,
    user?.id,
  );
  const publishers = useQuery("/publishers", user?.id);
  const trending = useQuery("/articles?sort=trending&limit=4", user?.id);
  useEffect(() => {
    setPage(1);
    setCategory("All");
  }, [following]);
  const stamp = new Date().toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <>
      <PageHead
        eyebrow={stamp}
        title={
          following ? (
            "The voices you follow."
          ) : (
            <>
              Your world. <em>In perspective.</em>
            </>
          )
        }
        subtitle={
          following
            ? "Fresh stories from the publishers you’ve made part of your day."
            : "Good stories. Fresh ideas. A little more understanding."
        }
      >
        <a className="quiet-action" href="#/settings">
          <SlidersHorizontal size={16} />
          Personalize feed
        </a>
      </PageHead>
      <div className="feed-navigation">
        <div className="tabs">
          {!following &&
            [
              ["all", "Top stories"],
              ["foryou", "For you"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={feed === value ? "active" : ""}
                onClick={() => {
                  if (value === "foryou" && !requireAuth()) return;
                  setFeed(value);
                  setPage(1);
                }}
              >
                {value === "foryou" && <Sparkles size={14} />} {label}
              </button>
            ))}
          {following && <span className="eyebrow">YOUR FOLLOWING FEED</span>}
        </div>
        <span className="feed-date">
          A moment to get informed <span>↗</span>
        </span>
      </div>
      <div className="category-scroll">
        {["All", ...meta.categories].map((c) => (
          <button
            key={c}
            className={"category-pill " + (category === c ? "selected" : "")}
            onClick={() => {
              setCategory(c);
              setPage(1);
            }}
          >
            {c === "All" ? "All topics" : c}
          </button>
        ))}
      </div>
      <div className="feed-layout">
        <div className="feed-main">
          <QueryState query={stories}>
            {(data) =>
              data.items.length ? (
                <>
                  <div className="hero-grid">
                    <StoryCard article={data.items[0]} hero />
                    <div className="side-stories">
                      {data.items.slice(1, 3).map((a) => (
                        <StoryCard key={a.id} article={a} compact />
                      ))}
                    </div>
                  </div>
                  {data.items.length > 3 && (
                    <>
                      <SectionHead title="The latest, worth your time" />
                      <div className="latest-grid">
                        {data.items.slice(3).map((a) => (
                          <StoryCard key={a.id} article={a} />
                        ))}
                      </div>
                    </>
                  )}
                  <div className="pagination">
                    <Button
                      variant="secondary"
                      disabled={page === 1}
                      onClick={() => {
                        setPage(page - 1);
                        window.scrollTo(0, 0);
                      }}
                    >
                      Previous
                    </Button>
                    <span>
                      Page {page} of{" "}
                      {Math.max(1, Math.ceil(data.total / data.limit))}
                    </span>
                    <Button
                      variant="secondary"
                      disabled={page * data.limit >= data.total}
                      onClick={() => {
                        setPage(page + 1);
                        window.scrollTo(0, 0);
                      }}
                    >
                      Next <ArrowRight size={15} />
                    </Button>
                  </div>
                </>
              ) : (
                <Empty
                  title={
                    following
                      ? "Find your favourite voices"
                      : "A new perspective is on its way"
                  }
                  text={
                    following
                      ? "Follow a publisher to see their stories here."
                      : "There are no published stories for this selection yet."
                  }
                  action={
                    <a className="btn primary" href="#/publishers">
                      Explore publishers <ArrowRight size={16} />
                    </a>
                  }
                />
              )
            }
          </QueryState>
          <SectionHead
            title="A world of perspectives"
            href="#/publishers"
            link="All publishers"
          />
          <QueryState query={publishers}>
            {(data) => (
              <div className="publisher-grid">
                {data.items.slice(0, 4).map((p) => (
                  <PublisherCard key={p.id} publisher={p} />
                ))}
              </div>
            )}
          </QueryState>
        </div>
        <aside className="right-rail">
          <div className="rail-panel">
            <SectionHead title="On the radar">
              <TrendingUp size={20} />
            </SectionHead>
            <p className="rail-caption">Stories to start a conversation</p>
            <QueryState query={trending}>
              {(data) => (
                <div className="trending-list">
                  {data.items.map((a, i) => (
                    <a key={a.id} href={"#/article/" + a.id}>
                      <span className="trend-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <span className="story-category">{a.category}</span>
                        <h3>{a.title}</h3>
                        <span className="muted small-text">
                          {a.read_time} min read
                          {a.views > 0 ? " · " + a.views + " reads" : ""}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </QueryState>
          </div>
          <div className="curiosity-card">
            <span className="curiosity-art">✳</span>
            <span className="eyebrow">MADE FOR YOUR CURIOSITY</span>
            <h2>
              Less noise.
              <br />
              More perspective.
            </h2>
            <p>
              Your interests. Your favourite voices. A news feed with a little
              more you.
            </p>
            <Button
              onClick={() => {
                if (requireAuth()) go("/settings");
              }}
            >
              Make it yours <ArrowUpRight size={17} />
            </Button>
          </div>
          <div className="rail-panel follow-rail">
            <SectionHead
              title="Voices to discover"
              href="#/publishers"
              link="All"
            />
            <QueryState query={publishers}>
              {(data) =>
                data.items.slice(0, 3).map((p) => (
                  <div className="publisher-row" key={p.id}>
                    <a
                      className="publisher-summary"
                      href={"#/publisher/" + p.id}
                    >
                      <PublisherMark publisher={p} />
                      <div>
                        <strong>{p.name}</strong>
                        <span>{p.category}</span>
                      </div>
                    </a>
                    <FollowButton publisher={p} />
                  </div>
                ))
              }
            </QueryState>
          </div>
          <p className="rail-footnote">
            {meta.demo
              ? "You’re exploring the demo edition. Stories and publishers are fictional; images are AI generated."
              : "Thoughtful reading starts with an open mind."}
          </p>
        </aside>
      </div>
    </>
  );
}
export function ExplorePage({ params }) {
  const { meta, user } = useApp();
  const [q, setQ] = useState(params.get("q") || ""),
    [category, setCategory] = useState(params.get("category") || "All"),
    [sort, setSort] = useState("latest"),
    [page, setPage] = useState(1);
  useEffect(() => {
    setQ(params.get("q") || "");
    setCategory(params.get("category") || "All");
    setPage(1);
  }, [params.toString()]);
  const currentQ = params.get("q") || "";
  const stories = useQuery(
    `/articles?q=${encodeURIComponent(currentQ)}&category=${category}&sort=${sort}&page=${page}`,
    user?.id,
  );
  return (
    <>
      <PageHead
        eyebrow="FOLLOW YOUR CURIOSITY"
        title="There’s always more to discover."
        subtitle="Find a new interest, a thoughtful story, or a different point of view."
      />
      <form
        className="discover-search"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          go("/explore?q=" + encodeURIComponent(q) + "&category=" + category);
        }}
      >
        <Search size={23} />
        <input
          placeholder="What are you curious about?"
          aria-label="Discover search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button>
          Search <ArrowRight size={16} />
        </Button>
      </form>
      <div className="topic-grid">
        {meta.categories.map((c, i) => {
          const Icon = icons[c];
          return (
            <button
              key={c}
              className={
                "topic-tile tone-" + i + (category === c ? " selected" : "")
              }
              onClick={() => {
                setCategory(category === c ? "All" : c);
                setPage(1);
              }}
            >
              <Icon size={22} />
              <strong>{c}</strong>
              <ArrowUpRight size={16} />
            </button>
          );
        })}
      </div>
      <div className="section-head">
        <h2>
          {currentQ
            ? "Results for “" + currentQ + "”"
            : category === "All"
              ? "Explore the latest"
              : category + " stories"}
        </h2>
        <label className="sort-control">
          Sort by{" "}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="latest">Latest</option>
            <option value="trending">Most read</option>
          </select>
        </label>
      </div>
      <QueryState query={stories}>
        {(data) => (
          <>
            {data.items.length ? (
              <div className="discover-grid">
                {data.items.map((a) => (
                  <StoryCard key={a.id} article={a} />
                ))}
              </div>
            ) : (
              <Empty
                title="No stories found"
                text="Try a different word or choose another topic."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCategory("All");
                      setQ("");
                      go("/explore");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            )}
            <div className="pagination">
              <Button
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span>
                {data.total} stories · Page {page}
              </span>
              <Button
                variant="secondary"
                disabled={page * data.limit >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
export function PublishersPage() {
  const { user } = useApp();
  const query = useQuery("/publishers", user?.id);
  const [filter, setFilter] = useState("");
  return (
    <>
      <PageHead
        eyebrow="A WORLD OF VOICES"
        title="Find your perspective."
        subtitle="Follow the publishers you want to hear more from."
      />
      <div className="discover-search">
        <Search size={20} />
        <input
          placeholder="Search publishers or topics"
          aria-label="Search publishers"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <QueryState query={query}>
        {(d) => (
          <div className="publishers-directory">
            {d.items
              .filter((p) =>
                (p.name + p.category)
                  .toLowerCase()
                  .includes(filter.toLowerCase()),
              )
              .map((p) => (
                <article key={p.id} className="directory-card">
                  <PublisherMark publisher={p} />
                  <a href={"#/publisher/" + p.id}>
                    <h2>{p.name}</h2>
                  </a>
                  <span className="eyebrow">{p.category}</span>
                  <p>{p.description}</p>
                  <div className="directory-bottom">
                    <span>
                      {p.stories} stories · {p.followers} followers
                    </span>
                    <FollowButton publisher={p} />
                  </div>
                </article>
              ))}
          </div>
        )}
      </QueryState>
    </>
  );
}
export function PublisherPage({ id }) {
  const { user, meta, epoch } = useApp();
  const query = useQuery("/publishers", String(user?.id) + ":" + epoch),
    stories = useQuery("/articles?publisher=" + id + "&limit=48", user?.id);
  return (
    <QueryState query={query}>
      {(d) => {
        const p = d.items.find((x) => String(x.id) === id);
        if (!p) return <Empty title="Publisher not found" />;
        return (
          <>
            <a className="back-link" href="#/publishers">
              ← All publishers
            </a>
            <div className="publisher-hero">
              <PublisherMark publisher={p} />
              <div>
                <span className="eyebrow">
                  {meta.demo ? "NEWSLINE DEMO PUBLISHER" : p.category}
                </span>
                <h1>{p.name}</h1>
                <p>{p.description}</p>
                <span className="muted">
                  {p.stories} published stories · {p.followers} followers
                </span>
              </div>
              <FollowButton publisher={p} />
            </div>
            <SectionHead title={"The latest from " + p.name} />
            <QueryState query={stories}>
              {(d) =>
                d.items.length ? (
                  <div className="discover-grid">
                    {d.items.map((a) => (
                      <StoryCard key={a.id} article={a} />
                    ))}
                  </div>
                ) : (
                  <Empty title="Their next story is on its way" />
                )
              }
            </QueryState>
          </>
        );
      }}
    </QueryState>
  );
}
