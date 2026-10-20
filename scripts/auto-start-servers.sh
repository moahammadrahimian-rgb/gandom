#!/data/data/com.termux/files/usr/bin/bash

set +e
PROJECT="$HOME/gandom"
LOG="$PROJECT/auto-start.log"

cd "$PROJECT" || exit 1

{
  echo
  echo "===== AUTO START $(date) ====="

  # Backend: port 8787
  if curl --max-time 2 -fsS \
    http://127.0.0.1:8787/health >/dev/null 2>&1; then
    echo "BACKEND=ALREADY_RUNNING"
  else
    echo "BACKEND=STARTING"
    nohup node "$PROJECT/server.js" \
      >> "$PROJECT/backend.log" 2>&1 </dev/null &
    sleep 2

    if curl --max-time 3 -fsS \
      http://127.0.0.1:8787/health >/dev/null 2>&1; then
      echo "BACKEND=RUNNING"
    else
      echo "BACKEND=FAILED_CHECK_LOG"
    fi
  fi

  # Frontend: port 8080
  if curl --max-time 2 -fsS \
    http://127.0.0.1:8080/ >/dev/null 2>&1; then
    echo "FRONTEND=ALREADY_RUNNING"
  else
    if [ -x "$PROJECT/node_modules/.bin/serve" ]; then
      echo "FRONTEND=STARTING"
      nohup "$PROJECT/node_modules/.bin/serve" \
        public -l 8080 --no-clipboard \
        >> "$PROJECT/frontend.log" 2>&1 </dev/null &
      sleep 2

      if curl --max-time 3 -fsS \
        http://127.0.0.1:8080/ >/dev/null 2>&1; then
        echo "FRONTEND=RUNNING"
      else
        echo "FRONTEND=FAILED_CHECK_LOG"
      fi
    else
      echo "FRONTEND=BLOCKED_MISSING_SERVE"
    fi
  fi

  echo "===== END AUTO START ====="
} >> "$LOG" 2>&1

exit 0
