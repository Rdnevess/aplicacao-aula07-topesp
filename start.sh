#!/usr/bin/env bash
# Sobe o banco, o backend e o frontend. Saídas em logs/, PIDs em .pids/.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f backend/.env ]; then
  echo "Falta backend/.env: copie backend/.env.example e preencha os valores." >&2
  exit 1
fi

mkdir -p logs .pids

for dir in backend frontend; do
  if [ ! -d "$dir/node_modules" ]; then
    echo "Instalando dependências de $dir..."
    (cd "$dir" && npm install)
  fi
done

docker compose up -d
echo "Aguardando o PostgreSQL..."
until docker compose exec -T db pg_isready -U ditado >/dev/null 2>&1; do sleep 1; done

# Job control: cada processo em segundo plano ganha o próprio grupo, que o stop.sh encerra inteiro.
set -m

start_process() {
  local name=$1 dir=$2
  shift 2
  local pidfile=".pids/$name.pid"
  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "$name já está rodando (PID $(cat "$pidfile"))."
    return
  fi
  (cd "$dir" && exec "$@") >"logs/$name.log" 2>&1 &
  echo $! >"$pidfile"
  echo "$name iniciado (PID $!), log em logs/$name.log"
}

start_process backend backend npm run start:dev
start_process frontend frontend npm run dev

echo
echo "Frontend: http://localhost:5173"
echo "API:      http://localhost:3000/api/health"
echo "Para derrubar: ./stop.sh   (o banco continua; docker compose down para parar)"
