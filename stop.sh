#!/usr/bin/env bash
# Encerra backend e frontend iniciados pelo start.sh. Não derruba o banco.
set -uo pipefail
cd "$(dirname "$0")"

kill_tree() {
  local pid=$1
  if [ -r "/proc/$pid/winpid" ]; then
    # Git Bash no Windows: encerra a árvore de processos nativa.
    taskkill //PID "$(cat "/proc/$pid/winpid")" //T //F >/dev/null 2>&1 || true
  else
    # Linux/WSL/macOS: o start.sh criou um grupo de processos por serviço.
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  fi
}

free_port() {
  local port=$1
  if command -v netstat.exe >/dev/null 2>&1 && command -v taskkill >/dev/null 2>&1; then
    netstat.exe -ano | tr -d '\r' | awk -v p=":$port" '$2 ~ p"$" && $4 == "LISTENING" {print $5}' | sort -u |
      while read -r winpid; do taskkill //PID "$winpid" //T //F >/dev/null 2>&1 || true; done
  elif command -v lsof >/dev/null 2>&1; then
    lsof -ti "tcp:$port" -sTCP:LISTEN | xargs -r kill -TERM 2>/dev/null || true
  fi
}

stop_process() {
  local name=$1 port=$2
  local pidfile=".pids/$name.pid"
  if [ -f "$pidfile" ]; then
    kill_tree "$(cat "$pidfile")"
    rm -f "$pidfile"
  fi
  # Garantia: se algo ainda escuta na porta do serviço, encerra.
  free_port "$port"
  echo "$name encerrado."
}

stop_process backend 3000
stop_process frontend 5173
