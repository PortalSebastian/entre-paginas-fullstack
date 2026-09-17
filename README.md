# Actividad 4 — Mountebank

Grupo 1: Sebastian Portal Goicochea y Christian Ramirez Villafuerte.

Virtualización de las API REST principales de **Entre Páginas** mediante un imposter HTTP. Se usan los conceptos de: imposter, stub, predicate y response. Los predicados comparan método, ruta, parámetros, cabeceras y cuerpos JSON; las respuestas se definen con `is`. No se requiere levantar `Back`, `Front` ni MySQL.

## Archivos

| Archivo | Contenido |
| --- | --- |
| `imposters.json` | Imposter en el puerto 3001 y 56 stubs declarativos |
| `postman/Entre-Paginas.postman_collection.json` | Colección Postman v2.1 con 42 solicitudes y sus pruebas |
| `postman/Local.postman_environment.json` | Entorno local con la variable `baseUrl` |
| `package.json` y `package-lock.json` | Comandos y versiones de Mountebank y Newman |
| `evidencia/resultado-newman.json` | Resumen verificable de la ejecución de la colección |
| `entrega/actividad4_grupo1.doc` | Documento Word con la nomenclatura solicitada |
| `entrega/actividad4_grupo1.docx` | Versión editable en el formato moderno de Word |

## Ejecutar Mountebank

Requisito: Node.js 20 o superior y los puertos 2525 y 3001 disponibles. Ejecutar desde la raíz del proyecto:

```bash
cd Mountebank
npm ci
npm start
```

En Windows, si PowerShell bloquea los scripts de npm, utilizar `npm.cmd` en lugar de `npm`.

- Administración de Mountebank: <http://localhost:2525>.
- Configuración activa: <http://localhost:2525/imposters>.
- API simulada: <http://localhost:3001/api/v1>.
- Prueba rápida: <http://localhost:3001/api/v1/health>.

Mantener esa terminal abierta. Para detener el servidor, pulsar `Ctrl+C`. Si se modifica `imposters.json`, detenerlo y volver a ejecutar `npm start` para cargar los cambios. No se habilita inyección de JavaScript.

## Probar y exportar en Postman

1. Iniciar Mountebank.
2. En Postman, seleccionar **Import** e importar los dos archivos de `postman/`.
3. Seleccionar el entorno **Entre Páginas - Mountebank local**. Confirmar que `baseUrl` sea `http://localhost:3001/api/v1`.
4. Abrir la colección **Entre Páginas - Actividad 4 - Grupo 1** y seleccionar **Run collection**.
5. Seleccionar las cinco carpetas en su orden original, una iteración y ejecutar. Mantener habilitado el manejo de cookies. Si se usa Postman web, seleccionar Desktop Agent para acceder a localhost.
6. Comprobar los estados y la pestaña de resultados de pruebas: se esperan **42 solicitudes, 190 verificaciones y 0 fallos**. Los casos con HTTP 400, 401, 403, 404, 409 y 422 son pruebas negativas que deben pasar.
7. Para entregar una exportación desde Postman, abrir el menú de la colección, elegir **Export collection** y seleccionar **Collection v2.1**. Exportar también el entorno si se ha modificado. Reemplazar los archivos de `postman/` con esas exportaciones.

El token CSRF y el token de acceso se guardan como variables de colección durante la ejecución. El login establece la cookie ficticia de renovación y el logout la elimina. Por ello, para reproducir el flujo completo, ejecutar la colección desde el principio y no alterar el orden de las carpetas.

La colección suministrada está en el formato JSON importable/exportable de Postman y fue validada mediante Newman. No se presenta esa ejecución por consola como una captura o una ejecución de la aplicación gráfica de Postman.

## Prueba automatizada con Newman

En una segunda terminal, dentro de `Mountebank`:

```bash
npm test
```

El comando ejecuta la misma colección y genera `reports/newman-report.json` con el reporte completo. La carpeta `reports` es temporal; `evidencia/resultado-newman.json` conserva el resumen de la ejecución realizada para esta entrega, incluidas las versiones, estadísticas y resultados por solicitud. Estas pruebas verifican los stubs y no sustituyen las pruebas del backend real.

## Selección de endpoints

Se eligieron los endpoints que permiten recorrer la compra de un libro: explorar el catálogo, registrarse, iniciar sesión, crear un pedido y consultar los pedidos propios. Las rutas se tomaron de `Back/routes/index.js`; los cuerpos y errores se contrastaron con `Back/controllers`, `Back/services` y `Back/validators/payloads.js`. Los endpoints administrativos quedan fuera de esta selección.

Todas las rutas de la tabla llevan el prefijo `/api/v1`.

