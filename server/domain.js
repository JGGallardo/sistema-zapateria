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
            expectedPrice: z.number().int().positive().optional(),
          }),
        )
        .min(1)
        .max(200),
      customer: z.string().max(100),
      payment: z.enum(["Efectivo", "Transferencia", "Tarjeta"]),
      discount: z.number().int().min(0).max(100).default(0),
      requestId: z.string().uuid().optional(),
    })
    .parse(input);
  if (sale.requestId) {
    const prior = state.sales.find((s) => s.requestId === sale.requestId);
    if (prior) {
      if (prior.requestPayload !== JSON.stringify(sale))
        throw Error("Este intento de venta ya fue usado con otros datos.");
      return prior;
    }
  }
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
    if (!v || p.archived || v.stock < quantity)
      throw Error("Stock insuficiente para una de las variantes.");
    if (
      sale.items.some(
        (i) =>
          i.variantId === id &&
          i.expectedPrice !== undefined &&
          i.expectedPrice !== p.price,
      )
    )
      throw Error(
        "El precio cambió. Actualizá la tienda y volvé a armar la venta.",
      );
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
    requestId: sale.requestId,
    requestPayload: sale.requestId ? JSON.stringify(sale) : undefined,
    discount: sale.discount,
    items,
    subtotal: items.reduce((n, i) => n + i.price * i.quantity, 0),
    total: Math.round(
      items.reduce((n, i) => n + i.price * i.quantity, 0) *
        (1 - sale.discount / 100),
    ),
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
    case "product-edit": {
      const input = z
        .object({
          id: z.string(),
          name: productSchema.shape.name,
          brand: productSchema.shape.brand,
          category: productSchema.shape.category,
          price: productSchema.shape.price,
          cost: productSchema.shape.cost,
          min: productSchema.shape.min,
        })
        .parse(body);
      const p = s.products.find((p) => p.id === input.id);
      if (!p) throw Error("Producto no encontrado.");
      Object.assign(p, input);
      break;
    }
    case "product-archive": {
      const input = z
        .object({ id: z.string(), archived: z.boolean() })
        .parse(body);
      const p = s.products.find((p) => p.id === input.id);
      if (!p) throw Error("Producto no encontrado.");
      p.archived = input.archived;
      break;
    }
    case "receive": {
      const input = z
        .object({
          productId: z.string(),
          reason: z.string().trim().min(3).max(150),
          items: z
            .array(
              z.object({
                variantId: z.string(),
                quantity: z.number().int().min(0).max(10000),
              }),
            )
            .min(1)
            .max(600),
        })
        .parse(body);
      const p = s.products.find((p) => p.id === input.productId);
      if (!p || p.archived) throw Error("Producto no disponible.");
      if (
        new Set(input.items.map((i) => i.variantId)).size !==
          input.items.length ||
        input.items.some((i) => !p.variants.some((v) => v.id === i.variantId))
      )
        throw Error("Variantes inválidas.");
      if (!input.items.some((i) => i.quantity > 0))
        throw Error("Ingresá al menos una unidad.");
      for (const i of input.items.filter((i) => i.quantity > 0)) {
        const v = p.variants.find((v) => v.id === i.variantId);
        v.stock += i.quantity;
        s.movements.unshift({
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          description: `Ingreso: ${p.name} · ${v.color} / ${v.size} · +${i.quantity} · ${input.reason}`,
          variantId: v.id,
          quantity: i.quantity,
          amount: 0,
          method: "Inventario",
        });
      }
      break;
    }
    case "return": {
      const input = z
        .object({ id: z.string(), reason: z.string().trim().min(3).max(150) })
        .parse(body);
      const sale = s.sales.find((s) => s.id === input.id);
      if (!sale || sale.returnedAt)
        throw Error("Esta venta no existe o ya fue devuelta.");
      if (!s.cash.open)
        throw Error("Abrí la caja para registrar la devolución.");
      if (sale.payment === "Efectivo" && s.cash.balance < sale.total)
        throw Error("No hay efectivo suficiente para devolver esta venta.");
      for (const i of sale.items) {
        const v = s.products
          .flatMap((p) => p.variants)
          .find((v) => v.id === i.variantId);
        if (!v) throw Error("Una variante ya no existe.");
      }
      for (const i of sale.items)
        s.products
          .flatMap((p) => p.variants)
          .find((v) => v.id === i.variantId).stock += i.quantity;
      sale.returnedAt = new Date().toISOString();
      sale.returnReason = input.reason;
      if (sale.payment === "Efectivo") s.cash.balance -= sale.total;
      s.movements.unshift({
        id: crypto.randomUUID(),
        date: sale.returnedAt,
        description: `Devolución total #${sale.number} · ${input.reason}`,
        amount: -sale.total,
        method: sale.payment,
      });
      break;
    }
    case "cash-movement": {
      const input = z
        .object({
          amount: z
            .number()
            .int()
            .min(-100000000)
            .max(100000000)
            .refine((n) => n !== 0),
          reason: z.string().trim().min(3).max(150),
        })
        .parse(body);
      if (!s.cash.open) throw Error("La caja está cerrada.");
      if (s.cash.balance + input.amount < 0)
        throw Error("El retiro supera el efectivo disponible.");
      s.cash.balance += input.amount;
      s.movements.unshift({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        description: input.reason,
        amount: input.amount,
        method: "Efectivo",
      });
      break;
    }
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
          expected: z.number().int().nonnegative().optional(),
          reason: z.string().trim().min(3).max(150),
        })
        .parse(body);
      const v = s.products
        .flatMap((p) => p.variants)
        .find((v) => v.id === p.variantId);
      if (v && p.expected !== undefined && v.stock !== p.expected)
        throw Error(
          "El stock cambió desde que abriste esta ventana. Actualizá la tienda antes de ajustar.",
        );
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
          counted: z.number().int().nonnegative().max(1000000000).optional(),
        })
        .parse(body);
      if (p.open === s.cash.open)
        throw Error("El estado de caja ya fue modificado.");
      s.cash = {
        ...s.cash,
        open: p.open,
        balance: p.open ? p.balance : s.cash.balance,
      };
      if (!p.open && p.counted !== undefined)
        s.cash.lastClose = {
          expected: s.cash.balance,
          counted: p.counted,
          difference: p.counted - s.cash.balance,
          date: new Date().toISOString(),
        };
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
