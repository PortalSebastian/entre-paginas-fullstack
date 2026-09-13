# Entre Páginas — Proyecto Web Full Stack

Librería virtual (e-commerce de libros) del Diplomado PUCP 2026.

- `Front/`: React 19 + Vite 8 + React Router 7.
- `Back/`: API REST con Express 5, Sequelize + MySQL, JWT y protección CSRF.

Grupo 1: Sebastian Portal Goicochea y Christian Ramirez Villafuerte.

## Actividad 2 — Front en Docker

El front se ejecuta dentro de un contenedor a partir de [`Front/Dockerfile`](Front/Dockerfile).
El backend y MySQL siguen corriendo en el host; el navegador del host consume la API en
`http://localhost:3000/api/v1`, por eso el contenedor se publica en el puerto `5173`, que es
el origen que el backend acepta (`FRONTEND_ORIGIN`).

Requisitos: Docker Desktop encendido y el backend levantado (ver más abajo).

```bash
cd Front
docker build -t entre-paginas-front .

docker run -d -p 5173:5173 --name entre-paginas-front entre-paginas-front
```

Abrir <http://localhost:5173>.

Comandos útiles:

```bash
docker images entre-paginas-front      # imagen construida
docker ps                              # contenedor en ejecución y puertos
docker logs entre-paginas-front        # salida del servidor de Vite
docker stop entre-paginas-front        # detener
docker rm entre-paginas-front          # eliminar el contenedor
```

## Backend en el host

```bash
cd Back
cp .env.example .env    # completar credenciales de MySQL y secretos (32+ caracteres)
npm install
npm run db:migrate
npm run db:seed
npm start               # http://localhost:3000
```
