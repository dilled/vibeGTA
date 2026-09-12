#!/usr/bin/env bash
# testmp — manage the VibeGTA MP test stack.
#
#   testmp            start everything missing, open join link (default)
#   testmp start     same as default
#   testmp stop      stop both servers   (or: testmp stop mp|static)
#   testmp status    show ports, pids, logs, join link
#
#   GAME_PORT (default 3000) : static page / game server (npx serve .)
#   MP_PORT   (default 3002) : VibeGTAPlugin WSS server (Server.cfg: port)
#   HOST_IP  : override the IP used in the join link (default: first LAN IP)
set -euo pipefail

PROJ="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$PROJ/../ServerBase/build-linux/VibeGTAPlugin"
GAME_PORT="${GAME_PORT:-3000}"
MP_PORT="${MP_PORT:-3002}"
IP="${HOST_IP:-$(hostname -I 2>/dev/null | awk '{print $1}')}"
IP="${IP:-localhost}"
LINK="http://$IP:$GAME_PORT/?mp=$IP:$MP_PORT"

listening() { ss -tln 2>/dev/null | awk 'NR>0 {print $4}' | grep -qE "[:.]${1}\$"; }

pid_on_port() {
  local port="$1"
  ss -tlnp 2>/dev/null | grep -E "[:.]${port}[[:space:]]" | head -1 \
    | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2
}

start_mp() {
  if listening "$MP_PORT"; then
    echo "MP server   : already running (port $MP_PORT)"
    return
  fi
  echo "MP server   : starting ..."
  (cd "$SERVER_DIR" && nohup ./VibeGTAPlugin > /tmp/vibegta-mp.log 2>&1 & disown)
  for _ in $(seq 1 20); do
    listening "$MP_PORT" && break
    sleep 0.5
  done
  if ! listening "$MP_PORT"; then
    echo "ERROR: MP server did not open port $MP_PORT — see /tmp/vibegta-mp.log" >&2
    exit 1
  fi
  echo "MP server   : up (port $MP_PORT, log /tmp/vibegta-mp.log)"
}

start_static() {
  if listening "$GAME_PORT"; then
    echo "Game static : already running (port $GAME_PORT)"
    return
  fi
  echo "Game static : starting (npx serve . -l $GAME_PORT) ..."
  (cd "$PROJ" && nohup npx --yes serve . -l "$GAME_PORT" > /tmp/vibegta-serve.log 2>&1 & disown)
  for _ in $(seq 1 30); do
    listening "$GAME_PORT" && break
    sleep 0.5
  done
  if ! listening "$GAME_PORT"; then
    echo "ERROR: static server did not open port $GAME_PORT — see /tmp/vibegta-serve.log" >&2
    exit 1
  fi
  echo "Game static : up (port $GAME_PORT, log /tmp/vibegta-serve.log)"
}

kill_port() {
  local port="$1" name="$2" pid
  pid="$(pid_on_port "$port")" || true
  if [ -n "${pid:-}" ]; then
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 10); do
      pid_on_port "$port" >/dev/null 2>&1 || break
      sleep 0.5
    done
    if pid_on_port "$port" >/dev/null 2>&1; then
      echo "$name: still running after SIGTERM (pid $pid) — kill -9 $pid if needed" >&2
      return 1
    fi
    echo "$name: stopped (was pid $pid)"
  else
    echo "$name: not running"
  fi
}

do_stop() {
  case "${1:-all}" in
    mp|all)      kill_port "$MP_PORT"   "MP server"   ;;
    static)      kill_port "$GAME_PORT" "Game static" ;;
    *) echo "usage: testmp stop [all|mp|static]" >&2; exit 2 ;;
  esac
}

CERT_FILE="$SERVER_DIR/certs/cert.pem"