| Método y ruta | Casos representados | Estados |
| --- | --- | --- |
| `GET /health` | Disponibilidad del servicio | 200 |
| `GET /csrf` | Token CSRF ficticio | 200 |
| `GET /categories` | Hombres, Mujeres y Niños | 200 |
| `GET /shipping-methods` | Estándar, expreso y recojo | 200 |
| `GET /products` | Seis libros; filtros `men`, `women`, `kids`; categoría desconocida | 200 |
| `GET /products/search` | `q=1984`, `q=Orwell`, sin coincidencias y sin término | 200, 422 |
| `GET /products/:id` | Libros 101 a 106; libro inexistente | 200, 404 |
| `POST /auth/register` | Registro fijo, correo duplicado y términos sin aceptar | 201, 409, 422 |
| `POST /auth/login` | Credenciales correctas, incorrectas o vacías | 200, 401, 422 |
| `GET /auth/me` | Perfil, ausencia de token y token inválido | 200, 401 |
| `POST /auth/refresh` | Cookie ficticia válida o ausente | 200, 401 |
| `POST /auth/logout` | Eliminación de la cookie ficticia | 204 |
| `POST /orders` | Compra como cliente o invitado, carrito vacío, stock insuficiente y producto inexistente | 201, 422, 409, 404 |
| `GET /orders/mine` | Lista fija de pedidos del cliente y ausencia de autenticación | 200, 401 |
| `GET /orders/:id` | Pedido 1001, pedido ajeno o inexistente | 200, 404, 401 |

También se incluyen `OPTIONS` para CORS (204), token CSRF ausente o inválido en los POST (403), token de acceso inválido en la compra (401) y ruta desconocida (404).

## Datos de prueba

Los seis libros, sus precios, las categorías y las tarifas de envío provienen de `Back/seeders/202609030001-public-data.cjs`. Para ensayar falta de stock, el libro 105, **El principito**, tiene **2 unidades** en el mock; pedir 3 produce 409. Esta diferencia es intencional y no modifica el seeder real.

| Dato | Valor |
| --- | --- |
| Cliente ficticio | Ana Torres |
| Correo de login | `ana.torres@example.com` |
| Contraseña de demostración | `Lectura2026!` |
| Correo que activa duplicidad | `registrado@example.com` |
| CSRF ficticio | `csrf-entre-paginas-demo` |
| Bearer ficticio | `access-entre-paginas-demo` |
| Cookie de renovación ficticia | `refresh_token=refresh-entre-paginas-demo` |
| Pedido fijo | 1001, `EP-20260917-A4B10001` |
| Fecha de entrega del escenario | `2026-10-01` |

El pedido correcto contiene dos unidades del libro 101 a S/ 42.00: subtotal S/ 84.00, envío estándar S/ 10.00 y total S/ 94.00. El pago devuelve `SIMULATED_APPROVED` y únicamente los últimos cuatro dígitos ficticios `4242`.

Se conserva una particularidad del contrato real: `POST /orders` responde con importes como cadenas (`"94.00"`), mientras que `GET /orders/mine` y `GET /orders/:id` devuelven números (`94`). La colección comprueba ambos formatos.

## Predicados y alcance de la simulación

Mountebank evalúa los stubs en orden y utiliza el primero cuyos predicados coinciden. Primero están las validaciones de cabeceras; después, los escenarios específicos, y al final las respuestas generales. Por ejemplo, la ruta de búsqueda precede al patrón de detalle de productos.

Para obtener un libro se usa una comparación de método y ruta:

```json
{
  "equals": {
    "method": "GET",
    "path": "/api/v1/products/101"
  }
}
```

`equals` permite seleccionar filtros y campos de las credenciales. `deepEquals` exige el cuerpo JSON completo de los escenarios de registro correcto y pedidos, independientemente del orden de las propiedades. `matches` reconoce patrones de rutas y cookies. `not` y `or` expresan las condiciones de autenticación.

- Los cuerpos de las solicitudes están completos en la colección. Para registro y pedidos, usar exactamente los ejemplos incluidos; cambiar cantidades, datos del comprador o fechas puede dejar de coincidir con un escenario.
- Un registro o pedido no configurado responde 400 con `MOCK_SCENARIO_NOT_CONFIGURED`. Este código pertenece únicamente al mock y no al backend real; evita aparentar que un cuerpo arbitrario produjo un registro o pedido válido.
- Las búsquedas configuradas son `1984` y `Orwell`; cualquier otro término no vacío devuelve una lista vacía. No se implementa un motor de búsqueda. Los filtros configurados son `men`, `women` y `kids`.
- No hay persistencia: registrar dos veces devuelve el mismo usuario; repetir la compra devuelve el mismo pedido y no reduce stock. El historial está precargado y no depende de haber comprado antes. El correo duplicado es un escenario separado y fijo.
- Los tokens no son JWT reales. El CSRF se simula mediante una cabecera fija; no se implementan HMAC, rotación ni validación criptográfica de cookies. El logout elimina la cookie de renovación, pero no revoca tokens en memoria. No se reproducen rate limiting ni todas las reglas de validación del servidor real.
- El mock incluye CORS para `http://localhost:5173`, pero su objetivo es validar los ejemplos de Postman. No sustituye un backend funcional para compras arbitrarias desde el frontend.
- Las fechas son datos estáticos de la actividad. Si se desean otros escenarios, actualizar conjuntamente el cuerpo esperado del stub y el ejemplo de Postman.
