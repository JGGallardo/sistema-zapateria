import test from "node:test";
import assert from "node:assert/strict";
import { seed, addProduct, sell } from "../server/domain.js";
test("Genera todas las combinaciones únicas de talle y color", () => {
  const s = seed("A", true);
  addProduct(s, {
    name: "Zapato",
    brand: "Marca",
    category: "Calzado",
    price: 10000,
    cost: 5000,
    min: 2,
    stock: 4,
    sizes: ["36", "37", "36"],
    colors: ["Negro", "Blanco"],
  });
  assert.equal(s.products[0].variants.length, 4);
});
test("La venta descuenta la variante correcta y suma efectivo", () => {
  const s = seed("A");
  s.cash.open = true;
  const p = s.products[0],
    v = p.variants[0],
    stock = v.stock;
  sell(s, {
    items: [{ variantId: v.id, quantity: 2 }],
    customer: "Cliente",
    payment: "Efectivo",
  });
  assert.equal(v.stock, stock - 2);
  assert.equal(s.cash.balance, p.price * 2);
  assert.equal(s.sales[0].items[0].cost, p.cost);
});
test("Agrupa líneas duplicadas e impide sobreventa sin mutaciones", () => {
  const s = seed("A");
  s.cash.open = true;
  const v = s.products[0].variants[0];
  const before = JSON.stringify(s);
  assert.throws(() =>
    sell(s, {
      items: [
        { variantId: v.id, quantity: 4 },
        { variantId: v.id, quantity: 4 },
      ],
      customer: "",
      payment: "Efectivo",
    }),
  );
  assert.equal(JSON.stringify(s), before);
});
test("Impide vender variantes pertenecientes a otro negocio", () => {
  const a = seed("A"),
    b = seed("B");
  b.cash.open = true;
  assert.throws(() =>
    sell(b, {
      items: [{ variantId: a.products[0].variants[0].id, quantity: 1 }],
      customer: "",
      payment: "Tarjeta",
    }),
  );
  assert.equal(b.sales.length, 0);
});
test("Exige caja abierta y cantidades enteras positivas", () => {
  const s = seed("A");
  const id = s.products[0].variants[0].id;
  assert.throws(() =>
    sell(s, {
      items: [{ variantId: id, quantity: 1 }],
      customer: "",
      payment: "Efectivo",
    }),
  );
  s.cash.open = true;
  for (const quantity of [-1, 0, 1.5])
    assert.throws(() =>
      sell(s, {
        items: [{ variantId: id, quantity }],
        customer: "",
        payment: "Efectivo",
      }),
    );
});
test("Tarjeta no altera el saldo de efectivo y guarda precio histórico", () => {
  const s = seed("A");
  s.cash.open = true;
  const p = s.products[0],
    price = p.price;
  const sale = sell(s, {
    items: [{ variantId: p.variants[0].id, quantity: 1 }],
    customer: "",
    payment: "Tarjeta",
  });
  p.price = 1;
  assert.equal(s.cash.balance, 0);
  assert.equal(sale.total, price);
});
