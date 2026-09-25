#!/usr/bin/env bash
# Copia versionada de /home/ubuntu/deploy-entre-paginas.sh (EC2 i-01d8bc55ceea39169).
# La invoca .github/workflows/ci-cd.yml (job deploy) via AWS SSM Run Command:
#   sudo -u ubuntu -H bash /home/ubuntu/deploy-entre-paginas.sh <GITHUB_SHA>
# Corre como el usuario `ubuntu`; $1 es el SHA de 40 caracteres a desplegar.
# Proceso PM2: entre-paginas-backend (exec cwd /home/ubuntu/entre-paginas-fullstack/Back).
set -euo pipefail

SHA="${1:?Falta el SHA del commit}"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo 'SHA inválido'; exit 1; }

REPO=/home/ubuntu/entre-paginas-fullstack
cd "$REPO"
[[ "$(git branch --show-current)" == main ]] || { echo 'EC2 no está en main'; exit 1; }
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || {
  echo 'Hay cambios locales versionados en EC2; revisar antes de desplegar'
  exit 1
}

GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND='ssh -o BatchMode=yes' git fetch origin main:refs/remotes/origin/main
[[ "$(git rev-parse origin/main)" == "$SHA" ]] || {
  echo 'El SHA solicitado no coincide con origin/main'
  exit 1
}
git merge --ff-only "$SHA"

export NVM_DIR=/home/ubuntu/.nvm
. "$NVM_DIR/nvm.sh"
nvm use 22
cd "$REPO/Back"
npm ci --include=dev
NODE_ENV=production npm run db:migrate
pm2 restart entre-paginas-backend --update-env

for intento in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:3000/api/v1/health; then
    echo
    echo "Despliegue correcto: $SHA"
    exit 0
  fi
  sleep 3
done

echo 'La API no respondió después del reinicio'
pm2 logs entre-paginas-backend --lines 40 --nostream
exit 1
