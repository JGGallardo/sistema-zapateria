import express from "express";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { z } from "zod";
import { applyAction, seed } from "./domain.js";
import { installPlatform, tenantAccess } from "./platform.js";
const production = process.argv.includes("--production");
const hosted = process.env.NODE_ENV === "production";
const origin = process.env.APP_ORIGIN || "http://localhost:5173";
if (
  hosted &&
  (!origin.startsWith("https://") ||
    !process.env.PASO_DATA_DIR ||
    !process.env.PASO_CONTROL_SECRET)
)
  throw Error("Configuración de producción incompleta.");
const dataDir = process.env.PASO_DATA_DIR || "data";
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(resolve(dataDir, "paso.sqlite"));
db.exec(
  "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS tenants(id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password TEXT,salt TEXT); CREATE TABLE IF NOT EXISTS memberships(user_id TEXT,tenant_id TEXT,PRIMARY KEY(user_id,tenant_id)); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT,expires INTEGER);",
);
const app = express();
app.disable("x-powered-by");
app.use(
  express.json({
    limit: "100kb",
    verify: (req, res, buffer) => {
      req.rawBody = buffer.toString("utf8");
    },
  }),
);
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "same-origin");
  res.set("X-Frame-Options", "DENY");
  if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
  next();
});
app.get("/api/health", (req, res) => {
  try {
    db.prepare("SELECT 1").get();
    res.json({ ok: true, service: "paso" });
  } catch {
    res.status(503).json({ ok: false });
  }
});
app.use((req, res, next) => {
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.headers.origin &&
    !(
      hosted
        ? [origin]
        : [origin, "http://localhost:5173", "http://127.0.0.1:5173"]
    ).includes(req.headers.origin)
  )
    return res.status(403).json({ error: "Origen no permitido" });
  next();
});
function session(res, user) {
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    token,
    user,
    Date.now() + 86400000,
  );
  res.cookie("paso_session", token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 86400000,
    secure: hosted,
  });
}
app.post("/api/demo", (req, res) => {
  if (production) return res.status(403).json({ error: "Demo deshabilitada" });
  if (!db.prepare("SELECT id FROM users WHERE id=?").get("demo")) {
    const salt = randomBytes(16).toString("hex");
    db.prepare("INSERT INTO users VALUES(?,?,?,?)").run(
      "demo",
      "demo@paso.local",
      scryptSync(randomBytes(32), salt, 64).toString("hex"),
      salt,
    );
    for (const [id, name, empty] of [
      ["central", "Paso · Zapatería", false],
      ["studio", "Distrito · Indumentaria", true],
    ]) {
      db.prepare("INSERT INTO tenants VALUES(?,?)").run(
        id,
        JSON.stringify(seed(name, empty)),
      );
      db.prepare("INSERT INTO memberships VALUES(?,?)").run("demo", id);
    }
  }
  session(res, "demo");
  res.json({ ok: true });
});
const attempts = new Map();
app.post("/api/login", (req, res) => {
  const input = z
    .object({
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((s) => s.toLowerCase()),
      password: z.string().min(1).max(200),
    })
    .parse(req.body);
  const now = Date.now(),
    key = input.email;
  for (const [k, v] of attempts) if (now - v.time > 600000) attempts.delete(k);
  if (attempts.size > 10000)
    return res
      .status(429)
      .json({ error: "Demasiados intentos. Esperá unos minutos." });
  let attempt = attempts.get(key);
  if (!attempt || now - attempt.time > 600000) {
    attempt = { time: now, count: 0 };
    attempts.set(key, attempt);
  }
  if (++attempt.count > 10)
    return res
      .status(429)
      .json({ error: "Demasiados intentos. Esperá 10 minutos." });
  const u = db.prepare("SELECT * FROM users WHERE email=?").get(input.email);
  if (
    !u ||
    !timingSafeEqual(
      scryptSync(input.password, u.salt, 64),
      Buffer.from(u.password, "hex"),
    )
  )
    return res.status(401).json({ error: "Credenciales incorrectas" });
  session(res, u.id);
  attempts.delete(key);
  res.json({ ok: true });
});
app.get("/api/config", (req, res) => res.json({ demo: !production }));
installPlatform(app, db);
app.use("/api", (req, res, next) => {
  const token = req.headers.cookie
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("paso_session="))
    ?.slice(13);
  const s = db
    .prepare("SELECT * FROM sessions WHERE token=? AND expires>?")
    .get(token || "", Date.now());
  if (!s)
    return res.status(401).json({ error: "Iniciá sesión para continuar" });
  req.user = s.user_id;
  next();
});
app.post("/api/logout", (req, res) => {
  const token = req.headers.cookie
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("paso_session="))
    ?.slice(13);
  db.prepare("DELETE FROM sessions WHERE token=?").run(token || "");
  res.clearCookie("paso_session");
  res.json({ ok: true });
});
app.get("/api/tenants", (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT t.* FROM tenants t JOIN memberships m ON t.id=m.tenant_id WHERE m.user_id=?",
      )
      .all(req.user)
      .map((t) => ({ id: t.id, name: JSON.parse(t.data).name })),
  ),
);
app.post("/api/tenants", (req, res) => {
  if (production)
    return res.status(403).json({
      error:
        "Los negocios se administran desde el superadmin de MercadoSimple.",
    });
  const { name } = z
    .object({ name: z.string().trim().min(2).max(80) })
    .parse(req.body);
  const id = crypto.randomUUID();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO tenants VALUES(?,?)").run(
      id,
      JSON.stringify(seed(name, true)),
    );
    db.prepare("INSERT INTO memberships VALUES(?,?)").run(req.user, id);
    db.exec("COMMIT");
    res.json({ id, name });
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
});
app.use("/api/t/:tenant", (req, res, next) => {
  if (
    !db
      .prepare("SELECT 1 FROM memberships WHERE user_id=? AND tenant_id=?")
      .get(req.user, req.params.tenant)
  )
    return res.status(403).json({ error: "No tenés acceso a este negocio" });
  req.tenant = req.params.tenant;
  if (!tenantAccess(db, req.tenant))
    return res.status(403).json({
      error:
        "El acceso de este negocio está suspendido o vencido. Contactá al administrador de MercadoSimple.",
    });
  next();
});
app.get("/api/t/:tenant/state", (req, res) =>
  res.json(
    JSON.parse(
      db.prepare("SELECT data FROM tenants WHERE id=?").get(req.tenant).data,
    ),
  ),
);
app.post("/api/t/:tenant/:action", (req, res) => {
  db.exec("BEGIN IMMEDIATE");
  try {
    const s = JSON.parse(
      db.prepare("SELECT data FROM tenants WHERE id=?").get(req.tenant).data,
    );
    applyAction(s, req.params.action, req.body);
    db.prepare("UPDATE tenants SET data=? WHERE id=?").run(
      JSON.stringify(s),
      req.tenant,
    );
    db.exec("COMMIT");
    res.json(s);
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
});
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Ruta no encontrada" }),
);
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(400).json({
    error:
      err instanceof z.ZodError
        ? "Revisá los campos: hay valores incompletos o inválidos."
        : err.message,
  });
});
if (production) {
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.listen(
  Number(process.env.PORT || 5173),
  process.env.HOST || (hosted ? "0.0.0.0" : "127.0.0.1"),
  () => console.log("Paso disponible en http://localhost:5173"),
);
