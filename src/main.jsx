import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Footprints,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  Users,
  Settings,
  Sun,
  Moon,
  Plus,
  Search,
  X,
  ArrowRight,
  ArrowUpRight,
  LogOut,
  Menu,
  Download,
  Check,
  AlertTriangle,
  ChevronRight,
  Shirt,
  Truck,
  Minus,
} from "lucide-react";
import "./style.css";
const pagesDemo = __PAGES_DEMO__;
const browserApi = pagesDemo
  ? import("./demo-api.js").then(({ createDemoApi }) =>
      createDemoApi(localStorage, sessionStorage),
    )
  : null;
async function api(path, body) {
  if (pagesDemo) {
    const call = () => browserApi.then((a) => a(path, body));
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
  if (!r.ok) throw Error(d.error || "No se pudo completar la operación.");
  return d;
}
const money = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(n / 100);
const day = (n) =>
  new Date(n).toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
const datetime = (n) =>
  new Date(n).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
const nav = [
  ["Inicio", LayoutDashboard],
  ["Vender", ShoppingCart],
  ["Productos", Package],
  ["Ventas", Receipt],
  ["Caja", Wallet],
  ["Clientes", Users],
];
const sumStock = (p) => p.variants.reduce((s, v) => s + v.stock, 0);
function Logo() {
  return (
    <div className="logo">
      <span>
        <Footprints size={23} />
      </span>
      paso<span className="logo-dot">.</span>
    </div>
  );
}
function Empty({ children }) {
  return (
    <div className="empty">
      <Package size={28} />
      <p>{children}</p>
    </div>
  );
}
function Field({ label, ...props }) {
  return (
    <label className="field">
      {label}
      <input {...props} />
    </label>
  );
}
function ProductArt({ p }) {
  const Icon = ["Remeras", "Pantalones", "Camperas"].includes(p.category)
    ? Shirt
    : Footprints;
  return (
    <div className={"product-art art-" + (p.name.length % 3)}>
      <Icon size={48} strokeWidth={1.1} />
      <span>{p.category}</span>
    </div>
  );
}
function Modal({ title, onClose, children, busy }) {
  const ref = useRef(null);
  useEffect(() => {
    const old = document.activeElement;
    ref.current?.focus();
    function key(e) {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Tab") {
        const el = [
          ...ref.current.querySelectorAll(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]",
          ),
        ];
        if (e.shiftKey && document.activeElement === el[0]) {
          e.preventDefault();
          el.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === el.at(-1)) {
          e.preventDefault();
          el[0]?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      old?.focus();
    };
  }, [busy]);
  return (
    <div
      className="overlay"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="section-head">
          <h2>{title}</h2>
          <button
            className="icon"
            aria-label="Cerrar ventana"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Matrix({ product, onSelect, mode = "stock" }) {
  const sizes = [...new Set(product.variants.map((v) => v.size))],
    colors = [...new Set(product.variants.map((v) => v.color))];
  return (
    <div className="table-scroll">
      <table className="matrix">
        <thead>
          <tr>
            <th>Color / Talle</th>
            {sizes.map((s) => (
              <th key={s}>{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {colors.map((c) => (
            <tr key={c}>
              <th>{c}</th>
              {sizes.map((s) => {
                const v = product.variants.find(
                  (v) => v.color === c && v.size === s,
                );
                return (
                  <td key={s}>
                    {!v ? (
                      "—"
                    ) : mode === "receive" ? (
                      <input
                        name={v.id}
                        type="number"
                        min="0"
                        max="10000"
                        step="1"
                        defaultValue="0"
                        aria-label={`${c}, talle ${s}`}
                      />
                    ) : (
                      <button
                        className={
                          "stock-cell " +
                          (v.stock === 0
                            ? "zero"
                            : v.stock <= product.min
                              ? "low"
                              : "")
                        }
                        disabled={mode === "sell" && v.stock === 0}
                        aria-label={`${c}, talle ${s}: ${v.stock} disponibles`}
                        onClick={() => onSelect(v)}
                      >
                        {v.stock}
                        <small>{mode === "sell" ? "agregar" : "unid."}</small>
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function App() {
  const [theme, setTheme] = useState(
      () => localStorage.getItem("paso-theme") || "light",
    ),
    [tenants, setTenants] = useState(null),
    [tenant, setTenant] = useState(""),
    [data, setData] = useState(null),
    [demo, setDemo] = useState(false),
    [page, setPage] = useState("Inicio"),
    [tab, setTab] = useState("Catálogo"),
    [menu, setMenu] = useState(false),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("Todas"),
    [stockFilter, setStockFilter] = useState("Todos"),
    [modal, setModal] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [cart, setCart] = useState([]),
    [discount, setDiscount] = useState(0),
    [payment, setPayment] = useState("Efectivo"),
    [customer, setCustomer] = useState(""),
    [received, setReceived] = useState("");
  const saleKey = useRef(crypto.randomUUID());
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("paso-theme", theme);
  }, [theme]);
  async function loadTenants() {
    const t = await api("/tenants");
    setTenants(t);
    setTenant(t[0]?.id || "");
  }
  useEffect(() => {
    api("/config")
      .then((c) => setDemo(c.demo))
      .catch((e) => setError(e.message));
    loadTenants().catch(() => setTenants([]));
  }, []);
  useEffect(() => {
    if (!tenant) return;
    let active = true;
    setData(null);
    setCart([]);
    setError("");
    setModal(null);
    setDiscount(0);
    setCustomer("");
    setQuery("");
    saleKey.current = crypto.randomUUID();
    api(`/t/${tenant}/state`)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [tenant]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  function go(p) {
    setPage(p);
    setQuery("");
    setCategory("Todas");
    setStockFilter("Todos");
    setMenu(false);
    setError("");
  }
  function open(m) {
    setError("");
    setModal(m);
  }
  async function mutate(action, body) {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      const d = await api(`/t/${tenant}/${action}`, body);
      setData(d);
      setModal(null);
      setToast("Listo, los cambios se guardaron.");
      return d;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function themeButton() {
    return (
      <button
        className="theme-button"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        aria-label={
          theme === "light" ? "Activar tema oscuro" : "Activar tema claro"
        }
      >
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        <span>{theme === "light" ? "Oscuro" : "Claro"}</span>
      </button>
    );
  }
  async function logout() {
    try {
      await api("/logout", {});
      setTenants([]);
      setTenant("");
      setData(null);
    } catch (e) {
      setError(e.message);
    }
  }
  if (tenants === null)
    return <div className="loading">Cargando tu espacio…</div>;
  if (!tenants.length)
    return (
      <div className="login">
        <div className="login-story">
          <Logo />
          <div>
            <span className="eyebrow">ZAPATERÍA & INDUMENTARIA</span>
            <h1>
              Tu tienda,
              <br />
              en su mejor
              <br />
              <em>momento.</em>
            </h1>
            <p>
              Menos vueltas. Más ventas.
              <br />
              Cada talle, cada color y cada día bajo control.
            </p>
          </div>
          <span>Un sistema simple para el comercio de todos los días.</span>
        </div>
        <div className="login-panel">
          {themeButton()}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api(
                  "/login",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
                await loadTenants();
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <span className="eyebrow">BIENVENIDO A PASO</span>
            <h2>Entrá a tu tienda</h2>
            <p>
              {pagesDemo
                ? "Probá las herramientas con datos de ejemplo. Esta demo se guarda únicamente en tu navegador."
                : "Todo listo para una nueva jornada."}
            </p>
            {!pagesDemo && (
              <>
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                />
                <Field
                  label="Contraseña"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
                <button className="primary full" disabled={busy}>
                  Ingresar <ArrowRight size={17} />
                </button>
                <p className="hint">
                  Tu cuenta y tus tiendas se habilitan desde el superadmin de
                  MercadoSimple.
                </p>
              </>
            )}
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {demo && (
              <button
                type="button"
                className="secondary full"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api("/demo", {});
                    await loadTenants();
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Explorar tienda de ejemplo <ArrowRight size={17} />
              </button>
            )}
            {pagesDemo && (
              <small>
                Usá información ficticia. No es el sistema de producción.
              </small>
            )}
          </form>
        </div>
      </div>
    );
  const products = data?.products || [],
    active = products.filter((p) => !p.archived),
    variants = active.flatMap((p) =>
      p.variants.map((v) => ({ ...v, product: p })),
    ),
    low = variants.filter((v) => v.stock <= v.product.min),
    sales = data?.sales || [],
    validSales = sales.filter((s) => !s.returnedAt),
    today = validSales.filter((s) => day(s.date) === day(Date.now())),
    todayTotal = today.reduce((n, s) => n + s.total, 0);
  const filtered = products.filter(
    (p) =>
      (stockFilter === "Archivados" ? p.archived : !p.archived) &&
      (category === "Todas" || p.category === category) &&
      (stockFilter !== "Para reponer" ||
        p.variants.some((v) => v.stock <= p.min)) &&
      (stockFilter !== "Sin stock" || p.variants.some((v) => v.stock === 0)) &&
      `${p.name} ${p.brand} ${p.category} ${p.variants.map((v) => `${v.sku} ${v.size} ${v.color}`).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0),
    cartTotal = Math.round(subtotal * (1 - discount / 100));
  function add(p, v) {
    setCart((c) => {
      const i = c.find((i) => i.variantId === v.id);
      if ((i?.quantity || 0) >= v.stock) {
        setError("No quedan más unidades de esta variante.");
        return c;
      }
      saleKey.current = crypto.randomUUID();
      return i
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
    setToast(`${p.name} · ${v.size} agregado`);
  }
  function exportStock() {
    const rows = [
      [
        "Producto",
        "Marca",
        "Categoría",
        "SKU",
        "Talle",
        "Color",
        "Stock",
        "Mínimo",
        "Precio",
      ],
      ...products.flatMap((p) =>
        p.variants.map((v) => [
          p.name,
          p.brand,
          p.category,
          v.sku,
          v.size,
          v.color,
          v.stock,
          p.min,
          p.price / 100,
        ]),
      ),
    ];
    const csv =
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
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock-paso.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function salesTable(list) {
    return list.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Venta</th>
              <th>Cliente</th>
              <th>Pago</th>
              <th>Total</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td>
                  <b>#{String(s.number).padStart(4, "0")}</b>
                  <small>{datetime(s.date)}</small>
                </td>
                <td>{s.customer}</td>
                <td>{s.payment}</td>
                <td>
                  <b>{money(s.total)}</b>
                </td>
                <td>
                  <span className={"badge " + (s.returnedAt ? "warning" : "")}>
                    {s.returnedAt ? "Devuelta" : "Completada"}
                  </span>
                </td>
                <td>
                  <button
                    className="icon"
                    aria-label={`Ver venta ${s.number}`}
                    onClick={() => open({ type: "receipt", sale: s })}
                  >
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty>Todavía no hay ventas. Tu primera venta aparecerá acá.</Empty>
    );
  }
  return (
    <div className="app">
      <aside className={"sidebar " + (menu ? "show" : "")}>
        <Logo />
        <label className="store-select">
          <small>TU TIENDA</small>
          <select
            aria-label="Tienda activa"
            value={tenant}
            disabled={busy}
            onChange={(e) => setTenant(e.target.value)}
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <span className="nav-caption">DÍA A DÍA</span>
        <nav>
          {nav.map(([n, Icon]) => (
            <button
              key={n}
              className={page === n ? "nav-link active" : "nav-link"}
              onClick={() => go(n)}
            >
              <Icon size={19} />
              {n}
              {n === "Productos" && low.length > 0 && (
                <span className="nav-count">{low.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-help">
            <span className="tiny-mark">
              <Footprints size={18} />
            </span>
            <b>Todo a tu ritmo.</b>
            <p>
              Tu tienda ordenada,
              <br />
              tu día más simple.
            </p>
          </div>
          <button
            className={"nav-link " + (page === "Ajustes" ? "active" : "")}
            onClick={() => go("Ajustes")}
          >
            <Settings size={18} />
            Ajustes
          </button>
          <button className="nav-link" onClick={logout}>
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <div className="breadcrumbs">
            <button
              className="icon mobile"
              aria-label="Abrir menú"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <span>Mi tienda</span>
            <ChevronRight size={13} />
            <b>{page}</b>
          </div>
          <div className="header-actions">
            <span className="connection">
              {demo ? "Modo demostración" : "Tu espacio de trabajo"}
            </span>
            {themeButton()}
            <span className="avatar">{data?.name?.charAt(0) || "P"}</span>
          </div>
        </header>
        <main inert={busy}>
          {error && !modal && (
            <div className="error" role="alert">
              {error}
              <button
                className="icon"
                aria-label="Cerrar aviso"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!data ? (
            <div className="loading">
              {error
                ? "No se pudo abrir esta tienda. Elegí otra tienda o contactá al administrador."
                : "Cargando tienda…"}
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {page === "Inicio"
                      ? new Date().toLocaleDateString("es-AR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })
                      : "TU TIENDA, EN ORDEN"}
                  </span>
                  <h1>
                    {{
                      Inicio: "Un buen día para vender.",
                      Vender: "Nueva venta",
                      Productos: "Cada talle. Cada color.",
                    }[page] || page}
                  </h1>
                  <p>
                    {
                      {
                        Inicio:
                          "Lo que necesitás saber para empezar tu jornada.",
                        Vender:
                          "Elegí un producto, agregá sus variantes y cobrá.",
                        Productos:
                          "Tu catálogo y tu stock, juntos en un solo lugar.",
                        Ventas: "Consultá tus ventas y registrá devoluciones.",
                        Caja: "Sabé cuánto efectivo hay y cerrá el día con tranquilidad.",
                        Clientes: "Tené a mano a quienes eligen tu tienda.",
                        Ajustes: "Tu espacio, como te resulte más cómodo.",
                      }[page]
                    }
                  </p>
                </div>
                <div className="actions">
                  {["Inicio", "Ventas"].includes(page) && (
                    <button className="primary" onClick={() => go("Vender")}>
                      <Plus size={17} />
                      Nueva venta
                    </button>
                  )}
                  {page === "Productos" && (
                    <>
                      <button className="secondary" onClick={exportStock}>
                        <Download size={16} />
                        Exportar
                      </button>
                      <button
                        className="primary"
                        onClick={() => open({ type: "product" })}
                      >
                        <Plus size={16} />
                        Nuevo producto
                      </button>
                    </>
                  )}
                  {page === "Clientes" && (
                    <button
                      className="primary"
                      onClick={() => open({ type: "customer" })}
                    >
                      <Plus size={16} />
                      Nuevo cliente
                    </button>
                  )}
                </div>
              </div>
              {page === "Inicio" && (
                <>
                  <div className="metrics">
                    <div className="metric featured">
                      <div>
                        Ventas de hoy
                        <ShoppingCart size={19} />
                      </div>
                      <strong>{money(todayTotal)}</strong>
                      <small>{today.length} ventas completadas</small>
                    </div>
                    <div className="metric">
                      <div>
                        Efectivo en caja
                        <Wallet size={19} />
                      </div>
                      <strong>{money(data.cash.balance)}</strong>
                      <small>
                        <i
                          className={"dot " + (data.cash.open ? "open" : "")}
                        />
                        {data.cash.open ? "Caja abierta" : "Caja cerrada"}
                      </small>
                    </div>
                    <div className="metric">
                      <div>
                        Unidades disponibles
                        <Package size={19} />
                      </div>
                      <strong>
                        {variants.reduce((s, v) => s + v.stock, 0)}
                      </strong>
                      <small>{active.length} productos en catálogo</small>
                    </div>
                    <button
                      className="metric metric-button"
                      onClick={() => {
                        go("Productos");
                        setTab("Stock");
                        setStockFilter("Para reponer");
                      }}
                    >
                      <div>
                        Variantes para reponer
                        <AlertTriangle size={19} />
                      </div>
                      <strong>{low.length}</strong>
                      <small>
                        Revisar talles y colores <ArrowRight size={14} />
                      </small>
                    </button>
                  </div>
                  <div className="quick-actions">
                    <button
                      onClick={() => {
                        go("Productos");
                        setTab("Stock");
                      }}
                    >
                      <span>
                        <Truck size={21} />
                      </span>
                      <div>
                        <b>Recibir mercadería</b>
                        <small>Sumá unidades por talle y color</small>
                      </div>
                      <ArrowUpRight size={18} />
                    </button>
                    <button onClick={() => open({ type: "cash" })}>
                      <span>
                        <Wallet size={21} />
                      </span>
                      <div>
                        <b>
                          {data.cash.open ? "Cerrar mi caja" : "Abrir mi caja"}
                        </b>
                        <small>
                          {data.cash.open
                            ? "Contá y compará el efectivo"
                            : "Prepará el cambio para vender"}
                        </small>
                      </div>
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                  <div className="dashboard-grid">
                    <section className="card">
                      <div className="section-head">
                        <div>
                          <span className="eyebrow">QUE NO TE FALTE</span>
                          <h2>
                            Stock para reponer{" "}
                            <span className="count">{low.length}</span>
                          </h2>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => {
                            go("Productos");
                            setTab("Stock");
                            setStockFilter("Para reponer");
                          }}
                        >
                          Ver todo <ArrowRight size={15} />
                        </button>
                      </div>
                      {low.length ? (
                        low.slice(0, 5).map((v) => (
                          <button
                            className="replenish-row"
                            key={v.id}
                            onClick={() =>
                              open({ type: "receive", product: v.product })
                            }
                          >
                            <span className="small-art">
                              <Footprints size={22} />
                            </span>
                            <span>
                              <b>{v.product.name}</b>
                              <small>
                                {v.color} · Talle {v.size}
                              </small>
                            </span>
                            <span
                              className={
                                "badge " +
                                (v.stock === 0 ? "danger" : "warning")
                              }
                            >
                              {v.stock === 0
                                ? "Agotado"
                                : `${v.stock} unidades`}
                            </span>
                            <ChevronRight size={17} />
                          </button>
                        ))
                      ) : (
                        <Empty>
                          Todo al día. No hay variantes para reponer.
                        </Empty>
                      )}
                    </section>
                    <section className="card week-card">
                      <span className="eyebrow">EL RITMO DE TU TIENDA</span>
                      <h2>Últimos 7 días</h2>
                      <WeeklyChart sales={validSales} />
                      <p>Ventas completadas · sin devoluciones</p>
                    </section>
                  </div>
                  <section className="card">
                    <div className="section-head">
                      <h2>Últimas ventas</h2>
                      <button
                        className="text-button"
                        onClick={() => go("Ventas")}
                      >
                        Ver historial <ArrowRight size={15} />
                      </button>
                    </div>
                    {salesTable(sales.slice(0, 5))}
                  </section>
                </>
              )}
              {["Productos", "Vender"].includes(page) && (
                <>
                  {page === "Productos" && (
                    <div className="tabs">
                      {["Catálogo", "Stock", "Movimientos"].map((t) => (
                        <button
                          key={t}
                          className={tab === t ? "selected" : ""}
                          onClick={() => setTab(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                  {page === "Productos" && tab === "Movimientos" ? (
                    <section className="card">
                      <div className="section-head">
                        <h2>Ingresos y ajustes de stock</h2>
                      </div>
                      <MovementTable
                        movements={data.movements.filter(
                          (m) => m.method === "Inventario",
                        )}
                      />
                    </section>
                  ) : (
                    <div className={page === "Vender" ? "pos-layout" : ""}>
                      <section>
                        <div className="toolbar">
                          <label className="search">
                            <Search size={18} />
                            <input
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                              placeholder="Buscar producto, marca, talle o SKU"
                              aria-label="Buscar productos"
                            />
                          </label>
                          <select
                            aria-label="Categoría"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                          >
                            <option>Todas</option>
                            {[...new Set(active.map((p) => p.category))].map(
                              (c) => (
                                <option key={c}>{c}</option>
                              ),
                            )}
                          </select>
                          {page === "Productos" && (
                            <select
                              aria-label="Estado de stock"
                              value={stockFilter}
                              onChange={(e) => setStockFilter(e.target.value)}
                            >
                              {[
                                "Todos",
                                "Para reponer",
                                "Sin stock",
                                "Archivados",
                              ].map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        {page === "Productos" && tab === "Stock" ? (
                          <div className="stock-list">
                            {filtered.map((p) => (
                              <section
                                className="card stock-product"
                                key={p.id}
                              >
                                <div className="section-head">
                                  <div>
                                    <small>
                                      {p.brand} · {p.category}
                                    </small>
                                    <h2>{p.name}</h2>
                                    <p>
                                      {sumStock(p)} unidades · Mínimo por
                                      variante: {p.min}
                                    </p>
                                  </div>
                                  <button
                                    className="secondary"
                                    disabled={p.archived}
                                    onClick={() =>
                                      open({ type: "receive", product: p })
                                    }
                                  >
                                    <Plus size={16} />
                                    Recibir
                                  </button>
                                </div>
                                <Matrix
                                  product={p}
                                  onSelect={(v) =>
                                    open({
                                      type: "stock",
                                      variant: v,
                                      product: p,
                                    })
                                  }
                                />
                                <p className="hint">
                                  Tocá una cantidad para ajustar el stock. Las
                                  celdas marcadas necesitan reposición.
                                </p>
                              </section>
                            ))}
                          </div>
                        ) : (
                          <div className="product-grid">
                            {filtered.map((p) => (
                              <button
                                className="product-card"
                                key={p.id}
                                onClick={() =>
                                  open({
                                    type:
                                      page === "Vender" ? "variant" : "detail",
                                    product: p,
                                  })
                                }
                              >
                                <ProductArt p={p} />
                                <div className="product-info">
                                  <small>{p.brand}</small>
                                  <h3>{p.name}</h3>
                                  <div>
                                    <strong>{money(p.price)}</strong>
                                    <span
                                      className={
                                        "badge " +
                                        (sumStock(p) === 0 ? "danger" : "")
                                      }
                                    >
                                      {p.archived
                                        ? "Archivado"
                                        : `${sumStock(p)} unid.`}
                                    </span>
                                  </div>
                                  <p>
                                    {[
                                      ...new Set(p.variants.map((v) => v.size)),
                                    ].join(" · ")}
                                    <ChevronRight size={14} />
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {!filtered.length && (
                          <Empty>
                            No encontramos productos. Revisá los filtros o
                            agregá tu primer producto.
                          </Empty>
                        )}
                      </section>
                      {page === "Vender" && (
                        <aside className="cart card">
                          <div className="section-head">
                            <h2>
                              Tu venta{" "}
                              <span className="count">
                                {cart.reduce((s, i) => s + i.quantity, 0)}
                              </span>
                            </h2>
                          </div>
                          {!data.cash.open && (
                            <div className="notice">
                              Primero necesitás abrir la caja.
                              <button
                                className="text-button"
                                onClick={() => open({ type: "cash" })}
                              >
                                Abrir caja <ArrowRight size={14} />
                              </button>
                            </div>
                          )}
                          {!cart.length ? (
                            <Empty>Elegí un producto para empezar.</Empty>
                          ) : (
                            <div className="cart-items">
                              {cart.map((i) => (
                                <div className="cart-row" key={i.variantId}>
                                  <b>{i.name}</b>
                                  <small>
                                    {i.color} · Talle {i.size}
                                  </small>
                                  <div>
                                    <div className="quantity">
                                      <button
                                        className="icon"
                                        aria-label={`Quitar una unidad de ${i.name}`}
                                        onClick={() => {
                                          setCart((c) =>
                                            c
                                              .map((x) =>
                                                x.variantId === i.variantId
                                                  ? {
                                                      ...x,
                                                      quantity: x.quantity - 1,
                                                    }
                                                  : x,
                                              )
                                              .filter((x) => x.quantity > 0),
                                          );
                                          saleKey.current = crypto.randomUUID();
                                        }}
                                      >
                                        <Minus size={14} />
                                      </button>
                                      {i.quantity}
                                      <button
                                        className="icon"
                                        aria-label={`Agregar una unidad de ${i.name}`}
                                        onClick={() => {
                                          const p = active.find((p) =>
                                            p.variants.some(
                                              (v) => v.id === i.variantId,
                                            ),
                                          );
                                          add(
                                            p,
                                            p.variants.find(
                                              (v) => v.id === i.variantId,
                                            ),
                                          );
                                        }}
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                    <strong>
                                      {money(i.price * i.quantity)}
                                    </strong>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <label className="field">
                            Cliente
                            <select
                              value={customer}
                              onChange={(e) => {
                                setCustomer(e.target.value);
                                saleKey.current = crypto.randomUUID();
                              }}
                            >
                              <option value="">Consumidor final</option>
                              {data.customers.map((c) => (
                                <option key={c.id} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="form-grid">
                            <label className="field">
                              Medio de pago
                              <select
                                value={payment}
                                onChange={(e) => {
                                  setPayment(e.target.value);
                                  saleKey.current = crypto.randomUUID();
                                }}
                              >
                                {["Efectivo", "Transferencia", "Tarjeta"].map(
                                  (p) => (
                                    <option key={p}>{p}</option>
                                  ),
                                )}
                              </select>
                            </label>
                            <Field
                              label="Descuento (%)"
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={discount}
                              onChange={(e) => {
                                setDiscount(
                                  Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      Math.round(Number(e.target.value) || 0),
                                    ),
                                  ),
                                );
                                saleKey.current = crypto.randomUUID();
                              }}
                            />
                          </div>
                          {payment === "Efectivo" && (
                            <Field
                              label="Recibís ($, opcional)"
                              type="number"
                              min="0"
                              step="0.01"
                              value={received}
                              onChange={(e) => setReceived(e.target.value)}
                            />
                          )}
                          <div className="cart-total">
                            <span>Total</span>
                            <strong>{money(cartTotal)}</strong>
                          </div>
                          {payment === "Efectivo" && received !== "" && (
                            <p
                              className={
                                Number(received) * 100 < cartTotal
                                  ? "error"
                                  : "hint"
                              }
                            >
                              {Number(received) * 100 < cartTotal
                                ? "El efectivo recibido no alcanza."
                                : `Vuelto: ${money(Math.round(Number(received) * 100) - cartTotal)}`}
                            </p>
                          )}
                          <button
                            className="primary full"
                            disabled={
                              busy ||
                              !cart.length ||
                              !data.cash.open ||
                              (payment === "Efectivo" &&
                                received !== "" &&
                                Number(received) * 100 < cartTotal)
                            }
                            onClick={async () => {
                              const d = await mutate("sale", {
                                items: cart.map(
                                  ({ variantId, quantity, price }) => ({
                                    variantId,
                                    quantity,
                                    expectedPrice: price,
                                  }),
                                ),
                                customer,
                                payment,
                                discount,
                                requestId: saleKey.current,
                              });
                              if (d) {
                                const sale = d.sales.find(
                                  (s) => s.requestId === saleKey.current,
                                );
                                setCart([]);
                                setDiscount(0);
                                setReceived("");
                                saleKey.current = crypto.randomUUID();
                                open({ type: "receipt", sale });
                              }
                            }}
                          >
                            <Check size={17} />
                            {busy ? "Guardando…" : "Cobrar " + money(cartTotal)}
                          </button>
                          <small className="hint">
                            Registrá el cobro una vez recibido. El comprobante
                            no es una factura fiscal.
                          </small>
                        </aside>
                      )}
                    </div>
                  )}
                </>
              )}
              {page === "Ventas" && (
                <>
                  <div className="toolbar">
                    <label className="search">
                      <Search size={18} />
                      <input
                        aria-label="Buscar ventas"
                        placeholder="Buscar por número o cliente"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <span>
                      {validSales.length} ventas completadas ·{" "}
                      {money(validSales.reduce((s, v) => s + v.total, 0))}
                    </span>
                  </div>
                  <section className="card">
                    {salesTable(
                      sales.filter((s) =>
                        `${s.number} ${s.customer}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      ),
                    )}
                  </section>
                </>
              )}
              {page === "Caja" && (
                <>
                  <div className="cash-summary">
                    <div>
                      <span className="eyebrow">EFECTIVO ESPERADO</span>
                      <h2>{money(data.cash.balance)}</h2>
                      <span className="badge">
                        {data.cash.open ? "Caja abierta" : "Caja cerrada"}
                      </span>
                    </div>
                    <div className="actions">
                      {data.cash.open && (
                        <button
                          className="secondary"
                          onClick={() => open({ type: "cash-movement" })}
                        >
                          Ingresar o retirar efectivo
                        </button>
                      )}
                      <button
                        className="primary"
                        onClick={() => open({ type: "cash" })}
                      >
                        {data.cash.open ? "Cerrar caja" : "Abrir caja"}
                      </button>
                    </div>
                  </div>
                  {data.cash.lastClose && (
                    <div className="notice">
                      Último cierre: esperado{" "}
                      {money(data.cash.lastClose.expected)} · Contado{" "}
                      {money(data.cash.lastClose.counted)} · Diferencia{" "}
                      <b>{money(data.cash.lastClose.difference)}</b>
                    </div>
                  )}
                  <section className="card">
                    <div className="section-head">
                      <h2>Movimientos de caja y cobros</h2>
                    </div>
                    <MovementTable
                      movements={data.movements.filter(
                        (m) => m.method !== "Inventario",
                      )}
                    />
                  </section>
                </>
              )}
              {page === "Clientes" && (
                <>
                  <div className="toolbar">
                    <label className="search">
                      <Search size={18} />
                      <input
                        aria-label="Buscar clientes"
                        placeholder="Buscar nombre, email o teléfono"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                  <section className="card">
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Cliente</th>
                            <th>Email</th>
                            <th>Teléfono</th>
                            <th>Compras</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.customers
                            .filter((c) =>
                              `${c.name} ${c.email} ${c.phone}`
                                .toLowerCase()
                                .includes(query.toLowerCase()),
                            )
                            .map((c) => (
                              <tr key={c.id}>
                                <td>
                                  <b>{c.name}</b>
                                </td>
                                <td>{c.email || "—"}</td>
                                <td>{c.phone || "—"}</td>
                                <td>
                                  {money(
                                    validSales
                                      .filter((s) => s.customer === c.name)
                                      .reduce((n, s) => n + s.total, 0),
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {!data.customers.length && (
                      <Empty>
                        Agregá tu primer cliente. También podés vender como
                        consumidor final.
                      </Empty>
                    )}
                  </section>
                </>
              )}
              {page === "Ajustes" && (
                <div className="settings-grid">
                  <section className="card padded">
                    <h2>Apariencia</h2>
                    <p>Elegí el tema más cómodo para tu jornada.</p>
                    <div className="theme-options">
                      {["light", "dark"].map((t) => (
                        <button
                          key={t}
                          className={
                            "theme-option " + (theme === t ? "chosen" : "")
                          }
                          onClick={() => setTheme(t)}
                        >
                          {t === "light" ? <Sun /> : <Moon />}
                          <b>{t === "light" ? "Claro suave" : "Oscuro"}</b>
                          <small>
                            {t === "light"
                              ? "Fondos cálidos y sin blanco intenso"
                              : "Tonos oscuros y contraste legible"}
                          </small>
                          {theme === t && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="card padded">
                    <h2>Tu tienda</h2>
                    <p>
                      <b>{data.name}</b>
                    </p>
                    <p>
                      Los negocios, sus titulares y la vigencia del acceso se
                      administran desde MercadoSimple.
                    </p>
                    {demo && (
                      <button
                        className="secondary"
                        onClick={() => open({ type: "tenant" })}
                      >
                        Crear tienda de demostración
                      </button>
                    )}
                    <p className="hint">
                      Cada tienda tiene su propio catálogo, stock, clientes,
                      ventas y caja.
                    </p>
                  </section>
                  <section className="card padded">
                    <h2>Marcas y categorías</h2>
                    <p>
                      Se agregan al crear o editar un producto. No necesitás
                      configurarlas antes.
                    </p>
                    <div className="chips">
                      {[
                        ...new Set(
                          active.flatMap((p) => [p.brand, p.category]),
                        ),
                      ].map((n) => (
                        <span className="badge" key={n}>
                          {n}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
        </main>
        <footer>
          PASO · ZAPATERÍA & INDUMENTARIA
          <span>Un paso menos. Todo más simple.</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {modal && data && (
        <Modal
          title={
            {
              product: "Nuevo producto",
              edit: "Editar producto",
              detail: "Detalle del producto",
              variant: "Elegí talle y color",
              receive: "Recibir mercadería",
              stock: "Ajustar stock",
              cash: data.cash.open ? "Cerrar caja" : "Abrir caja",
              "cash-movement": "Movimiento de efectivo",
              customer: "Nuevo cliente",
              receipt: "Detalle de venta",
              return: "Devolución completa",
              tenant: "Nueva tienda de demostración",
            }[modal.type]
          }
          onClose={() => setModal(null)}
          busy={busy}
        >
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {["product", "edit"].includes(modal.type) && (
            <ProductForm
              product={modal.product}
              busy={busy}
              onSave={(p) =>
                mutate(modal.type === "edit" ? "product-edit" : "products", p)
              }
            />
          )}
          {["detail", "variant"].includes(modal.type) && (
            <>
              <div className="detail-heading">
                <small>
                  {modal.product.brand} / {modal.product.category}
                </small>
                <h3>{modal.product.name}</h3>
                <strong>{money(modal.product.price)}</strong>
              </div>
              <p>
                {modal.type === "variant"
                  ? "Tocá una cantidad para agregar al carrito."
                  : "Stock disponible por variante. Tocá una cantidad para ajustarla."}
              </p>
              <Matrix
                product={modal.product}
                mode={modal.type === "variant" ? "sell" : "stock"}
                onSelect={(v) =>
                  modal.type === "variant"
                    ? add(modal.product, v)
                    : open({
                        type: "stock",
                        product: modal.product,
                        variant: v,
                      })
                }
              />
              {modal.type === "detail" ? (
                <div className="modal-actions">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      open({ type: "edit", product: modal.product })
                    }
                  >
                    Editar datos
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      mutate("product-archive", {
                        id: modal.product.id,
                        archived: !modal.product.archived,
                      })
                    }
                  >
                    {modal.product.archived
                      ? "Restaurar producto"
                      : "Archivar producto"}
                  </button>
                  <button
                    className="primary"
                    disabled={modal.product.archived}
                    onClick={() =>
                      open({ type: "receive", product: modal.product })
                    }
                  >
                    Recibir mercadería
                  </button>
                </div>
              ) : (
                <button className="primary full" onClick={() => setModal(null)}>
                  Continuar con la venta <ArrowRight size={16} />
                </button>
              )}
            </>
          )}
          {modal.type === "receive" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                mutate("receive", {
                  productId: modal.product.id,
                  reason: f.get("reason"),
                  items: modal.product.variants.map((v) => ({
                    variantId: v.id,
                    quantity: Number(f.get(v.id)),
                  })),
                });
              }}
            >
              <h3>{modal.product.name}</h3>
              <p>
                Ingresá las unidades que llegaron. Se suman al stock actual.
              </p>
              <Matrix product={modal.product} mode="receive" />
              <Field
                label="Referencia o motivo"
                name="reason"
                placeholder="Ej.: Reposición proveedor, remito 123"
                minLength="3"
                maxLength="150"
                required
              />
              <button className="primary full" disabled={busy}>
                Guardar ingreso
              </button>
            </form>
          )}
          {modal.type === "stock" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                mutate("stock", {
                  variantId: modal.variant.id,
                  expected: modal.variant.stock,
                  delta: Number(f.get("count")) - modal.variant.stock,
                  reason: f.get("reason"),
                });
              }}
            >
              <h3>{modal.product.name}</h3>
              <p>
                {modal.variant.color} · Talle {modal.variant.size} · Stock
                actual: <b>{modal.variant.stock}</b>
              </p>
              <Field
                label="Cantidad real contada"
                name="count"
                type="number"
                min="0"
                max="100000"
                step="1"
                defaultValue={modal.variant.stock}
                required
              />
              <Field
                label="Motivo del ajuste"
                name="reason"
                placeholder="Ej.: Conteo físico, rotura o corrección"
                minLength="3"
                maxLength="150"
                required
              />
              <button className="primary full" disabled={busy}>
                Guardar ajuste
              </button>
            </form>
          )}
          {modal.type === "cash" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget),
                  amount = Math.round(Number(f.get("amount")) * 100);
                mutate("cash", {
                  open: !data.cash.open,
                  balance: data.cash.open ? data.cash.balance : amount,
                  ...(data.cash.open ? { counted: amount } : {}),
                });
              }}
            >
              <p>
                {data.cash.open
                  ? `Efectivo esperado: ${money(data.cash.balance)}. Contá el efectivo para registrar la diferencia.`
                  : "Indicá el efectivo disponible al comenzar la jornada."}
              </p>
              <Field
                label={
                  data.cash.open
                    ? "Efectivo contado ($)"
                    : "Efectivo inicial ($)"
                }
                name="amount"
                type="number"
                min="0"
                max="10000000"
                step="0.01"
                required
              />
              <button className="primary full" disabled={busy}>
                {data.cash.open ? "Confirmar cierre" : "Abrir caja"}
              </button>
            </form>
          )}
          {modal.type === "cash-movement" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                mutate("cash-movement", {
                  amount:
                    Math.round(Number(f.get("amount")) * 100) *
                    Number(f.get("direction")),
                  reason: f.get("reason"),
                });
              }}
            >
              <label className="field">
                Tipo
                <select name="direction">
                  <option value="1">Ingreso de efectivo</option>
                  <option value="-1">Retiro de efectivo</option>
                </select>
              </label>
              <Field
                label="Importe ($)"
                name="amount"
                type="number"
                min="0.01"
                max="1000000"
                step="0.01"
                required
              />
              <Field
                label="Motivo"
                name="reason"
                required
                minLength="3"
                maxLength="150"
              />
              <button className="primary full" disabled={busy}>
                Guardar movimiento
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
              <Field
                label="Nombre"
                name="name"
                minLength="2"
                maxLength="100"
                required
              />
              <Field label="Email (opcional)" name="email" type="email" />
              <Field
                label="Teléfono (opcional)"
                name="phone"
                type="tel"
                maxLength="40"
              />
              <button className="primary full" disabled={busy}>
                Guardar cliente
              </button>
            </form>
          )}
          {modal.type === "tenant" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const name = new FormData(e.currentTarget).get("name");
                setBusy(true);
                try {
                  const t = await api("/tenants", { name });
                  setTenants((ts) => [...ts, t]);
                  setTenant(t.id);
                  setModal(null);
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field
                label="Nombre del negocio"
                name="name"
                minLength="2"
                maxLength="80"
                required
              />
              <button className="primary full" disabled={busy}>
                Crear tienda
              </button>
            </form>
          )}
          {modal.type === "receipt" && modal.sale && (
            <>
              <div className="receipt-heading">
                <Logo />
                <h3>Venta #{String(modal.sale.number).padStart(4, "0")}</h3>
                <p>
                  {datetime(modal.sale.date)} · {modal.sale.customer}
                </p>
                <span className="badge">
                  {modal.sale.returnedAt ? "Devuelta" : modal.sale.payment}
                </span>
              </div>
              {modal.sale.items.map((i) => (
                <div className="receipt-row" key={i.variantId}>
                  <div>
                    <b>{i.name}</b>
                    <small>
                      {i.color} · {i.size} · {i.quantity} × {money(i.price)}
                    </small>
                  </div>
                  <strong>{money(i.price * i.quantity)}</strong>
                </div>
              ))}
              {!!modal.sale.discount && (
                <p>Descuento aplicado: {modal.sale.discount}%</p>
              )}
              <div className="cart-total">
                <span>Total</span>
                <strong>{money(modal.sale.total)}</strong>
              </div>
              <p className="hint">
                Comprobante interno. No válido como factura fiscal.
              </p>
              {modal.sale.returnedAt ? (
                <p>
                  Devolución: {datetime(modal.sale.returnedAt)} ·{" "}
                  {modal.sale.returnReason}
                </p>
              ) : (
                <button
                  className="secondary full"
                  onClick={() => open({ type: "return", sale: modal.sale })}
                >
                  Registrar devolución completa
                </button>
              )}
            </>
          )}
          {modal.type === "return" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutate("return", {
                  id: modal.sale.id,
                  reason: new FormData(e.currentTarget).get("reason"),
                });
              }}
            >
              <p>
                Se devolverán todas las unidades al stock y se registrará un
                reintegro de <b>{money(modal.sale.total)}</b> por{" "}
                {modal.sale.payment.toLowerCase()}.
              </p>
              <p>
                Confirmá solo después de recibir la mercadería y realizar el
                reintegro. Para un cambio, registrá después la nueva venta.
              </p>
              <Field
                label="Motivo"
                name="reason"
                minLength="3"
                maxLength="150"
                required
              />
              <button className="primary full" disabled={busy}>
                Confirmar devolución
              </button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
function ProductForm({ product: p, busy, onSave }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget));
        const body = {
          name: f.name,
          brand: f.brand,
          category: f.category,
          price: Math.round(Number(f.price) * 100),
          cost: Math.round(Number(f.cost) * 100),
          min: Number(f.min),
        };
        onSave(
          p
            ? { ...body, id: p.id }
            : {
                ...body,
                sizes: f.sizes
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                colors: f.colors
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                stock: Number(f.stock),
              },
        );
      }}
    >
      <Field
        label="Nombre del producto"
        name="name"
        defaultValue={p?.name}
        minLength="2"
        maxLength="100"
        placeholder="Ej.: Zapatillas Urban Court"
        required
      />
      <div className="form-grid">
        <Field
          label="Marca"
          name="brand"
          defaultValue={p?.brand}
          maxLength="60"
          required
        />
        <Field
          label="Categoría"
          name="category"
          defaultValue={p?.category}
          placeholder="Zapatillas, remeras…"
          maxLength="60"
          required
        />
        <Field
          label="Precio de venta ($)"
          name="price"
          type="number"
          min="0.01"
          max="1000000"
          step="0.01"
          defaultValue={p ? p.price / 100 : ""}
          required
        />
        <Field
          label="Costo ($)"
          name="cost"
          type="number"
          min="0"
          max="1000000"
          step="0.01"
          defaultValue={p ? p.cost / 100 : 0}
          required
        />
      </div>
      {!p && (
        <>
          <div className="form-grid">
            <Field
              label="Talles, separados por coma"
              name="sizes"
              placeholder="36, 37, 38, 39 o S, M, L"
              required
            />
            <Field
              label="Colores, separados por coma"
              name="colors"
              placeholder="Negro, Blanco, Suela"
              required
            />
          </div>
          <p className="hint">
            Creamos una variante por cada combinación de talle y color.
          </p>
          <Field
            label="Stock inicial por cada variante"
            name="stock"
            type="number"
            min="0"
            max="100000"
            step="1"
            defaultValue="0"
            required
          />
        </>
      )}
      <Field
        label="Avisar cuando una variante tenga esta cantidad o menos"
        name="min"
        type="number"
        min="0"
        max="10000"
        step="1"
        defaultValue={p?.min ?? 3}
        required
      />
      {p && (
        <p className="hint">
          Los cambios de precio no modifican ventas anteriores.
        </p>
      )}
      <button className="primary full" disabled={busy}>
        {busy ? "Guardando…" : p ? "Guardar cambios" : "Crear producto"}
      </button>
    </form>
  );
}
function MovementTable({ movements }) {
  return movements.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Detalle</th>
            <th>Tipo</th>
            <th>Importe</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id}>
              <td>{datetime(m.date)}</td>
              <td>{m.description}</td>
              <td>{m.method}</td>
              <td>{m.method === "Inventario" ? "—" : money(m.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty>Los movimientos aparecerán acá cuando empieces a operar.</Empty>
  );
}
function WeeklyChart({ sales }) {
  const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      return {
        label: d.toLocaleDateString("es-AR", { weekday: "short" }),
        value: sales
          .filter((s) => day(s.date) === day(d))
          .reduce((n, s) => n + s.total, 0),
      };
    }),
    max = Math.max(1, ...days.map((d) => d.value));
  return (
    <div
      className="chart"
      role="img"
      aria-label={days.map((d) => `${d.label}: ${money(d.value)}`).join(", ")}
    >
      {days.map((d, i) => (
        <div className="chart-col" key={i}>
          <span>{d.value ? money(d.value) : "—"}</span>
          <div className="bar-track">
            <i style={{ height: Math.max(3, (d.value / max) * 100) + "%" }} />
          </div>
          <small>{d.label}</small>
        </div>
      ))}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
