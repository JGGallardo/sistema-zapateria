import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { controlSignature } from "../server/platform.js";

test("Plataforma: firma, replay, altas aisladas y suspensión inmediata", async () => {
  const secret = "synthetic-control-secret-for-test-only-12345",
    dir = mkdtempSync(join(tmpdir(), "paso-platform-"));
  const child = spawn(
    process.execPath,
    [resolve("server/index.js"), "--production"],
    {
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: "5191",
        PASO_DATA_DIR: dir,
        PASO_CONTROL_SECRET: secret,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  try {
    await new Promise((ok, fail) => {
      const timer = setTimeout(() => fail(Error("Servidor no inició")), 10000);
      child.stdout.once("data", () => {
        clearTimeout(timer);
        ok();
      });
      child.once("error", fail);
      child.once("exit", (c) => {
        clearTimeout(timer);
        fail(Error("Servidor terminó " + c));
      });
    });
    const base = "http://127.0.0.1:5191";
    function request(path, method = "GET", input, patch = {}) {
      const body = input ? JSON.stringify(input) : "",
        timestamp = String(Date.now()),
        nonce = crypto.randomUUID(),
        actor = "platform-fixture";
      return {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-paso-timestamp": timestamp,
          "x-paso-nonce": nonce,
          "x-paso-actor": actor,
          "x-paso-signature": controlSignature(
            secret,
            method,
            path,
            timestamp,
            nonce,
            actor,
            body,
          ),
          ...patch,
        },
        ...(body ? { body } : {}),
      };
    }
    const path = "/api/control/tenants";
    assert.equal((await fetch(base + path)).status, 401);
    const r = request(path);
    assert.equal((await fetch(base + path, r)).status, 200);
    assert.equal((await fetch(base + path, r)).status, 409);
    assert.equal(
      (
        await fetch(
          base + path,
          request(path, "GET", undefined, {
            "x-paso-signature": "0".repeat(64),
          }),
        )
      ).status,
      401,
    );
    const payload = {
      name: "Tienda A",
      slug: "test-a",
      email: "owner@example.test",
      password: "synthetic-password-123",
      status: "active",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };
    const created = await fetch(base + path, request(path, "POST", payload));
    assert.equal(created.status, 201);
    const a = await created.json();
    const b = await (
      await fetch(
        base + path,
        request(path, "POST", {
          ...payload,
          name: "Tienda B",
          slug: "test-b",
          email: "other@example.test",
        }),
      )
    ).json();
    const login = await fetch(base + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
      }),
    });
    assert.equal(login.status, 200);
    const headers = { cookie: login.headers.get("set-cookie").split(";")[0] };
    assert.equal(
      (await fetch(base + "/api/t/" + a.id + "/state", { headers })).status,
      200,
    );
    assert.equal(
      (await fetch(base + "/api/t/" + b.id + "/state", { headers })).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/api/tenants", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Unauthorized" }),
        })
      ).status,
      403,
    );
    const update = path + "/" + a.id;
    assert.equal(
      (
        await fetch(
          base + update,
          request(update, "PUT", {
            name: payload.name,
            status: "suspended",
            expires_at: payload.expires_at,
          }),
        )
      ).status,
      200,
    );
    assert.equal(
      (await fetch(base + "/api/t/" + a.id + "/state", { headers })).status,
      403,
    );
    await fetch(
      base + update,
      request(update, "PUT", {
        name: payload.name,
        status: "active",
        expires_at: new Date(Date.now() - 1).toISOString(),
      }),
    );
    assert.equal(
      (await fetch(base + "/api/t/" + a.id + "/state", { headers })).status,
      403,
    );
    await fetch(
      base + update,
      request(update, "PUT", {
        name: payload.name,
        status: "active",
        expires_at: payload.expires_at,
      }),
    );
    assert.equal(
      (await fetch(base + "/api/t/" + a.id + "/state", { headers })).status,
      200,
    );
    const list = await (await fetch(base + path, request(path))).json();
    assert.equal(list.tenants.length, 2);
    assert(!JSON.stringify(list).includes(payload.password));
  } finally {
    child.kill();
    await new Promise((ok) => child.once("exit", ok));
  }
});
