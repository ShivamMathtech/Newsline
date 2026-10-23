import { createApp } from "./app.mjs";
const app = await createApp();
const port = Number(process.env.PORT || 3001),
  host = process.env.HOST || "127.0.0.1";
app.server.listen(port, host, () => {
  console.log(`Newsline API: http://${host}:${port}`);
  console.log(`Demo content: ${app.config.demo ? "enabled" : "disabled"}`);
});
app.server.on("error", (e) => {
  console.error(
    e.code === "EADDRINUSE"
      ? `Port ${port} is in use. Choose another PORT in .env.`
      : e,
  );
  process.exit(1);
});
for (const sig of ["SIGINT", "SIGTERM"])
  process.on(sig, () => app.close().then(() => process.exit(0)));