do_cert_line() {
  local end_date exp_s now_s days_left
  end_date="$(openssl x509 -in "$CERT_FILE" -noout -enddate 2>/dev/null | cut -d= -f2)" || {
    echo "Cert        : MISSING ($CERT_FILE) — MP server cannot start"
    return
  }
  exp_s="$(date -d "$end_date" +%s 2>/dev/null)" || { echo "Cert        : unreadable expiry"; return; }
  now_s="$(date +%s)"; days_left=$(( (exp_s - now_s) / 86400 ))
  if [ "$days_left" -lt 0 ]; then
    echo "Cert        : EXPIRED on $end_date — browser will refuse wss; regenerate (see: testmp help)"
  elif [ "$days_left" -le 30 ]; then
    echo "Cert        : EXPIRING in $days_left day(s) ($end_date) — regenerate soon"
  else
    echo "Cert        : OK — expires $end_date ($days_left days)"
  fi
}

do_status() {
  for spec in "$MP_PORT:MP server:/tmp/vibegta-mp.log" \
              "$GAME_PORT:Game static:/tmp/vibegta-serve.log"; do
    port="${spec%%:*}"; rest="${spec#*:}"; name="${rest%%:*}"; log="${rest#*:}"
    pid="$(pid_on_port "$port")" || true
    if [ -n "${pid:-}" ]; then
      echo "$name   : RUNNING  port $port  pid $pid  (log: $log)"
    else
      echo "$name   : stopped  port $port  (log: $log)"
    fi
  done
  do_cert_line
  echo
  echo "Join link: $LINK"
}

do_help() {
  cat <<EOF
testmp — VibeGTA multiplayer test stack

Usage:
  testmp                start anything missing, open join link (default)
  testmp start          same as default
  testmp status         servers, PIDs, cert status, join link
  testmp stop [all]     stop both   (testmp stop mp | testmp stop static)
  testmp help           this text

Components:
  game static   : port $GAME_PORT    npx serve .            log: /tmp/vibegta-serve.log
  MP server     : port $MP_PORT    $SERVER_DIR/VibeGTAPlugin
                  WSS, self-signed cert: $CERT_FILE
                  config: $SERVER_DIR/Server.cfg
                  log: /tmp/vibegta-mp.log
  logs          : tail -f /tmp/vibegta-mp.log   (MP)  /tmp/vibegta-serve.log (static)

Env overrides:  GAME_PORT (default $GAME_PORT)   MP_PORT (default $MP_PORT)   HOST_IP

Join link:  $LINK

MP rules:
  - each browser TAB is a separate player — open 2-3 tabs with the join link
  - after any client or server change: HARD-REFRESH (Ctrl+Shift+R) all tabs,
    else old tabs show players but block edits stop syncing
  - self-signed cert: after cert change/rebuild, accept the warning once by
    opening https://$IP:$MP_PORT/ (Advanced → Continue) — then wss to that host:port works
  - single-player tabs (no ?mp=) are completely unaffected

Cert (if expired/expiring, regenerate then: testmp stop mp && testmp):
  cd $SERVER_DIR/certs && openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout key.pem -out cert.pem -days 3650 -subj "/O=VibeGTA Test/OU=local" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:$IP"

Quick MP test (full checklist: TESTING.md §3 "Multiplayer"):
  1. both tabs show the same city; your character appears in the other
     with a name tag (~30 Hz, interpolated)
  2. break a block in tab A → gone in tab B within ~0.5 s
  3. try to break a ROAD → pops back in your OWN tab only (server rejection)
  4. third tab joins late → it already has the first two tabs' breaks
  5. kill MP server (testmp stop mp) → tabs try to reconnect for 30 s

After changing MP code: node smoke/run.mjs → SMOKE_OK, and keep protocol in
sync with ServerBase/VibeGTAPlugin/include/.../NetState.hpp (protocol v2).
EOF
}

case "${1:-start}" in
  start)  start_mp; start_static
          echo
          echo "Join link: $LINK"
          xdg-open "$LINK" 2>/dev/null || true
          ;;
  stop)   shift; do_stop "${1:-all}" ;;
  status) do_status ;;
  help|-h|--help) do_help ;;
  *) echo "usage: testmp [start] | stop [all|mp|static] | status | help" >&2; exit 2 ;;
esac
