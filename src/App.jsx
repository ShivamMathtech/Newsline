import { useEffect, useState } from "react";
import {
  Home,
  Compass,
  Bookmark,
  Users,
  PenLine,
  Settings,
  HelpCircle,
  Bell,
  Search,
  ChevronRight,
  Menu,
  LogOut,
  TrendingUp,
  Clock,
  Shield,
  ArrowUpRight,
  X,
} from "lucide-react";
import { Context, api, send, useRoute, go, initials } from "./lib.jsx";
import { Logo, Button, IconButton, Gate } from "./components/UI.jsx";
import Auth, { Onboarding } from "./components/Auth.jsx";
import {
  HomePage,
  ExplorePage,
  PublishersPage,
  PublisherPage,
} from "./pages/Feed.jsx";
import Reader from "./pages/Reader.jsx";
import {
  SavedPage,
  HistoryPage,
  NotificationsPage,
  SettingsPage,
  ProfilePage,
  AboutPage,
} from "./pages/Account.jsx";
import { StudioPage, EditorPage, AdminPage } from "./pages/Studio.jsx";
const mainNav = [
  ["/", "Today", Home],
  ["/explore", "Discover", Compass],
  ["/following", "Following", Users],
  ["/saved", "Saved stories", Bookmark],
];
export default function App() {
  const route = useRoute();
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [meta, setMeta] = useState({ categories: [], countries: [], demo: false }),
    [auth, setAuth] = useState(null),
    [message, setMessage] = useState(null),
    [epoch, setEpoch] = useState(0),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState(""),
    [unread, setUnread] = useState(0),
    [bootError, setBootError] = useState("");
  const toast = (text, type = "success") =>
    setMessage({ text, type, time: Date.now() });
  const bump = () => setEpoch((x) => x + 1);
  const requireAuth = () => {
    if (user) return true;
    setAuth("login");
    return false;
  };
  useEffect(() => {
    Promise.all([api("/auth/me"), api("/meta")])
      .then(([u, m]) => {
        setUser(u.user);
        setMeta(m);
      })
      .catch((e) => setBootError(e.message))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    document.documentElement.dataset.theme = user?.theme || "light";
  }, [user?.theme]);
  useEffect(() => {
    setMenu(false);
  }, [route.path]);
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let active = true;
    const load = () =>
      api("/notifications")
        .then((d) => {
          if (active) setUnread(d.unread);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [user?.id, epoch]);
  async function logout() {
    try {
      await send("/auth/logout");
      setUser(null);
      go("/");
      toast("You’ve signed out");
    } catch (e) {
      toast(e.message, "error");
    }
  }
  if (!ready)
    return (
      <div className="startup">
        <Logo />
        <div className="spinner" />
        <p>A fresh perspective is on its way.</p>
      </div>
    );
  if (bootError)
    return (
      <div className="startup">
        <Logo />
        <h2>We couldn’t reach Newsline.</h2>
        <p>{bootError}</p>
        <Button onClick={() => location.reload()}>Try again</Button>
        <small>
          Start the application with START-WINDOWS.cmd or npm start.
        </small>
      </div>
    );
  let page;
  const path = route.path;
  if (path === "/") page = <HomePage />;
  else if (path === "/following")
    page = (
      <Gate>
        <HomePage following />
      </Gate>
    );
  else if (path === "/explore") page = <ExplorePage params={route.params} />;
  else if (path === "/publishers") page = <PublishersPage />;
  else if (path.startsWith("/publisher/"))
    page = <PublisherPage id={path.split("/")[2]} />;
  else if (path.startsWith("/article/"))
    page = <Reader key={path} id={path.split("/")[2]} />;
  else if (path === "/saved")
    page = (
      <Gate>
        <SavedPage />
      </Gate>
    );
  else if (path === "/history")
    page = (
      <Gate>
        <HistoryPage />
      </Gate>
    );
  else if (path === "/notifications")
    page = (
      <Gate>
        <NotificationsPage />
      </Gate>
    );
  else if (path === "/settings")
    page = (
      <Gate>
        <SettingsPage />
      </Gate>
    );
  else if (path === "/profile")
    page = (
      <Gate>
        <ProfilePage />
      </Gate>
    );
  else if (path === "/studio")
    page = (
      <Gate>
        <StudioPage />
      </Gate>
    );
  else if (path === "/write" || path.startsWith("/edit/"))
    page = (
      <Gate>
        <EditorPage key={path} id={path.split("/")[2]} />
      </Gate>
    );
  else if (path === "/admin")
    page = (
      <Gate>
        <AdminPage />
      </Gate>
    );
  else if (path === "/about" || path === "/help")
    page = <AboutPage help={path === "/help"} />;
  else
    page = (
      <div className="empty">
        <h1>This page has moved.</h1>
        <a className="btn primary" href="#/">
          Back to today
        </a>
      </div>
    );
  return (
    <Context.Provider
      value={{
        user,
        setUser,
        ready,
        meta,
        auth,
        setAuth,
        toast,
        requireAuth,
        epoch,
        bump,
        route,
      }}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <div className={"app-shell " + (menu ? "menu-open" : "")}>
        {menu && (
          <button
            className="mobile-scrim"
            onClick={() => setMenu(false)}
            aria-label="Close navigation"
          />
        )}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <Logo />
            <IconButton title="Close navigation" onClick={() => setMenu(false)}>
              <X size={18} />
            </IconButton>
          </div>
          <p className="nav-label">YOUR DAILY PERSPECTIVE</p>
          <nav className="primary-nav" aria-label="Primary navigation">
            {mainNav.map(([href, label, Icon]) => (
              <a
                key={href}
                href={"#" + href}
                aria-current={path === href ? "page" : undefined}
                className={path === href ? "active" : ""}
              >
                <Icon size={19} />
                <span>{label}</span>
                {path === href && <span className="nav-dot" />}
              </a>
            ))}
          </nav>
          <div className="sidebar-divider" />
          <p className="nav-label">YOUR SPACE</p>
          <nav className="primary-nav" aria-label="Your space">
            <a className={path === "/studio" ? "active" : ""} href="#/studio">
              <PenLine size={19} /> Creator studio
            </a>
            <a className={path === "/history" ? "active" : ""} href="#/history">
              <Clock size={19} /> Reading history
            </a>
            {user?.role === "admin" && (
              <a className={path === "/admin" ? "active" : ""} href="#/admin">
                <Shield size={19} /> Administration
              </a>
            )}
          </nav>
          <div className="sidebar-promo">
            <span className="promo-spark">✳</span>
            <h3>
              A feed that feels
              <br />
              like you.
            </h3>
            <p>Follow the ideas and voices that matter to you.</p>
            <a href={user ? "#/settings" : "#/explore"}>
              Find your perspective <ArrowUpRight size={16} />
            </a>
          </div>
          <nav className="primary-nav sidebar-bottom">
            <a href="#/settings">
              <Settings size={18} />
              Settings
            </a>
            <a href="#/help">
              <HelpCircle size={18} />
              Help & information
            </a>
          </nav>
          <div className="sidebar-user">
            {user ? (
              <>
                <a href="#/profile" className="avatar">
                  {initials(user.name)}
                </a>
                <a href="#/profile" className="user-name">
                  <strong>{user.name}</strong>
                  <span>
                    {user.role === "reader"
                      ? "Curious mind"
                      : user.role === "editor"
                        ? "Newsline editor"
                        : "Administrator"}
                  </span>
                </a>
                <IconButton title="Sign out" onClick={logout}>
                  <LogOut size={16} />
                </IconButton>
              </>
            ) : (
              <Button className="full" onClick={() => setAuth("login")}>
                Sign in <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="mobile-header">
              <IconButton title="Open navigation" onClick={() => setMenu(true)}>
                <Menu size={23} />
              </IconButton>
              <Logo />
            </div>
            <div className="edition">
              <span className="live-dot" />
              {meta.demo ? "THE DEMO EDITION" : "YOUR DAILY EDITION"}
              <span className="edition-line" />
              Independent perspectives
            </div>
            <form
              className="header-search"
              onSubmit={(e) => {
                e.preventDefault();
                go("/explore?q=" + encodeURIComponent(search));
              }}
            >
              <Search size={17} />
              <input
                aria-label="Search stories"
                placeholder="Search stories, topics and ideas…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <div className="header-actions">
              <button
                className="notification-btn icon-btn"
                aria-label="Notifications"
                title="Notifications"
                onClick={() => requireAuth() && go("/notifications")}
              >
                <Bell size={20} />
                {unread > 0 && <span />}
              </button>
              {user ? (
                <a
                  className="avatar small"
                  href="#/profile"
                  aria-label="Your profile"
                >
                  {initials(user.name)}
                </a>
              ) : (
                <Button variant="secondary" onClick={() => setAuth("login")}>
                  Sign in
                </Button>
              )}
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="page-container">
            {page}
          </main>
          <footer className="footer">
            <span>© {new Date().getFullYear()} Newsline. Stay curious.</span>
            <div>
              <a href="#/about">About</a>
              <a href="#/about">Privacy</a>
              <a href="#/help">Help</a>
              {meta.demo && (
                <span className="demo-note">Sample editorial content</span>
              )}
            </div>
          </footer>
        </div>
        <nav className="mobile-bottom" aria-label="Mobile navigation">
          {mainNav.map(([href, label, Icon]) => (
            <a
              href={"#" + href}
              key={href}
              className={path === href ? "active" : ""}
            >
              <Icon size={20} />
              <span>{label === "Saved stories" ? "Saved" : label}</span>
            </a>
          ))}
          <a href="#/profile" className={path === "/profile" ? "active" : ""}>
            <span className="avatar tiny">{initials(user?.name)}</span>
            <span>Profile</span>
          </a>
        </nav>
      </div>
      {auth && <Auth key={auth} />}{" "}
      {user && !user.onboarded && !auth && <Onboarding />}
      {message && (
        <div className={"toast " + message.type} role="status">
          {message.text}
          <button aria-label="Dismiss message" onClick={() => setMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
