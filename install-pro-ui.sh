#!/data/data/com.termux/files/usr/bin/bash
set -e
ROOT="$HOME/gandom"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/backups/PRO-$STAMP"
EVID="$ROOT/evidence/PRO-$STAMP"
mkdir -p "$BACKUP" "$EVID"
[ -d "$ROOT/www" ] && cp -a "$ROOT/www" "$BACKUP/www"
echo "BACKUP=PASS"
