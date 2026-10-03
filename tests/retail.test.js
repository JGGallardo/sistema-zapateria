import test from "node:test";
import assert from "node:assert/strict";
import { seed, applyAction, sell } from "../server/domain.js";

test("Recepción en matriz valida todo antes de ingresar unidades", () => {
  const s = seed("A"),
    p = s.products[0],
    v = p.variants[0],
    before = structuredClone(s);
  assert.throws(() =>
    applyAction(s, "receive", {
      productId: p.id,
      reason: "Remito 123",
      items: [
        { variantId: v.id, quantity: 4 },
        { variantId: "foreign", quantity: 1 },
      ],
    }),
  );
  assert.deepEqual(s, before);
  applyAction(s, "receive", {
    productId: p.id,
    reason: "Remito 123",
    items: [{ variantId: v.id, quantity: 4 }],
  });
  assert.equal(v.stock, 10);
  assert.equal(s.movements[0].quantity, 4);
  assert.throws(
    () =>
      applyAction(s, "stock", {
        variantId: v.id,
        expected: 6,
        delta: 1,
        reason: "Conteo físico",
      }),
    /cambió/,
  );
  assert.equal(v.stock, 10);
});
test("Descuento, reintento idempotente y devolución única conservan stock y efectivo", () => {
  const s = seed("A");
  s.cash.open = true;
  const v = s.products[0].variants[0],
    input = {
      items: [{ variantId: v.id, quantity: 2 }],
      payment: "Efectivo",
      customer: "",
      discount: 10,
      requestId: crypto.randomUUID(),
    };
  const sale = sell(s, input);
  assert.equal(sale.total, 15282000);
  sell(s, input);
  assert.equal(s.sales.length, 1);
  assert.equal(v.stock, 4);
  assert.throws(() => sell(s, { ...input, discount: 20 }), /otros datos/);
  applyAction(s, "return", { id: sale.id, reason: "No corresponde el talle" });
  assert.equal(v.stock, 6);
  assert.equal(s.cash.balance, 0);
  assert.throws(() =>
    applyAction(s, "return", { id: sale.id, reason: "Segundo intento" }),
  );
  assert.equal(v.stock, 6);
});
test("Edición conserva el precio histórico y archivo impide nuevas ventas", () => {
  const s = seed("A");
  s.cash.open = true;
  const p = s.products[0],
    sale = sell(s, {
      items: [{ variantId: p.variants[0].id, quantity: 1 }],
      payment: "Tarjeta",
      customer: "",
    });
  applyAction(s, "product-edit", { ...p, price: 10000 });
  assert.equal(sale.items[0].price, 8490000);
  applyAction(s, "product-archive", { id: p.id, archived: true });
  assert.throws(() =>
    sell(s, {
      items: [{ variantId: p.variants[0].id, quantity: 1 }],
      payment: "Tarjeta",
      customer: "",
    }),
  );
  assert.equal(s.sales.length, 1);
});
test("Caja impide retiros excesivos y registra diferencia de cierre", () => {
  const s = seed("A");
  applyAction(s, "cash", { open: true, balance: 10000 });
  assert.throws(() =>
    applyAction(s, "cash-movement", { amount: -10001, reason: "Retiro" }),
  );
  applyAction(s, "cash-movement", {
    amount: -2000,
    reason: "Retiro de efectivo",
  });
  applyAction(s, "cash", { open: false, balance: 0, counted: 7900 });
  assert.deepEqual(
    { ...s.cash.lastClose, date: null },
    { expected: 8000, counted: 7900, difference: -100, date: null },
  );
  applyAction(s, "cash", { open: true, balance: 7900 });
  assert.equal(s.cash.lastClose.difference, -100);
});
