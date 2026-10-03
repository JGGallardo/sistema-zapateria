# Paso · Sistema de ventas para zapatería e indumentaria

Primera versión local funcional, inspirada en la organización del dashboard de Aumo. React 19, Vite 7, Express 5 y SQLite integrado en Node 24. Interfaz responsive en español, importes en pesos argentinos y almacenamiento en centavos.

## Demo publicada

**[Abrir Paso en GitHub Pages](https://jggallardo.github.io/sistema-zapateria/)** · [Repositorio](https://github.com/JGGallardo/sistema-zapateria)

La demo pública funciona sin servidor: ingresá con **Entrar al espacio de demostración**. Cada navegador guarda su propio catálogo, caja y ventas en almacenamiento local. Solo usar datos ficticios: no existen cuentas reales, sincronización entre equipos ni aislamiento de seguridad multiusuario en esta demo. Borrar los datos del navegador elimina los datos de prueba. La versión local mantiene la API, SQLite y las validaciones de membresía del servidor.

GitHub Actions ejecuta las pruebas y publica la demo al actualizar `main`. Para previsualizarla localmente: `npm run build:pages` y `npm run preview:pages`; abrir la ruta `/sistema-zapateria/`. `npm run build` conserva la compilación normal para el servidor local.

## Inicio

Requisito: Node.js 24 o superior y npm o pnpm. Abrir `SistemaZapateria.code-workspace` en VS Code.

```sh
npm install
npm run dev
```

Abrir http://localhost:5173 y seleccionar **Entrar al espacio de demostración**. No requiere credenciales. Este acceso existe solo en modo desarrollo. Incluye dos negocios independientes; uno tiene productos ficticios y el otro comienza vacío. No se copiaron datos privados de Aumo.

En este equipo también se puede ejecutar `powershell -File .\Iniciar.ps1` o la tarea **Iniciar Paso** de VS Code (Ctrl+Shift+B). El iniciador utiliza Node 24 incluido en Codex si el Node del sistema es anterior. Si la dirección ya está abierta y funcionando, no iniciar una segunda instancia.

1. Abrir Caja e ingresar el efectivo inicial.
2. Crear productos con talles y colores separados por comas, o usar los ejemplos.
3. En Nueva venta seleccionar producto y variante, elegir cliente y medio de pago, y confirmar.
4. Revisar la venta, el descuento de stock y los indicadores.
5. Cambiar el negocio desde el selector lateral para comprobar su separación.

## Funcionalidades

- Resumen calculado con ventas, ticket promedio, stock, alertas y evolución de los últimos siete días.
- Alta de productos con marca, categoría, precio, costo, talles, colores y stock mínimo. Variantes con SKU único.
- Búsqueda y filtros de catálogo e inventario; ajustes de stock con motivo y exportación CSV.
- Ventas con control de stock, precios y costos históricos; comprobante interno no fiscal.
- Caja con apertura, cierre y saldo esperado; efectivo separado de tarjetas y transferencias.
- Alta de clientes, reportes básicos y creación de negocios.
- Membresías verificadas por el servidor en cada acceso a un negocio. Las ventas y los cambios se guardan en transacciones SQLite.
- Sesiones de 24 horas con cookie HttpOnly y SameSite; contraseñas con scrypt; comprobación de origen y límite de intentos de acceso.

## Verificación

```sh
npm test
npm run build
```

Base persistente en `data/paso.sqlite`, excluida de Git. Para respaldar, detener el servidor y copiar la carpeta `data` completa. No borrar esa carpeta si se desean conservar los datos.

## Alcance de esta versión

Es una base local de desarrollo, no un SaaS desplegado. El servidor escucha únicamente en 127.0.0.1. El acceso demo comparte una cuenta local y no debe exponerse a Internet. El modo `npm start` sirve la compilación y deshabilita el acceso demo; el alta y aprovisionamiento de usuarios reales aún no están implementados.

Antes de publicar: incorporar registro/invitaciones, recuperación de cuenta, roles, HTTPS y cookies Secure, configuración de orígenes, control de sesiones persistentes, migraciones, respaldos automatizados y una base de datos adecuada al despliegue. SQLite y el almacenamiento JSON por negocio simplifican esta primera versión y deberán evolucionar para grandes volúmenes o múltiples instancias.

Pendientes de negocio: edición/baja de productos, devoluciones, descuentos, proveedores, compras, sucursales, arqueo detallado, facturación fiscal y permisos de empleados. Los botones presentes corresponden a las funciones implementadas. No hay facturación fiscal ni procesamiento real de pagos.

## Estructura

- `src/main.jsx`: interfaz React y flujos de operación.
- `src/style.css`: sistema visual responsive.
- `server/index.js`: API, sesiones, membresías y persistencia.
- `server/domain.js`: catálogo, variantes, validación y venta.
- `tests/domain.test.js`: invariantes de stock, precios y separación de datos.

Referencias técnicas: [React](https://react.dev/learn), [Vite](https://vite.dev/guide/). Referencia de navegación: [Aumo](https://app.aumo.com.ar/dashboard).
