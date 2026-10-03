import {
  createHmac,
  timingSafeEqual,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { z } from "zod";
import { seed } from "./domain.js";

export function controlSignature(
  secret,
  method,
  path,
  timestamp,
  nonce,
  actor,
  body = "",
) {
  return createHmac("sha256", secret)
    .update([method, path, timestamp, nonce, actor, body].join("\n"))
    .digest("hex");
}
export function installPlatform(app, db) {
  db.exec(`CREATE TABLE IF NOT EXISTS tenant_meta(tenant_id TEXT PRIMARY KEY,slug TEXT UNIQUE,owner_email TEXT,status TEXT NOT NULL DEFAULT 'active',expires_at TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS control_nonces(nonce TEXT PRIMARY KEY,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS control_audit(id INTEGER PRIMARY KEY,actor TEXT,action TEXT,tenant_id TEXT,created_at TEXT);`);
  app.use("/api/control", (req, res, next) => {
    const secret = process.env.PASO_CONTROL_SECRET;
    const timestamp = req.get("x-paso-timestamp") || "",
      nonce = req.get("x-paso-nonce") || "",
      actor = req.get("x-paso-actor") || "",
      signature = req.get("x-paso-signature") || "";
    if (
      !secret ||
      secret.length < 32 ||
      !/^\d{13}$/.test(timestamp) ||
      Math.abs(Date.now() - Number(timestamp)) > 60000 ||
      !/^[a-f0-9-]{36}$/.test(nonce) ||
      !actor ||
      actor.length > 100 ||
      !/^[a-f0-9]{64}$/.test(signature)
    )
      return res
        .status(401)
        .json({ error: "Solicitud de plataforma no autorizada." });
    const expected = controlSignature(
      secret,
      req.method,
      req.originalUrl,
      timestamp,
      nonce,
      actor,
      req.rawBody || "",
    );
    if (
      !timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expected, "hex"),
      )
    )
      return res
        .status(401)
        .json({ error: "Solicitud de plataforma no autorizada." });
    db.prepare("DELETE FROM control_nonces WHERE expires<?").run(Date.now());
    try {
      db.prepare("INSERT INTO control_nonces VALUES(?,?)").run(
        nonce,
        Date.now() + 120000,
      );
    } catch {
      return res
        .status(409)
        .json({ error: "Solicitud de plataforma ya utilizada." });
    }
    req.controlActor = actor;
    next();
  });
  app.get("/api/control/tenants", (req, res) => {
    res.json({
      tenants: db
        .prepare(
          "SELECT t.id,t.data,m.slug,m.owner_email,m.status,m.expires_at,m.created_at FROM tenants t JOIN tenant_meta m ON m.tenant_id=t.id ORDER BY m.created_at DESC",
        )
        .all()
        .map(({ data, ...t }) => ({ ...t, name: JSON.parse(data).name })),
      appUrl: process.env.APP_ORIGIN || "http://localhost:5173",
    });
  });
  app.post("/api/control/tenants", (req, res) => {
    const p = z
      .object({
        name: z.string().trim().min(2).max(80),
        slug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,47}$/),
        email: z
          .string()
          .email()
          .transform((s) => s.toLowerCase()),
        password: z.string().min(10).max(128).optional(),
        status: z
          .enum(["active", "trial", "suspended", "cancelled"])
          .default("trial"),
        expires_at: z.string().datetime(),
      })
      .parse(req.body);
    const existing = db
      .prepare("SELECT id FROM users WHERE email=?")
      .get(p.email);
    if (!existing && !p.password)
      return res.status(400).json({
        error:
          "El nuevo titular necesita una contraseña de al menos 10 caracteres.",
      });
    if (existing && p.password)
      return res.status(400).json({
        error:
          "El titular ya existe. Dejá vacía la contraseña para vincular su cuenta sin cambiarla.",
      });
    db.exec("BEGIN IMMEDIATE");
    try {
      const id = crypto.randomUUID(),
        userId = existing?.id || crypto.randomUUID();
      if (!existing) {
        const salt = randomBytes(16).toString("hex");
        db.prepare("INSERT INTO users VALUES(?,?,?,?)").run(
          userId,
          p.email,
          scryptSync(p.password, salt, 64).toString("hex"),
          salt,
        );
      }
      db.prepare("INSERT INTO tenants VALUES(?,?)").run(
        id,
        JSON.stringify(seed(p.name, true)),
      );
      db.prepare("INSERT INTO tenant_meta VALUES(?,?,?,?,?,?)").run(
        id,
        p.slug,
        p.email,
        p.status,
        p.expires_at,
        new Date().toISOString(),
      );
      db.prepare("INSERT INTO memberships VALUES(?,?)").run(userId, id);
      audit(db, req.controlActor, "tenant.created", id);
      db.exec("COMMIT");
      res.status(201).json({ id, name: p.name, slug: p.slug });
    } catch (e) {
      db.exec("ROLLBACK");
      if (String(e.message).includes("UNIQUE"))
        throw Error("Ese identificador de negocio ya está en uso.");
      throw e;
    }
  });
  app.put("/api/control/tenants/:id", (req, res) => {
    const p = z
      .object({
        name: z.string().trim().min(2).max(80),
        status: z.enum(["active", "trial", "suspended", "cancelled"]),
        expires_at: z.string().datetime(),
      })
      .parse(req.body);
    const row = db
      .prepare(
        "SELECT t.data FROM tenants t JOIN tenant_meta m ON m.tenant_id=t.id WHERE t.id=?",
      )
      .get(req.params.id);
    if (!row) return res.status(404).json({ error: "Negocio no encontrado." });
    db.exec("BEGIN IMMEDIATE");
    try {
      const state = JSON.parse(row.data);
      state.name = p.name;
      db.prepare("UPDATE tenants SET data=? WHERE id=?").run(
        JSON.stringify(state),
        req.params.id,
      );
      db.prepare(
        "UPDATE tenant_meta SET status=?,expires_at=? WHERE tenant_id=?",
      ).run(p.status, p.expires_at, req.params.id);
      audit(db, req.controlActor, "tenant.updated", req.params.id);
      db.exec("COMMIT");
      res.json({ ok: true });
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  });
}
function audit(db, actor, action, id) {
  db.prepare(
    "INSERT INTO control_audit(actor,action,tenant_id,created_at) VALUES(?,?,?,?)",
  ).run(actor, action, id, new Date().toISOString());
}
export function tenantAccess(db, id) {
  const m = db
    .prepare("SELECT status,expires_at FROM tenant_meta WHERE tenant_id=?")
    .get(id);
  return (
    !m ||
    (["active", "trial"].includes(m.status) &&
      Date.parse(m.expires_at) > Date.now())
  );
}
