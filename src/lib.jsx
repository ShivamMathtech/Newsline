import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
export const Context = createContext(null);
export const useApp = () => useContext(Context);
export async function api(path, options = {}) {
  const res = await fetch("/api" + path, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Newsline-Client": "web",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = res.status;
    throw error;
  }
  return data;
}
export const send = (path, method = "POST", body = {}) =>
  api(path, { method, body });
export function useQuery(path, version = 0) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((x) => x + 1), []);
  useEffect(() => {
    const control = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    api(path, { signal: control.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!control.signal.aborted) setLoading(false);
      });
    return () => control.abort();
  }, [path, version, tick]);
  return { data, error, loading, reload };
}
export function useRoute() {
  const read = () => location.hash.slice(1) || "/";
  const [value, setValue] = useState(read);
  useEffect(() => {
    const f = () => {
      setValue(read());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  const [path, query = ""] = value.split("?");
  return { path, params: new URLSearchParams(query) };
}
export const go = (path) => {
  location.hash = path;
};
export const initials = (name) =>
  name
    ?.split(" ")
    .slice(0, 2)
    .map((x) => x[0])
    .join("") || "N";
export function ago(value) {
  const time = Date.parse(value),
    diff = Date.now() - time;
  if (!Number.isFinite(time)) return "";
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return new Date(time).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
export const date = (value) =>
  new Date(value).toLocaleDateString("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
