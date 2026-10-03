import test from "node:test";
import assert from "node:assert/strict";
import { createDemoApi } from "../src/demo-api.js";
function memory() {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) || null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
}
test("Pages: datos persistentes, negocios separados y rollback de venta inválida", async () => {
  const storage = memory(),
    session = memory(),
    api = createDemoApi(storage, session);
  await assert.rejects(api("/tenants"));
  await api("/demo", {});
  const state = await api("/t/central/state");
  const variant = state.products[0].variants[0];
  await api("/t/central/cash", { open: true, balance: 10000 });
  await api("/t/central/sale", {
    items: [{ variantId: variant.id, quantity: 1 }],
    customer: "Prueba",
    payment: "Efectivo",
  });
  const loaded = await createDemoApi(storage, session)("/t/central/state");
  assert.equal(loaded.products[0].variants[0].stock, variant.stock - 1);
  assert.equal(loaded.sales.length, 1);
  const before = JSON.stringify(loaded);
  await assert.rejects(
    api("/t/central/sale", {
      items: [{ variantId: variant.id, quantity: 100 }],
      customer: "",
      payment: "Efectivo",
    }),
  );
  assert.equal(JSON.stringify(await api("/t/central/state")), before);
  assert.equal((await api("/t/studio/state")).sales.length, 0);
  assert.equal((await api("/t/studio/state")).products.length, 0);
  await api("/logout", {});
  await assert.rejects(api("/tenants"));
  await api("/demo", {});
  assert.equal((await api("/t/central/state")).sales.length, 1);
});
test("Pages: sesiones separadas y errores de almacenamiento no reportan éxito", async () => {
  const storage = memory(),
    api = createDemoApi(storage, memory());
  await api("/demo", {});
  await assert.rejects(createDemoApi(storage, memory())("/tenants"));
  const failed = createDemoApi(
    {
      getItem: () => null,
      setItem: () => {
        throw Error("Quota");
      },
    },
    memory(),
  );
  await assert.rejects(failed("/demo", {}), /No se pudo guardar/);
});
