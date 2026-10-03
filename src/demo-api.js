import { applyAction, seed } from "../server/domain.js";

// Public Pages demo only. This is browser-local sample data, not authentication.
export function createDemoApi(storage, session) {
  const key = "paso-pages-demo-v1";
  const sessionKey = "paso-pages-session";
  function read() {
    const saved = storage.getItem(key);
    return saved
      ? JSON.parse(saved)
      : {
          central: seed("Paso · Zapatería"),
          studio: seed("Distrito · Indumentaria", true),
        };
  }
  function write(data) {
    try {
      storage.setItem(key, JSON.stringify(data));
    } catch {
      throw Error(
        "No se pudo guardar la demo. Habilitá el almacenamiento del navegador o liberá espacio.",
      );
    }
  }
  return async function demoApi(path, body) {
    if (path === "/config") return { demo: true };
    if (path === "/demo") {
      const data = read();
      write(data);
      session.setItem(sessionKey, "active");
      return { ok: true };
    }
    if (path === "/logout") {
      session.removeItem(sessionKey);
      return { ok: true };
    }
    if (path === "/login")
      throw Error("Esta demo pública no utiliza cuentas ni contraseñas.");
    if (!session.getItem(sessionKey))
      throw Error("Entrá al espacio de demostración para continuar.");
    const data = read();
    if (path === "/tenants") {
      if (!body)
        return Object.entries(data).map(([id, state]) => ({
          id,
          name: state.name,
        }));
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 80)
        throw Error("Ingresá un nombre entre 2 y 80 caracteres.");
      const id = crypto.randomUUID();
      data[id] = seed(name, true);
      write(data);
      return { id, name };
    }
    const match = /^\/t\/([^/]+)\/([^/]+)$/.exec(path);
    if (!match || !Object.hasOwn(data, match[1]))
      throw Error("Negocio de demostración no encontrado.");
    const [, tenant, action] = match;
    if (action === "state" && !body) return data[tenant];
    applyAction(data[tenant], action, body);
    write(data);
    return data[tenant];
  };
}
