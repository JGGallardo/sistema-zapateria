# Paso · Zapatería e indumentaria

Sistema React para catálogo con talles y colores, stock y ventas. Interfaz en español, importes en pesos argentinos y montos guardados en centavos.

- Producción: https://paso-production-1dec.up.railway.app
- Administración: https://mercado-simple-production.up.railway.app/superadmin → **Tiendas Paso**.
- Demo independiente: https://jggallardo.github.io/sistema-zapateria/ (datos ficticios, solo en el navegador).

## Uso diario

1. Abrí la caja con el efectivo inicial.
2. Creá un producto con marca, categoría, precio, costo, talles y colores.
3. En **Productos → Stock**, recibí mercadería por grilla de talle/color. Tocá una cantidad para registrar un conteo o ajuste con motivo.
4. En **Vender**, elegí las variantes, el cliente, descuento y medio de pago. El sistema verifica disponibilidad y descuenta stock al confirmar.
5. Desde **Ventas**, consultá el comprobante interno o registrá una devolución completa. Para cambios, devolvé y registrá una nueva venta.
6. En **Caja**, registrá ingresos/retiros y cerrá indicando el efectivo contado. Se conserva la diferencia.

Incluye filtros de productos agotados, reposición y archivados; edición de precios, archivo/restauración, exportación CSV, clientes y movimientos. Los precios históricos de ventas se conservan. El panel muestra ventas completadas sin devoluciones y stock vigente. El tema Claro suave u Oscuro se recuerda por navegador.

## Ejecución local

Node.js 24, pnpm y VS Code. Abrir `SistemaZapateria.code-workspace`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

En http://localhost:5173 usar **Explorar tienda de ejemplo**. En Windows también se puede ejecutar `Iniciar.ps1`. La cuenta demo está deshabilitada en producción. Los datos locales están en `data/paso.sqlite`, excluidos del repositorio.

## Railway y administración central

Paso y MercadoSimple son productos independientes. Tienen repositorios, despliegues, bases de datos, usuarios comerciales, contraseñas y sesiones separados. No comparten catálogo, stock, clientes, ventas, caja ni lógica comercial. Una cuenta o tienda de un sistema no habilita acceso al otro, aunque utilice el mismo email.

El único punto compartido es el superadmin, actualmente alojado en la aplicación de MercadoSimple. Su sección Tiendas Paso consume exclusivamente la API administrativa de Paso para altas y vigencia de acceso. Paso autentica a sus usuarios y ejecuta las operaciones comerciales con su propia base y servicio; no consulta la base ni las API comerciales de MercadoSimple para operar. Mantener esta separación al agregar funcionalidades.

Proyecto independiente **paso-retail**, servicio **paso**, un volumen persistente en `/data` y una única réplica. Docker usa Node 24, instala el lockfile, ejecuta compilación y pruebas. Al actualizar `main`, Railway publica la aplicación y GitHub Actions actualiza la demo de Pages.

Variables de producción: `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=8080`, `PASO_DATA_DIR=/data`, `APP_ORIGIN` con el origen HTTPS y `PASO_CONTROL_SECRET` aleatorio de al menos 32 caracteres. Nunca incluir la clave en Git ni en variables de Vite.

MercadoSimple usa `PASO_APP_ORIGIN` y la misma `PASO_CONTROL_SECRET` exclusivamente en su servidor. **Tiendas Paso** permite crear el negocio y su titular, vincular un titular existente, editar el nombre, renovar la vigencia, suspender o cancelar. Los estados bloqueados o vencidos impiden todas las operaciones de la tienda inmediatamente, sin borrar sus datos. No se crean usuarios desde la demo pública ni desde una cuenta comercial.

La integración valida la sesión de superadmin y firma método, ruta, fecha, nonce, actor y cuerpo con HMAC-SHA256. Paso rechaza firmas alteradas, expiradas y repetidas; registra las altas y cambios con el actor de plataforma en `control_audit`. La base de MercadoSimple no se comparte con Paso. No se importan negocios ni información comercial existente automáticamente.

El titular inicia sesión en Paso con email y contraseña; una cuenta puede tener varias tiendas. Sesiones HttpOnly/Secure/SameSite en producción, contraseñas scrypt, validaciones de membresía, controles de origen y transacciones SQLite. Salud: `/api/health`.

## Verificación

```sh
pnpm test
pnpm build
pnpm build:pages
```

Las pruebas cubren aislamiento, rollback, stock negativo, precio histórico, descuentos, reintentos de ventas, devoluciones, arqueo y ciclo de vida del tenant con firmas y protección contra replay. En el repositorio privado de MercadoSimple hay pruebas adicionales del puente de administración.

## Respaldo y alcance

El volumen conserva datos al desplegar, pero no reemplaza una copia de seguridad. Para un respaldo manual consistente, detener el servicio y copiar la carpeta `/data` completa (incluidos archivos WAL/SHM si existen), o usar la API de backup de SQLite. Probar la restauración antes de usar la copia. No están configurados respaldos automáticos.

Esta versión usa SQLite y un documento por tienda: una sola instancia, apropiada para comenzar; para gran volumen o escalado horizontal se requiere evolucionar el almacenamiento. Todos los titulares tienen permisos de administración dentro de sus tiendas. No incluye roles de empleados, recuperación automática de contraseña, contabilidad de compras/proveedores, múltiples depósitos ni facturación fiscal. Los pagos se registran, no se procesan. Las devoluciones son completas y requieren caja abierta.

## Referencias del rediseño

- [Lightspeed para zapaterías](https://www.lightspeedhq.com/pos/retail/shoe-store-pos/): variantes, inventario y reposición.
- [Matrices de inventario Lightspeed](https://retail-support.lightspeedhq.com/hc/en-us/articles/229130188-Creating-matrixes): grilla de talles y colores.
- [Inventario Loyverse](https://loyverse.com/en-us/advanced-inventory): recepciones y ajustes con historial.
- [Paleta indicada](https://coolors.co/palette/0a0908-49111c-f2f4f3-a9927d-5e503f): negro, bordó, blanco apagado, taupe y marrón; fondo claro cálido `#e9e6e0`.
- [Aumo](https://app.aumo.com.ar/dashboard): referencia inicial de organización. No se copiaron datos privados.
