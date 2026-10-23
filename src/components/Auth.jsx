import { useState } from "react";
import {
  ArrowRight,
  Check,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { useApp, send } from "../lib.jsx";
import { Modal, Button, Field, Logo, PublisherMark } from "./UI.jsx";
export default function Auth() {
  const { auth: initial, setAuth, setUser, meta, toast } = useApp();
  const [mode, setMode] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [show, setShow] = useState(false);
  const [value, setValue] = useState({
    name: "",
    email: "",
    password: "",
    token: "",
  });
  const update = (key, v) => setValue((p) => ({ ...p, [key]: v }));
  const titles = {
    login: "Welcome back.",
    register: "Your next perspective starts here.",
    forgot: "Forgot your password?",
    reset: "A fresh start.",
  };
  const login = async (email, password) => {
    const data = await send("/auth/login", "POST", { email, password });
    setUser(data.user);
    setAuth(null);
    toast("Good to see you, " + data.user.name.split(" ")[0]);
  };
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await login(value.email, value.password);
      else if (mode === "register") {
        const d = await send("/auth/register", "POST", value);
        setUser(d.user);
        setAuth(null);
        toast("Your account is ready");
      } else if (mode === "forgot") {
        const d = await send("/auth/forgot", "POST", { email: value.email });
        setNotice(d.message);
        setMode("reset");
      } else {
        await send("/auth/reset", "POST", {
          token: value.token,
          password: value.password,
        });
        setNotice("Password updated. You can sign in now.");
        setMode("login");
        setValue((p) => ({ ...p, password: "" }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Your Newsline account" onClose={() => setAuth(null)}>
      <div className="auth-intro">
        <Logo />
        <h2>{titles[mode]}</h2>
        <p>
          {mode === "login"
            ? "A world of stories. A space that’s yours."
            : mode === "register"
              ? "Follow your curiosity. We’ll take care of the rest."
              : "We’ll help you get back to your stories."}
        </p>
      </div>
      {notice && <div className="notice">{notice}</div>}
      <form onSubmit={submit} className="form-stack">
        {mode === "register" && (
          <Field label="Full name">
            <input
              autoComplete="name"
              required
              minLength={2}
              maxLength={70}
              value={value.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Your name"
            />
          </Field>
        )}
        {mode !== "reset" && (
          <Field label="Email address">
            <input
              autoComplete="email"
              type="email"
              required
              value={value.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
        )}
        {mode === "reset" && (
          <Field
            label="Reset token"
            hint="For this local demo, copy the token from data/mail-outbox.jsonl in the project folder."
          >
            <input
              required
              value={value.token}
              onChange={(e) => update("token", e.target.value)}
              placeholder="Paste the reset token"
            />
          </Field>
        )}
        {mode !== "forgot" && (
          <Field
            label={mode === "reset" ? "New password" : "Password"}
            hint={
              mode === "register" || mode === "reset"
                ? "Use at least 10 characters."
                : undefined
            }
          >
            <div className="password-field">
              <input
                type={show ? "text" : "password"}
                required
                minLength={mode === "login" ? 1 : 10}
                maxLength={128}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={value.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
        )}
        {mode === "login" && (
          <button
            type="button"
            className="text-link right"
            onClick={() => {
              setMode("forgot");
              setError("");
              setNotice("");
            }}
          >
            Forgot password?
          </button>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <Button disabled={busy} type="submit">
          {busy
            ? "One moment…"
            : mode === "login"
              ? "Sign in"
              : mode === "register"
                ? "Create account"
                : mode === "forgot"
                  ? "Create reset email"
                  : "Reset password"}
          <ArrowRight size={17} />
        </Button>
      </form>
      <p className="auth-switch">
        {mode === "login"
          ? "New to Newsline? "
          : mode === "register"
            ? "Already have an account? "
            : ""}
        <button
          className="text-link"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
            setNotice("");
          }}
        >
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </p>
      {meta.demo && mode === "login" && (
        <div className="demo-logins">
          <span>
            <ShieldCheck size={14} /> Explore with a demo account
          </span>
          <div>
            {[
              ["Reader", "demo"],
              ["Editor", "editor"],
              ["Admin", "admin"],
            ].map(([label, name]) => (
              <button
                disabled={busy}
                key={name}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await login(name + "@newsline.local", "Newsline@123");
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="fine-print">
        By continuing, you agree to the{" "}
        <a href="#/about" onClick={() => setAuth(null)}>
          Newsline community guidelines
        </a>
        .
      </p>
    </Modal>
  );
}
export function Onboarding() {
  const { user, setUser, meta, toast } = useApp();
  const [step, setStep] = useState(0),
    [topics, setTopics] = useState(user.topics || []),
    [country, setCountry] = useState(user.country),
    [busy, setBusy] = useState(false);
  async function finish() {
    setBusy(true);
    try {
      const d = await send("/me", "PATCH", {
        topics,
        country,
        onboarded: true,
      });
      setUser(d.user);
      toast("Your reading journey is ready");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Make Newsline yours" onClose={finish}>
      <div className="onboard-progress">
        <span className="active" />
        <span className={step === 1 ? "active" : ""} />
      </div>
      <div className="auth-intro">
        <span className="eyebrow">A LITTLE ABOUT YOU</span>
        <h2>{step === 0 ? "Follow your curiosity." : "Where’s home?"}</h2>
        <p>
          {step === 0
            ? "Choose a few topics. Your “For you” feed will start here."
            : "Save your region preference. You can change it anytime."}
        </p>
      </div>
      {step === 0 ? (
        <div className="topic-picker">
          {meta.categories.map((c) => (
            <button
              key={c}
              className={topics.includes(c) ? "selected" : ""}
              onClick={() =>
                setTopics(
                  topics.includes(c)
                    ? topics.filter((t) => t !== c)
                    : [...topics, c],
                )
              }
            >
              <span>{c}</span>
              {topics.includes(c) ? <Check size={18} /> : <span>+</span>}
            </button>
          ))}
        </div>
      ) : (
        <Field label="Country">
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {meta.countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      )}
      <div className="modal-actions">
        {step === 1 && (
          <Button variant="secondary" onClick={() => setStep(0)}>
            Back
          </Button>
        )}
        <Button
          disabled={busy}
          onClick={() => (step === 0 ? setStep(1) : finish())}
        >
          {step === 0 ? "Continue" : "Let’s explore"}
          <ArrowRight size={16} />
        </Button>
      </div>
      <p className="fine-print">
        English edition. Stories are not geographically filtered in this
        release.
      </p>
    </Modal>
  );
}
