import { z } from "zod";
export const productSchema = z.object({
  name: z.string().trim().min(2).max(100),
  brand: z.string().trim().min(1).max(60),
  category: z.string().trim().min(1).max(60),
  price: z.number().int().positive().max(100000000),
  cost: z.number().int().nonnegative().max(100000000),
  min: z.number().int().nonnegative().max(10000),
  sizes: z.array(z.string().trim().min(1).max(12)).min(1).max(30),
  colors: z.array(z.string().trim().min(1).max(30)).min(1).max(20),
  stock: z.number().int().nonnegative().max(100000),
});
export function addProduct(state, input) {
  const p = productSchema.parse(input);
  const id = crypto.randomUUID();
  state.products.push({
    id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    cost: p.cost,
    min: p.min,
    variants: [...new Set(p.colors)].flatMap((color) =>
      [...new Set(p.sizes)].map((size) => ({
        id: crypto.randomUUID(),
        sku: `P-${id.slice(0, 6)}-${color}-${size}`,
        color,
        size,
        stock: p.stock,
      })),
    ),
  });
  return state;
}
export function sell(state, input) {
  const sale = z
    .object({
      items: z
        .array(
          z.object({
            variantId: z.string(),
            quantity: z.number().int().positive().max(10000),
          }),
        )
        .min(1)
        .max(200),
      customer: z.string().max(100),
      payment: z.enum(["Efectivo", "Transferencia", "Tarjeta"]),
    })
    .parse(input);
  if (!state.cash.open)
    throw Error("Abrí la caja antes de registrar una venta.");
  const quantities = new Map();
  for (const i of sale.items)
    quantities.set(
      i.variantId,
      (quantities.get(i.variantId) || 0) + i.quantity,
    );
  const items = [...quantities].map(([id, quantity]) => {
    const p = state.products.find((p) => p.variants.some((v) => v.id === id));
    const v = p?.variants.find((v) => v.id === id);
    if (!v || v.stock < quantity)
      throw Error("Stock insuficiente para una de las variantes.");
    return {
      variantId: id,
      name: p.name,
      size: v.size,
      color: v.color,
      quantity,
      price: p.price,
      cost: p.cost,
    };
  });
  for (const i of items) {
    state.products
      .flatMap((p) => p.variants)
      .find((v) => v.id === i.variantId).stock -= i.quantity;
  }
  const result = {
    id: crypto.randomUUID(),
    number: state.sales.length + 1,
    date: new Date().toISOString(),
    customer: sale.customer || "Consumidor final",
    payment: sale.payment,
    items,
    total: items.reduce((n, i) => n + i.price * i.quantity, 0),
  };
  state.sales.unshift(result);
  if (result.payment === "Efectivo") state.cash.balance += result.total;
  state.movements.unshift({
    id: crypto.randomUUID(),
    date: result.date,
    description: `Venta #${result.number}`,
    amount: result.total,
    method: result.payment,
  });
  return result;
}
export function seed(name, empty = false) {
  const s = {
    name,
    products: [],
    sales: [],
    customers: [],
    movements: [],
    cash: { open: false, balance: 0 },
  };
  if (empty) return s;
  for (const p of [
    {
      name: "Zapatillas Urban Court",
      brand: "Vía Urbana",
      category: "Zapatillas",
      price: 8490000,
      cost: 4200000,
      sizes: ["36", "37", "38", "39", "40"],
      colors: ["Blanco", "Negro"],
      stock: 6,
    },
    {
      name: "Botas Chelsea",
      brand: "Terrano",
      category: "Botas",
      price: 11900000,
      cost: 6400000,
      sizes: ["37", "38", "39", "40"],
      colors: ["Suela", "Negro"],
      stock: 3,
    },
    {
      name: "Remera Essential",
      brand: "Distrito",
      category: "Remeras",
      price: 2850000,
      cost: 1300000,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Blanco", "Negro", "Arena"],
      stock: 12,
    },
    {
      name: "Jean Wide Leg",
      brand: "Distrito",
      category: "Pantalones",
      price: 6590000,
      cost: 3200000,
      sizes: ["36", "38", "40", "42", "44"],
      colors: ["Azul"],
      stock: 8,
    },
    {
      name: "Sandalias Cala",
      brand: "Vía Urbana",
      category: "Sandalias",
      price: 5490000,
      cost: 2500000,
      sizes: ["36", "37", "38", "39"],
      colors: ["Arena"],
      stock: 2,
    },
  ])
    addProduct(s, { ...p, min: 3 });
  return s;
}

export function applyAction(s, action, body) {
  switch (action) {
    case "products":
      addProduct(s, body);
      break;
    case "sale":
      sell(s, body);
      break;
    case "stock": {
      const p = z
        .object({
          variantId: z.string(),
          delta: z.number().int().min(-100000).max(100000),
          reason: z.string().trim().min(3).max(150),
        })
        .parse(body);
      const v = s.products
        .flatMap((p) => p.variants)
        .find((v) => v.id === p.variantId);
      if (!v || v.stock + p.delta < 0)
        throw Error(
          "El ajuste dejaría stock negativo o la variante no existe.",
        );
      v.stock += p.delta;
      s.movements.unshift({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        description: `Stock ${v.sku}: ${p.delta > 0 ? "+" : ""}${p.delta} · ${p.reason}`,
        amount: 0,
        method: "Inventario",
      });
      break;
    }
    case "customers": {
      const c = z
        .object({
          name: z.string().trim().min(2).max(100),
          email: z.union([z.string().email(), z.literal("")]),
          phone: z.string().max(40),
        })
        .parse(body);
      s.customers.push({ ...c, id: crypto.randomUUID() });
      break;
    }
    case "cash": {
      const p = z
        .object({
          open: z.boolean(),
          balance: z.number().int().nonnegative().max(1000000000),
        })
        .parse(body);
      if (p.open === s.cash.open)
        throw Error("El estado de caja ya fue modificado.");
      s.cash = { open: p.open, balance: p.open ? p.balance : s.cash.balance };
      s.movements.unshift({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        description: p.open ? "Apertura de caja" : "Cierre de caja",
        amount: s.cash.balance,
        method: "Caja",
      });
      break;
    }
    default:
      throw Error("Acción desconocida");
  }

  return s;
}
