# Infraestructura del backend (EC2)

Copias versionadas, sin secretos, de lo que vive en la EC2 `i-01d8bc55ceea39169`
(us-east-1, Ubuntu 24.04, Elastic IP `52.22.178.175`). La API se publica en
`https://api.entrepaginas.lat`.

| Archivo | Dónde vive en la EC2 |
|---|---|
| `ec2/deploy-entre-paginas.sh` | `/home/ubuntu/deploy-entre-paginas.sh` |
| `nginx/api.entrepaginas.lat.conf` | `/etc/nginx/sites-available/api.entrepaginas.lat` (enlazado en `sites-enabled`) |
| `../Back/.env.production.example` | plantilla del `.env` real: `/home/ubuntu/entre-paginas-fullstack/Back/.env` |

## Flujo de despliegue

`push` a `main` → `.github/workflows/ci-cd.yml` (`test-back`, `test-front` y `snyk` en verde) →
job `deploy`: OIDC a un rol de AWS (sin llaves guardadas) → `aws ssm send-command` →
la EC2 ejecuta el script con el SHA como argumento → `git merge --ff-only`, `npm ci`,
migraciones y `pm2 restart entre-paginas-backend --update-env` → health check local
y luego, desde Actions, contra `BACKEND_PUBLIC_URL`.

Tráfico: navegador → Nginx `:443` (TLS) → Node/Express `127.0.0.1:3000` (PM2) → MySQL 8 local.
Express confía en un salto de proxy (`trust proxy` = 1) para leer la IP del cliente y el protocolo.

## Certificado

Emitido con `sudo certbot --nginx -d api.entrepaginas.lat` (Let's Encrypt). Certbot
reescribe el sitio (bloque 443 y redirección 301 de 80 a https). La renovación es automática
con el timer del snap de Certbot (`sudo certbot renew --dry-run` para probarla).

## Notas

- El `.env` real existe solo en la EC2. Se crea a partir de `Back/.env.production.example`
  (`NODE_ENV=production`, `FRONTEND_ORIGIN=https://entrepaginas.lat`). Después de editarlo:
  `pm2 restart entre-paginas-backend --update-env`.
- No se aplicó endurecimiento extra de la EC2: los puertos 22 y 3000 siguen abiertos en el
  security group. Queda fuera del alcance de esta entrega.
