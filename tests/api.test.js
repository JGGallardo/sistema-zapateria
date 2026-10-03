import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
test("API: autenticación, membresía de negocio, transacciones y persistencia", async () => {
  const dir = mkdtempSync(join(tmpdir(), "paso-test-"));
  const server = spawn(
    process.execPath,
    [resolve("server/index.js"), "--production"],
    {
      env: { ...process.env, PORT: "5189", PASO_DATA_DIR: dir },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  try {
    await new Promise((ok, fail) => {
      const timeout = setTimeout(
        () => fail(Error("Servidor no inició")),
        10000,
      );
      server.stdout.on("data", () => {
        clearTimeout(timeout);
        ok();
      });
      server.once("error", fail);
      server.once("exit", (code) => {
        clearTimeout(timeout);
        fail(Error(`Servidor terminó: ${code}`));
      });
    });
    const base = "http://127.0.0.1:5189/api";
    assert.equal((await fetch(base + "/tenants")).status, 401);
    assert.equal(
      (
        await fetch(base + "/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      403,
    );
    const db = new DatabaseSync(join(dir, "paso.sqlite"));
    db.prepare("INSERT INTO users VALUES(?,?,?,?)").run(
      "test",
      "test@local",
      "unused",
      "unused",
    );
    db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
      "test-session",
      "test",
      Date.now() + 60000,
    );
    const { seed } = await import("../server/domain.js");
    const state = seed("Negocio A");
    state.cash.open = true;
    db.prepare("INSERT INTO tenants VALUES(?,?)").run(
      "a",
      JSON.stringify(state),
    );
    db.prepare("INSERT INTO tenants VALUES(?,?)").run(
      "b",
      JSON.stringify(seed("Privado B")),
    );
    db.prepare("INSERT INTO memberships VALUES(?,?)").run("test", "a");
    const headers = {
      "Content-Type": "application/json",
      Cookie: "paso_session=test-session",
    };
    assert.equal((await fetch(base + "/t/b/state", { headers })).status, 403);
    assert.equal(
      (
        await fetch(base + "/t/b/stock", {
          method: "POST",
          headers,
          body: "{}",
        })
      ).status,
      403,
    );
    const variant = state.products[0].variants[0];
    let response = await fetch(base + "/t/a/sale", {
      method: "POST",
      headers,
      body: JSON.stringify({
        items: [{ variantId: variant.id, quantity: 100 }],
        payment: "Efectivo",
        customer: "",
      }),
    });
    assert.equal(response.status, 400);
    let persisted = JSON.parse(
      db.prepare("SELECT data FROM tenants WHERE id=?").get("a").data,
    );
    assert.equal(persisted.products[0].variants[0].stock, variant.stock);
    response = await fetch(base + "/t/a/sale", {
      method: "POST",
      headers,
      body: JSON.stringify({
        items: [{ variantId: variant.id, quantity: 1 }],
        payment: "Efectivo",
        customer: "",
      }),
    });
    assert.equal(response.status, 200);
    persisted = JSON.parse(
      db.prepare("SELECT data FROM tenants WHERE id=?").get("a").data,
    );
    assert.equal(persisted.products[0].variants[0].stock, variant.stock - 1);
    assert.equal(persisted.sales.length, 1);
    assert.equal(
      JSON.parse(
        db.prepare("SELECT data FROM tenants WHERE id=?").get("b").data,
      ).sales.length,
      0,
    );
    db.close();
  } finally {
    server.kill();
  }
});
