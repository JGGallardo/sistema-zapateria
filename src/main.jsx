import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Wallet,
  BarChart3,
  Settings,
  ChevronDown,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  Bell,
  LogOut,
  X,
  Check,
  Store,
  Tag,
  SlidersHorizontal,
  Download,
  Minus,
  Footprints,
  Shirt,
  AlertTriangle,
  Menu,
} from "lucide-react";
import "./style.css";
const pagesDemo = __PAGES_DEMO__;
const browserApi = pagesDemo
  ? import("./demo-api.js").then(({ createDemoApi }) =>
      createDemoApi(localStorage, sessionStorage),
    )
  : null;
const money = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n / 100);
const date = (n) =>
  new Date(n).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
async function api(path, body) {
  if (pagesDemo) {
    const call = () => browserApi.then((demoApi) => demoApi(path, body));
    return navigator.locks
      ? navigator.locks.request("paso-pages-demo", call)
      : call();
  }
  const r = await fetch("/api" + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "No se pudo completar la operación");
  return d;
}
const nav = [
  [
    "GENERAL",
    [
      ["Resumen", LayoutDashboard],
      ["Nueva venta", ShoppingCart],
      ["Ventas", ShoppingBag],
      ["Caja", Wallet],
    ],
  ],
  [
    "CATÁLOGO",
    [
      ["Productos", Package],
      ["Inventario", Boxes],
      ["Atributos", Tag],
    ],
  ],
  [
    "TU NEGOCIO",
    [
      ["Clientes", Users],
      ["Reportes", BarChart3],
      ["Configuración", Settings],
    ],
  ],
];
function App() {
  const [tenants, setTenants] = useState(null),
    [tenant, setTenant] = useState(""),
    [data, setData] = useState(null),
    [page, setPage] = useState("Resumen"),
    [modal, setModal] = useState(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("Todas"),
    [cart, setCart] = useState([]),
    [busy, setBusy] = useState(false),
    [demo, setDemo] = useState(false),
    [menu, setMenu] = useState(false);
  async function loadTenants() {
    const ts = await api("/tenants");
    setTenants(ts);
    setTenant(ts[0]?.id || "");
  }
  useEffect(() => {
    api("/config").then((c) => setDemo(c.demo));
    loadTenants().catch(() => setTenants([]));
  }, []);
  useEffect(() => {
    if (!tenant) return;
    let active = true;
    setData(null);
    setCart([]);
    setQuery("");
    setCategory("Todas");
    api(`/t/${tenant}/state`)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [tenant]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    function key(e) {
      if (e.key === "Escape") setModal(null);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function go(p) {
    setPage(p);
    setQuery("");
    setCategory("Todas");
    setMenu(false);
  }
  async function mutate(action, body) {
    setBusy(true);
    setError("");
    try {
      const d = await api(`/t/${tenant}/${action}`, body);
      setData(d);
      setModal(null);
      setToast("Cambios guardados correctamente");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function exportStock() {
    const rows = [
      [
        "Producto",
        "Marca",
        "Categoria",
        "SKU",
        "Talle",
        "Color",
        "Stock",
        "Precio",
      ],
      ...data.products.flatMap((p) =>
        p.variants.map((v) => [
          p.name,
          p.brand,
          p.category,
          v.sku,
          v.size,
          v.color,
          v.stock,
          p.price / 100,
        ]),
      ),
    ];
    const blob = new Blob(
      [
        "\ufeff" +
          rows
            .map((r) =>
              r
                .map(
                  (v) =>
                    '"' +
                    String(v)
                      .replaceAll('"', '""')
                      .replace(/^[=+@-]/, "'") +
                    '"',
                )
                .join(";"),
            )
            .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventario-paso.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (tenants === null) return <div className="loading">Cargando Paso…</div>;
  if (!tenants.length)
    return (
      <div className="login">
        <div className="login-art">
          <Logo />
          <span className="eyebrow">HECHO PARA EL COMERCIO QUE SE MUEVE</span>
          <h1>
            Cada venta,
            <br />
            un paso adelante.
          </h1>
          <p>
            Tu stock, tus clientes y todos tus negocios.
            <br />
            Un solo lugar para tener todo bajo control.
          </p>
          <Footprints size={180} strokeWidth={0.6} />
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const f = new FormData(e.currentTarget);
              await api("/login", Object.fromEntries(f));
              await loadTenants();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="eyebrow">BIENVENIDO A PASO</span>
          <h2>Tu negocio empieza acá.</h2>
          <p>
            {pagesDemo
              ? "Explorá la demo pública. Los datos se guardan solo en este navegador y no se comparten entre dispositivos."
              : "Ingresá para continuar a tu espacio de trabajo."}
          </p>
          {!pagesDemo && (
            <>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                />
              </label>
              <label>
                Contraseña
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {!pagesDemo && (
            <button className="primary" disabled={busy}>
              Ingresar <ArrowRight size={17} />
            </button>
          )}
          {demo && (
            <>
              <div className="divider">
                {pagesDemo ? "DEMO INTERACTIVA" : "O EXPLORÁ EL SISTEMA"}
              </div>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api("/demo", {});
                    await loadTenants();
                    setError("");
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Entrar al espacio de demostración <ArrowRight size={16} />
              </button>
              <small>
                {pagesDemo
                  ? "Usá datos ficticios. No ingreses información real de clientes."
                  : "Datos de ejemplo. Los cambios se guardan en este equipo."}
              </small>
            </>
          )}
        </form>
      </div>
    );
  const products = data?.products || [],
    variants = products.flatMap((p) =>
      p.variants.map((v) => ({ ...v, product: p })),
    ),
    low = variants.filter((v) => v.stock <= v.product.min),
    sales = data?.sales || [];
  const total = sales.reduce((n, s) => n + s.total, 0),
    today = sales.filter(
      (s) =>
        new Date(s.date).toLocaleDateString("en-CA", {
          timeZone: "America/Argentina/Buenos_Aires",
        }) ===
        new Date().toLocaleDateString("en-CA", {
          timeZone: "America/Argentina/Buenos_Aires",
        }),
    );
  const todayTotal = today.reduce((n, s) => n + s.total, 0);
  const filtered = products.filter(
    (p) =>
      (category === "Todas" || p.category === category) &&
      `${p.name} ${p.brand} ${p.category} ${p.variants.map((v) => v.sku).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const cartTotal = cart.reduce((n, i) => n + i.price * i.quantity, 0);
  function addCart(p, v) {
    setCart((c) => {
      const old = c.find((i) => i.variantId === v.id);
      if ((old?.quantity || 0) >= v.stock) {
        setError("No hay más stock disponible para esta variante.");
        return c;
      }
      return old
        ? c.map((i) =>
            i.variantId === v.id ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [
            ...c,
            {
              variantId: v.id,
              name: p.name,
              size: v.size,
              color: v.color,
              price: p.price,
              quantity: 1,
            },
          ];
    });
  }
  return (
    <div className="app">
      <aside className={menu ? "sidebar show" : "sidebar"}>
        <Logo />
        <div className="tenant">
          <span className="tenant-icon">
            <Store size={19} />
          </span>
          <div>
            <small>ESPACIO DE TRABAJO</small>
            <select
              aria-label="Negocio activo"
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              disabled={busy}
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <nav>
          {nav.map(([section, links]) => (
            <div className="nav-section" key={section}>
              <small>{section}</small>
              {links.map(([label, Icon]) => (
                <button
                  key={label}
                  className={page === label ? "nav-link active" : "nav-link"}
                  onClick={() => go(label)}
                >
                  <Icon size={18} />
                  {label}
                  {label === "Inventario" && low.length > 0 && (
                    <span className="nav-count">{low.length}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="status-dot" />
          <span>Todo conectado</span>
          <small>v0.1</small>
        </div>
        <button
          className="profile"
          onClick={async () => {
            await api("/logout", {});
            setTenants([]);
            setTenant("");
            setData(null);
          }}
        >
          <span className="avatar">A</span>
          <span>
            <b>Administrador</b>
            <small>Cerrar sesión</small>
          </span>
          <LogOut size={16} />
        </button>
      </aside>
      <div className="workspace">
        <header>
          <div>
            <button
              className="icon mobile"
              aria-label="Abrir menú"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <span>Mi negocio</span>
            <span className="slash">/</span>
            <b>{page}</b>
          </div>
          <div className="header-right">
            <span className="local-badge">
              {pagesDemo
                ? "DEMO · ESTE NAVEGADOR"
                : demo
                  ? "ESPACIO DEMO"
                  : "LOCAL"}
            </span>
            <button
              className="icon bell"
              aria-label="Ver alertas de stock"
              onClick={() => {
                go("Inventario");
                setCategory("Bajo stock");
              }}
            >
              <Bell size={19} />
              {low.length > 0 && <i />}
            </button>
            <span className="avatar small">A</span>
          </div>
        </header>
        <main>
          {error && (
            <div className="error banner" role="alert">
              {error}
              <button aria-label="Cerrar error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {!data ? (
            <div className="loading">Cargando negocio…</div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {page === "Resumen"
                      ? "TU NEGOCIO, DE UN VISTAZO"
                      : "PASO / " + page.toUpperCase()}
                  </span>
                  <h1>
                    {page === "Resumen"
                      ? "Cada paso cuenta."
                      : page === "Nueva venta"
                        ? "Hagamos una nueva venta."
                        : page === "Inventario"
                          ? "Todo tu stock, en orden."
                          : page === "Productos"
                            ? "Tu próxima gran colección."
                            : page}
                  </h1>
                  <p>
                    {page === "Resumen"
                      ? `${new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} · Esto está pasando en ${data.name}.`
                      : {
                          Productos:
                            "Administrá tu catálogo, precios y todas sus variantes.",
                          Inventario:
                            "Controlá cada talle y color. Sin perder de vista ningún detalle.",
                          Ventas:
                            "El historial de ventas de tu negocio, siempre a mano.",
                          Caja: "Controlá el efectivo y los movimientos de tu jornada.",
                          Clientes: "Conocé a quienes eligen tu negocio.",
                          Atributos:
                            "Marcas, categorías, talles y colores de tu catálogo.",
                          Reportes:
                            "Tus números, con la claridad que necesitás.",
                          Configuración:
                            "Un espacio independiente para cada uno de tus negocios.",
                          "Nueva venta":
                            "Elegí productos, agregá sus variantes y registrá el cobro.",
                        }[page]}
                  </p>
                </div>
                <div className="actions">
                  {["Resumen", "Productos"].includes(page) && (
                    <button
                      className="secondary"
                      onClick={() => {
                        setError("");
                        setModal({ type: "product" });
                      }}
                    >
                      <Plus size={16} /> Nuevo producto
                    </button>
                  )}
                  {["Resumen", "Ventas"].includes(page) && (
                    <button
                      className="primary"
                      onClick={() => go("Nueva venta")}
                    >
                      <Plus size={17} /> Nueva venta
                    </button>
                  )}
                  {page === "Inventario" && (
                    <button className="secondary" onClick={exportStock}>
                      <Download size={16} /> Exportar stock
                    </button>
                  )}
                  {page === "Clientes" && (
                    <button
                      className="primary"
                      onClick={() => setModal({ type: "customer" })}
                    >
                      <Plus size={17} /> Nuevo cliente
                    </button>
                  )}
                </div>
              </div>
              {page === "Resumen" && (
                <>
                  <div className="metrics">
                    <Metric
                      label="Ventas de hoy"
                      value={money(todayTotal)}
                      note={`${today.length} ventas registradas`}
                      icon={ShoppingBag}
                      featured
                    />
                    <Metric
                      label="Ventas acumuladas"
                      value={money(total)}
                      note={`${sales.length} ventas en este negocio`}
                      icon={BarChart3}
                    />
                    <Metric
                      label="Ticket promedio"
                      value={money(sales.length ? total / sales.length : 0)}
                      note="Por venta completada"
                      icon={Tag}
                    />
                    <Metric
                      label="Unidades en stock"
                      value={variants
                        .reduce((n, v) => n + v.stock, 0)
                        .toLocaleString("es-AR")}
                      note={`${products.length} productos · ${variants.length} variantes`}
                      icon={Boxes}
                    />
                  </div>
                  <div className="dashboard-grid">
                    <section className="card chart-card">
                      <div className="section-title">
                        <div>
                          <span className="eyebrow">
                            EL RITMO DE TU NEGOCIO
                          </span>
                          <h2>Evolución de ventas</h2>
                        </div>
                        <span className="pill">Últimos 7 días</span>
                      </div>
                      <SalesChart sales={sales} />
                      <div className="chart-foot">
                        <span>
                          <i /> Ventas diarias
                        </span>
                        <span>Los pequeños pasos hacen grandes negocios.</span>
                      </div>
                    </section>
                    <section className="cash-card">
                      <div className="cash-top">
                        <Wallet size={24} />
                        <span
                          className={"pill " + (data.cash.open ? "green" : "")}
                        >
                          {data.cash.open ? "● Caja abierta" : "○ Caja cerrada"}
                        </span>
                      </div>
                      <p>Efectivo en caja</p>
                      <strong>{money(data.cash.balance)}</strong>
                      <div className="cash-meta">
                        <span>
                          NEGOCIO<b>{data.name}</b>
                        </span>
                        <span>
                          MONEDA<b>Pesos argentinos</b>
                        </span>
                      </div>
                      <button onClick={() => go("Caja")}>
                        Gestionar mi caja <ArrowRight size={17} />
                      </button>
                    </section>
                    <section className="card">
                      <div className="section-title">
                        <div>
                          <span className="eyebrow">UN POCO DE ATENCIÓN</span>
                          <h2>
                            Stock para reponer{" "}
                            <span className="count">{low.length}</span>
                          </h2>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => go("Inventario")}
                        >
                          Ver inventario <ArrowUpRight size={15} />
                        </button>
                      </div>
                      {low.length ? (
                        low.slice(0, 4).map((v) => (
                          <div className="stock-row" key={v.id}>
                            <ProductIcon category={v.product.category} />
                            <div>
                              <b>{v.product.name}</b>
                              <small>
                                {v.product.brand} · {v.color} · Talle {v.size}
                              </small>
                            </div>
                            <span className="stock-badge">{v.stock} unid.</span>
                            <button
                              className="icon"
                              aria-label={`Ajustar ${v.product.name} ${v.size} ${v.color}`}
                              onClick={() =>
                                setModal({ type: "stock", variant: v })
                              }
                            >
                              <ArrowUpRight size={17} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <Empty
                          title="Todo en orden"
                          text="Tus variantes tienen stock suficiente."
                        />
                      )}
                    </section>
                    <section className="card collection">
                      <span className="eyebrow">TU CATÁLOGO, SIN LÍMITES</span>
                      <h2>
                        Cada estilo.
                        <br />
                        Cada talle.
                        <br />
                        <em>Todo en su lugar.</em>
                      </h2>
                      <p>
                        Una gestión pensada para zapaterías
                        <br />y marcas de indumentaria.
                      </p>
                      <button
                        className="secondary"
                        onClick={() => go("Productos")}
                      >
                        Explorar productos <ArrowRight size={15} />
                      </button>
                      <Footprints
                        className="collection-art"
                        size={150}
                        strokeWidth={0.6}
                      />
                    </section>
                  </div>
                  <section className="card recent">
                    <div className="section-title">
                      <div>
                        <span className="eyebrow">ACTIVIDAD RECIENTE</span>
                        <h2>Últimas ventas</h2>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => go("Ventas")}
                      >
                        Ver todas <ArrowRight size={16} />
                      </button>
                    </div>
                    <SalesTable
                      sales={sales.slice(0, 5)}
                      onSelect={(s) => setModal({ type: "receipt", sale: s })}
                    />
                  </section>
                </>
              )}
              {["Productos", "Inventario", "Nueva venta"].includes(page) && (
                <div className={page === "Nueva venta" ? "pos-layout" : ""}>
                  <section>
                    <div className="toolbar">
                      <label className="search">
                        <Search size={18} />
                        <input
                          aria-label="Buscar productos"
                          placeholder="Buscar por nombre, marca o SKU…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      <select
                        aria-label="Filtrar categoría"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option>Todas</option>
                        {page === "Inventario" && <option>Bajo stock</option>}
                        {[...new Set(products.map((p) => p.category))].map(
                          (c) => (
                            <option key={c}>{c}</option>
                          ),
                        )}
                      </select>
                      <span className="toolbar-count">
                        {page === "Inventario"
                          ? variants.length + " variantes"
                          : products.length + " productos"}
                      </span>
                    </div>
                    {page === "Inventario" ? (
                      <div className="card table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>PRODUCTO / SKU</th>
                              <th>TALLE</th>
                              <th>COLOR</th>
                              <th>STOCK</th>
                              <th>ESTADO</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {variants
                              .filter(
                                (v) =>
                                  (category === "Todas" ||
                                    (category === "Bajo stock" &&
                                      v.stock <= v.product.min) ||
                                    category === v.product.category) &&
                                  `${v.product.name} ${v.product.brand} ${v.sku}`
                                    .toLowerCase()
                                    .includes(query.toLowerCase()),
                              )
                              .map((v) => (
                                <tr key={v.id}>
                                  <td>
                                    <b>{v.product.name}</b>
                                    <small>{v.sku}</small>
                                  </td>
                                  <td>
                                    <span className="size-tag">{v.size}</span>
                                  </td>
                                  <td>{v.color}</td>
                                  <td>
                                    <b>{v.stock}</b> unid.
                                  </td>
                                  <td>
                                    <span
                                      className={
                                        v.stock <= v.product.min
                                          ? "stock-badge"
                                          : "good-badge"
                                      }
                                    >
                                      {v.stock === 0
                                        ? "Sin stock"
                                        : v.stock <= v.product.min
                                          ? "Bajo stock"
                                          : "Disponible"}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      className="text-button"
                                      onClick={() =>
                                        setModal({ type: "stock", variant: v })
                                      }
                                    >
                                      Ajustar <SlidersHorizontal size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {!variants.length && (
                          <Empty
                            title="Tu inventario empieza acá"
                            text="Creá tu primer producto para agregar variantes."
                          />
                        )}
                      </div>
                    ) : (
                      <div className="product-grid">
                        {filtered.map((p) => (
                          <button
                            key={p.id}
                            className="product-card"
                            onClick={() =>
                              setModal({
                                type:
                                  page === "Nueva venta" ? "variant" : "detail",
                                product: p,
                              })
                            }
                          >
                            <div
                              className={
                                "product-art " +
                                (p.category === "Remeras" ||
                                p.category === "Pantalones"
                                  ? "apparel"
                                  : "")
                              }
                            >
                              <ProductIcon category={p.category} big />
                              <span>{p.category}</span>
                              <span className="product-arrow">
                                <ArrowUpRight size={19} />
                              </span>
                            </div>
                            <div className="product-info">
                              <small>{p.brand}</small>
                              <h3>{p.name}</h3>
                              <div>
                                <strong>{money(p.price)}</strong>
                                <span>
                                  {p.variants.reduce((n, v) => n + v.stock, 0)}{" "}
                                  unid.
                                </span>
                              </div>
                              <p>
                                {[
                                  ...new Set(p.variants.map((v) => v.color)),
                                ].join(" · ")}
                                <span>
                                  {new Set(p.variants.map((v) => v.size)).size}{" "}
                                  talles
                                </span>
                              </p>
                            </div>
                          </button>
                        ))}
                        {!filtered.length && (
                          <Empty
                            title="No hay productos para mostrar"
                            text="Probá otra búsqueda o agregá tu primer producto."
                          />
                        )}
                      </div>
                    )}
                  </section>
                  {page === "Nueva venta" && (
                    <section className="card cart">
                      <div className="section-title">
                        <h2>Venta actual</h2>
                        <span className="count">
                          {cart.reduce((n, i) => n + i.quantity, 0)}
                        </span>
                      </div>
                      {cart.length ? (
                        cart.map((i) => (
                          <div className="cart-item" key={i.variantId}>
                            <b>{i.name}</b>
                            <small>
                              {i.color} · Talle {i.size}
                            </small>
                            <div>
                              <button
                                className="icon"
                                aria-label={`Quitar unidad de ${i.name}`}
                                onClick={() =>
                                  setCart((c) =>
                                    c.flatMap((x) =>
                                      x.variantId === i.variantId
                                        ? x.quantity > 1
                                          ? [{ ...x, quantity: x.quantity - 1 }]
                                          : []
                                        : [x],
                                    ),
                                  )
                                }
                              >
                                <Minus size={14} />
                              </button>
                              <span>{i.quantity}</span>
                              <strong>{money(i.price * i.quantity)}</strong>
                            </div>
                          </div>
                        ))
                      ) : (
                        <Empty
                          title="Tu próxima venta está acá"
                          text="Seleccioná un producto para comenzar."
                        />
                      )}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          if (
                            await mutate("sale", {
                              items: cart.map(({ variantId, quantity }) => ({
                                variantId,
                                quantity,
                              })),
                              customer: f.get("customer"),
                              payment: f.get("payment"),
                            })
                          ) {
                            setCart([]);
                            setToast(
                              "¡Venta registrada! El stock se actualizó.",
                            );
                          }
                        }}
                      >
                        <label>
                          Cliente
                          <select name="customer">
                            <option>Consumidor final</option>
                            {data.customers.map((c) => (
                              <option key={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Medio de pago
                          <select name="payment">
                            <option>Efectivo</option>
                            <option>Transferencia</option>
                            <option>Tarjeta</option>
                          </select>
                        </label>
                        <div className="total">
                          <span>Total</span>
                          <strong>{money(cartTotal)}</strong>
                        </div>
                        {!data.cash.open && (
                          <p className="warning">
                            Abrí la caja para comenzar a vender.
                          </p>
                        )}
                        <button
                          className="primary"
                          disabled={busy || !cart.length || !data.cash.open}
                        >
                          Confirmar venta <ArrowRight size={17} />
                        </button>
                      </form>
                    </section>
                  )}
                </div>
              )}
              {page === "Ventas" && (
                <section className="card">
                  <SalesTable
                    sales={sales}
                    onSelect={(s) => setModal({ type: "receipt", sale: s })}
                  />
                </section>
              )}
              {page === "Caja" && (
                <>
                  <div className="metrics">
                    <Metric
                      label="Estado de caja"
                      value={data.cash.open ? "Abierta" : "Cerrada"}
                      note="Jornada actual"
                      icon={Wallet}
                      featured
                    />
                    <Metric
                      label="Efectivo esperado"
                      value={money(data.cash.balance)}
                      note="Apertura más ventas en efectivo"
                      icon={Wallet}
                    />
                    <Metric
                      label="Cobros de hoy"
                      value={money(todayTotal)}
                      note="Todos los medios de pago"
                      icon={ShoppingBag}
                    />
                  </div>
                  <button
                    className="primary"
                    onClick={() => setModal({ type: "cash" })}
                  >
                    {data.cash.open ? "Cerrar caja" : "Abrir caja"}{" "}
                    <ArrowRight size={16} />
                  </button>
                  <section className="card recent">
                    <div className="section-title">
                      <h2>Movimientos de caja y stock</h2>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>FECHA</th>
                            <th>MOVIMIENTO</th>
                            <th>TIPO</th>
                            <th>IMPORTE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.movements.map((m) => (
                            <tr key={m.id}>
                              <td>{date(m.date)}</td>
                              <td>{m.description}</td>
                              <td>{m.method}</td>
                              <td>
                                {m.method === "Inventario"
                                  ? "—"
                                  : money(m.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!data.movements.length && (
                        <Empty
                          title="Una nueva jornada te espera"
                          text="Abrí la caja con tu saldo inicial."
                        />
                      )}
                    </div>
                  </section>
                </>
              )}
              {page === "Clientes" && (
                <section className="card table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>CLIENTE</th>
                        <th>EMAIL</th>
                        <th>TELÉFONO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.customers.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <b>{c.name}</b>
                          </td>
                          <td>{c.email || "—"}</td>
                          <td>{c.phone || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data.customers.length && (
                    <Empty
                      title="El comienzo de una buena relación"
                      text="Agregá clientes para identificarlos en cada venta."
                    />
                  )}
                </section>
              )}
              {page === "Atributos" && (
                <div className="attribute-grid">
                  {[
                    ["Marcas", products.map((p) => p.brand)],
                    ["Categorías", products.map((p) => p.category)],
                    ["Talles", variants.map((v) => v.size)],
                    ["Colores", variants.map((v) => v.color)],
                  ].map(([title, values]) => (
                    <section className="card" key={title}>
                      <div className="section-title">
                        <h2>{title}</h2>
                        <span className="count">{new Set(values).size}</span>
                      </div>
                      <div className="chips">
                        {[...new Set(values)].map((v) => (
                          <span key={v}>{v}</span>
                        ))}
                      </div>
                      <p className="muted">
                        Se agregan al crear productos en tu catálogo.
                      </p>
                    </section>
                  ))}
                </div>
              )}
              {page === "Reportes" && (
                <>
                  <div className="metrics">
                    <Metric
                      label="Ventas acumuladas"
                      value={money(total)}
                      note="Historial completo"
                      icon={BarChart3}
                      featured
                    />
                    <Metric
                      label="Ganancia bruta"
                      value={money(
                        sales.reduce(
                          (n, s) =>
                            n +
                            s.items.reduce(
                              (a, i) => a + (i.price - i.cost) * i.quantity,
                              0,
                            ),
                          0,
                        ),
                      )}
                      note="Precio menos costo al momento de venta"
                      icon={ArrowUpRight}
                    />
                    <Metric
                      label="Valor de inventario"
                      value={money(
                        products.reduce(
                          (n, p) =>
                            n +
                            p.cost *
                              p.variants.reduce((a, v) => a + v.stock, 0),
                          0,
                        ),
                      )}
                      note="Valuado al costo actual"
                      icon={Package}
                    />
                  </div>
                  <section className="card">
                    <div className="section-title">
                      <h2>Ventas de los últimos 7 días</h2>
                    </div>
                    <SalesChart sales={sales} />
                  </section>
                  <section className="card recent">
                    <div className="section-title">
                      <h2>Cobros por medio de pago</h2>
                    </div>
                    {["Efectivo", "Transferencia", "Tarjeta"].map((p) => (
                      <div className="report-row" key={p}>
                        <span>{p}</span>
                        <strong>
                          {money(
                            sales
                              .filter((s) => s.payment === p)
                              .reduce((n, s) => n + s.total, 0),
                          )}
                        </strong>
                      </div>
                    ))}
                  </section>
                </>
              )}
              {page === "Configuración" && (
                <section className="card settings">
                  <span className="eyebrow">TUS ESPACIOS DE TRABAJO</span>
                  <h2>Un negocio, su propio universo.</h2>
                  <p>
                    Los productos, clientes, ventas y movimientos se mantienen
                    separados en cada negocio.
                  </p>
                  {tenants.map((t) => (
                    <div className="tenant-row" key={t.id}>
                      <Store size={22} />
                      <b>{t.name}</b>
                      {t.id === tenant ? (
                        <span className="good-badge">Activo</span>
                      ) : (
                        <button
                          className="text-button"
                          onClick={() => setTenant(t.id)}
                        >
                          Cambiar <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    className="primary"
                    onClick={() => setModal({ type: "tenant" })}
                  >
                    <Plus size={16} /> Crear negocio
                  </button>
                  <p className="muted">
                    {pagesDemo
                      ? "Demo de GitHub Pages · Datos guardados únicamente en este navegador. Sin cuentas reales ni sincronización."
                      : "Versión local · Base de datos guardada en este equipo."}
                  </p>
                </section>
              )}
              <footer>
                PASO <span>Tu negocio, en movimiento.</span>
                <small>Hecho para crecer con vos.</small>
              </footer>
            </>
          )}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {modal && (
        <div
          className="overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Formulario de operación"
          >
            <button
              className="close icon"
              aria-label="Cerrar"
              onClick={() => setModal(null)}
              disabled={busy}
            >
              <X size={20} />
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {modal.type === "product" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = Object.fromEntries(new FormData(e.currentTarget));
                  mutate("products", {
                    ...f,
                    price: Math.round(Number(f.price) * 100),
                    cost: Math.round(Number(f.cost) * 100),
                    min: Number(f.min),
                    stock: Number(f.stock),
                    sizes: f.sizes
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    colors: f.colors
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  });
                }}
              >
                <span className="eyebrow">HACÉ CRECER TU CATÁLOGO</span>
                <h2>Nuevo producto</h2>
                <label>
                  Nombre
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    autoFocus
                    placeholder="Ej. Zapatillas Urban Court"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Marca
                    <input name="brand" required list="brands" />
                    <datalist id="brands">
                      {[...new Set(products.map((p) => p.brand))].map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </datalist>
                  </label>
                  <label>
                    Categoría
                    <input name="category" required list="categories" />
                    <datalist id="categories">
                      {[
                        "Zapatillas",
                        "Botas",
                        "Sandalias",
                        "Remeras",
                        "Pantalones",
                        "Accesorios",
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </datalist>
                  </label>
                  <label>
                    Precio de venta ($)
                    <input
                      name="price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </label>
                  <label>
                    Costo ($)
                    <input
                      name="cost"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </label>
                  <label>
                    Talles, separados por coma
                    <input name="sizes" required placeholder="36, 37, 38, 39" />
                  </label>
                  <label>
                    Colores, separados por coma
                    <input name="colors" required placeholder="Negro, Blanco" />
                  </label>
                  <label>
                    Stock inicial por variante
                    <input
                      name="stock"
                      type="number"
                      min="0"
                      max="100000"
                      defaultValue="0"
                      required
                    />
                  </label>
                  <label>
                    Alerta de stock mínimo
                    <input
                      name="min"
                      type="number"
                      min="0"
                      defaultValue="3"
                      required
                    />
                  </label>
                </div>
                <p className="muted">
                  Se creará una variante para cada combinación de talle y color.
                </p>
                <button className="primary" disabled={busy}>
                  Guardar producto <Check size={17} />
                </button>
              </form>
            )}
            {["detail", "variant"].includes(modal.type) && (
              <>
                <span className="eyebrow">
                  {modal.product.brand} / {modal.product.category}
                </span>
                <h2>{modal.product.name}</h2>
                <h3>{money(modal.product.price)}</h3>
                <p className="muted">
                  {modal.type === "variant"
                    ? "Elegí una variante para agregar a la venta."
                    : "Disponibilidad por talle y color."}
                </p>
                <div className="variant-list">
                  {modal.product.variants.map((v) => (
                    <div key={v.id}>
                      <span>
                        <b>{v.size}</b> · {v.color}
                      </span>
                      <span>{v.stock} unid.</span>
                      {modal.type === "variant" && (
                        <button
                          className="secondary"
                          disabled={!v.stock}
                          onClick={() => {
                            addCart(modal.product, v);
                            setModal(null);
                          }}
                        >
                          <Plus size={15} /> Agregar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            {modal.type === "stock" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  mutate("stock", {
                    variantId: modal.variant.id,
                    delta: Number(f.get("delta")),
                    reason: f.get("reason"),
                  });
                }}
              >
                <span className="eyebrow">CONTROL DE INVENTARIO</span>
                <h2>Ajustar stock</h2>
                <p>
                  {modal.variant.product.name} · {modal.variant.size} ·{" "}
                  {modal.variant.color}
                </p>
                <p>
                  Stock actual: <b>{modal.variant.stock} unidades</b>
                </p>
                <label>
                  Cantidad a sumar o restar
                  <input
                    autoFocus
                    name="delta"
                    type="number"
                    required
                    placeholder="Ej. 5 o -2"
                  />
                </label>
                <label>
                  Motivo
                  <input
                    name="reason"
                    minLength={3}
                    required
                    placeholder="Ej. Reposición de mercadería"
                  />
                </label>
                <button className="primary" disabled={busy}>
                  Guardar ajuste
                </button>
              </form>
            )}
            {modal.type === "customer" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  mutate(
                    "customers",
                    Object.fromEntries(new FormData(e.currentTarget)),
                  );
                }}
              >
                <h2>Nuevo cliente</h2>
                <label>
                  Nombre y apellido
                  <input autoFocus name="name" minLength={2} required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" />
                </label>
                <label>
                  Teléfono
                  <input name="phone" type="tel" />
                </label>
                <button className="primary" disabled={busy}>
                  Guardar cliente
                </button>
              </form>
            )}
            {modal.type === "cash" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  mutate("cash", {
                    open: !data.cash.open,
                    balance: Math.round(Number(f.get("balance") || 0) * 100),
                  });
                }}
              >
                <h2>{data.cash.open ? "Cerrar jornada" : "Abrir caja"}</h2>
                {data.cash.open ? (
                  <p>
                    El efectivo esperado al cierre es{" "}
                    <strong>{money(data.cash.balance)}</strong>. Las ventas
                    quedarán pausadas hasta la próxima apertura.
                  </p>
                ) : (
                  <label>
                    Efectivo inicial ($)
                    <input
                      autoFocus
                      name="balance"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue="0"
                      required
                    />
                  </label>
                )}
                <button className="primary" disabled={busy}>
                  {data.cash.open ? "Confirmar cierre" : "Comenzar jornada"}
                </button>
              </form>
            )}
            {modal.type === "tenant" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    const t = await api("/tenants", {
                      name: new FormData(e.currentTarget).get("name"),
                    });
                    setTenants((ts) => [...ts, t]);
                    setTenant(t.id);
                    setModal(null);
                    setToast("Negocio creado");
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <h2>Un nuevo negocio</h2>
                <label>
                  Nombre del negocio
                  <input
                    autoFocus
                    name="name"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
                <p className="muted">
                  Comenzarás con un catálogo y una caja independientes.
                </p>
                <button className="primary" disabled={busy}>
                  Crear negocio
                </button>
              </form>
            )}
            {modal.type === "receipt" && (
              <>
                <span className="eyebrow">COMPROBANTE INTERNO · NO FISCAL</span>
                <h2>Venta #{String(modal.sale.number).padStart(4, "0")}</h2>
                <p>
                  {date(modal.sale.date)} · {modal.sale.customer} ·{" "}
                  {modal.sale.payment}
                </p>
                {modal.sale.items.map((i) => (
                  <div className="receipt-row" key={i.variantId}>
                    <span>
                      {i.quantity} × {i.name}
                      <small>
                        {i.color} · Talle {i.size}
                      </small>
                    </span>
                    <b>{money(i.quantity * i.price)}</b>
                  </div>
                ))}
                <div className="total">
                  <span>Total</span>
                  <strong>{money(modal.sale.total)}</strong>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function Logo() {
  return (
    <div className="logo">
      <span className="logo-symbol">p</span>paso
      <span className="logo-dot">.</span>
      <small>RETAIL OS</small>
    </div>
  );
}
function Metric({ label, value, note, icon: Icon, featured }) {
  return (
    <section className={"metric " + (featured ? "featured" : "")}>
      <div>
        <span>{label}</span>
        <Icon size={19} />
      </div>
      <strong>{value}</strong>
      <small>
        {featured && <span className="live-dot" />}
        {note}
      </small>
    </section>
  );
}
function ProductIcon({ category, big }) {
  const Icon = ["Remeras", "Pantalones"].includes(category)
    ? Shirt
    : Footprints;
  return (
    <div className={"product-icon " + (big ? "big" : "")}>
      <Icon size={big ? 90 : 23} strokeWidth={big ? 0.9 : 1.5} />
    </div>
  );
}
function Empty({ title, text }) {
  return (
    <div className="empty">
      <ShoppingBag size={29} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function SalesTable({ sales, onSelect }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>VENTA</th>
            <th>CLIENTE</th>
            <th>FECHA</th>
            <th>MEDIO DE PAGO</th>
            <th>TOTAL</th>
            <th>ESTADO</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id}>
              <td>
                <button className="text-button" onClick={() => onSelect(s)}>
                  #{String(s.number).padStart(4, "0")}{" "}
                  <ArrowUpRight size={14} />
                </button>
              </td>
              <td>{s.customer}</td>
              <td>{date(s.date)}</td>
              <td>{s.payment}</td>
              <td>
                <b>{money(s.total)}</b>
              </td>
              <td>
                <span className="good-badge">Completada</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!sales.length && (
        <Empty
          title="Tu primera venta está por llegar"
          text="Las ventas registradas aparecerán acá."
        />
      )}
    </div>
  );
}
function SalesChart({ sales }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return {
      label: d.toLocaleDateString("es-AR", { weekday: "short" }),
      value: sales
        .filter(
          (s) =>
            new Date(s.date).toLocaleDateString("es-AR") ===
            d.toLocaleDateString("es-AR"),
        )
        .reduce((n, s) => n + s.total, 0),
    };
  });
  const max = Math.max(...days.map((d) => d.value), 10000);
  return (
    <div className="chart">
      <div className="chart-labels">
        {[1, 0.75, 0.5, 0.25, 0].map((i) => (
          <span key={i}>{money(max * i)}</span>
        ))}
      </div>
      <div className="plot">
        <div className="gridlines">
          {[1, 2, 3, 4, 5].map((i) => (
            <i key={i} />
          ))}
        </div>
        <div className="bars">
          {days.map((d, i) => (
            <div className="bar-column" key={i}>
              <div
                className="bar"
                style={{ height: `${Math.max(1, (d.value / max) * 100)}%` }}
                title={money(d.value)}
              >
                <span>{money(d.value)}</span>
              </div>
              <small>{d.label}</small>
            </div>
          ))}
        </div>
        {!sales.length && (
          <span className="chart-empty">Todo listo para tu primera venta</span>
        )}
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
