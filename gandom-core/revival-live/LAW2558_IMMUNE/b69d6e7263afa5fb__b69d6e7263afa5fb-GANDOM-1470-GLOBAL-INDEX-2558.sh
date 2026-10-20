#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$HOME/gandom"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$ROOT/audit/GANDOM-1470-GLOBAL-$TS"
DB="$OUT/GANDOM-1470.sqlite"
mkdir -p "$OUT"

echo "===== GANDOM 2558 | GLOBAL 1470 INDEX ====="
echo "ROOT=$ROOT"
echo "OUT=$OUT"

test -x "$PREFIX/bin/sqlite3" >/dev/null 2>&1 || {
  echo "SQLITE3_MISSING"
  exit 1
}

"$PREFIX/bin/sqlite3" "$DB" <<'SQL'
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;

CREATE TABLE IF NOT EXISTS sources(
 id INTEGER PRIMARY KEY,
 path TEXT UNIQUE,
 type TEXT,
 size INTEGER,
 mtime INTEGER,
 sha256 TEXT
);

CREATE TABLE IF NOT EXISTS files(
 id INTEGER PRIMARY KEY,
 source_id INTEGER,
 path TEXT,
 relpath TEXT,
 size INTEGER,
 mtime INTEGER,
 sha256 TEXT,
 ext TEXT,
 section TEXT,
 status TEXT,
 UNIQUE(source_id,path)
);

CREATE TABLE IF NOT EXISTS duplicates(
 sha256 TEXT PRIMARY KEY,
 count INTEGER
);

CREATE TABLE IF NOT EXISTS unknown(
 id INTEGER PRIMARY KEY,
 source_id INTEGER,
 path TEXT,
 sha256 TEXT,
 reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_files_sha ON files(sha256);
CREATE INDEX IF NOT EXISTS idx_files_section ON files(section);
CREATE INDEX IF NOT EXISTS idx_files_source ON files(source_id);
SQL

echo "===== DISCOVER BACKUP SOURCES ====="

SOURCE_LIST="$OUT/sources.list"

find "$ROOT" -type f \
  \( -iname '*.tar' -o -iname '*.tar.gz' -o -iname '*.tgz' \
     -o -iname '*.zip' -o -iname '*.7z' \
     -o -iname '*backup*' -o -iname '*snapshot*' \
     -o -iname '*restore*' -o -iname '*revival*' \
     -o -iname '*2558*' \) \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -print0 2>/dev/null | sort -z -u > "$SOURCE_LIST"

find "$ROOT" -type d \
  \( -iname '*backup*' -o -iname '*snapshot*' \
     -o -iname '*restore*' -o -iname '*revival*' \
     -o -iname '*2558*' \) \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -print0 2>/dev/null | sort -z -u >> "$SOURCE_LIST"

tr '\0' '\n' < "$SOURCE_LIST" | sort -u -o "$SOURCE_LIST"

SOURCE_COUNT="$(wc -l < "$SOURCE_LIST" | tr -d ' ')"
echo "DISCOVERED_SOURCES=$SOURCE_COUNT"

echo "===== INDEX SOURCES + CONTENT ====="

while IFS= read -r SRC; do
  [ -e "$SRC" ] || continue

  if [ -f "$SRC" ]; then
    TYPE="archive/file"
    SIZE="$(stat -c '%s' "$SRC" 2>/dev/null || echo 0)"
    MTIME="$(stat -c '%Y' "$SRC" 2>/dev/null || echo 0)"
    HASH="$(sha256sum "$SRC" 2>/dev/null | awk '{print $1}')"

    "$PREFIX/bin/sqlite3" "$DB" \
      "INSERT OR IGNORE INTO sources(path,type,size,mtime,sha256)
       VALUES($(printf '%q' "$SRC" | sed "s/'/''/g" | sed "s/^/'/;s/$/'/"),
              '$TYPE',$SIZE,$MTIME,'$HASH');"
  else
    TYPE="directory"
    SIZE=0
    MTIME="$(stat -c '%Y' "$SRC" 2>/dev/null || echo 0)"
    HASH=""

    SRC_SQL="${SRC//\'/\'\'}"
    "$PREFIX/bin/sqlite3" "$DB" \
      "INSERT OR IGNORE INTO sources(path,type,size,mtime,sha256)
       VALUES('$SRC_SQL','$TYPE',0,$MTIME,'');"
  fi
done < "$SOURCE_LIST"

echo "===== INDEX FILE CONTENTS ====="

"$PREFIX/bin/sqlite3" "$DB" "SELECT id,path FROM sources ORDER BY id;" |
while IFS='|' read -r SID SRC; do
  [ -d "$SRC" ] || continue

  find "$SRC" -type f \
    -not -path '*/node_modules/*' \
    -not -path '*/.git/*' \
    -print0 2>/dev/null |
  while IFS= read -r -d '' F; do

    SIZE="$(stat -c '%s' "$F" 2>/dev/null || echo 0)"
    MTIME="$(stat -c '%Y' "$F" 2>/dev/null || echo 0)"
    HASH="$(sha256sum "$F" 2>/dev/null | awk '{print $1}')"
    EXT="${F##*.}"
    NAME="$(basename "$F")"
    LOW="$(printf '%s' "$F" | tr '[:upper:]' '[:lower:]')"

    SECTION="UNKNOWN_NEW"
    STATUS="UNKNOWN"

    case "$LOW" in
      *law2558*|*golden-mother-law*|*/constitution/*)
        SECTION="LAW2558"; STATUS="KNOWN" ;;
      *neural*|*brain*|*neuron*)
        SECTION="BRAIN_NEURAL"; STATUS="KNOWN" ;;
      */p2p/*|*p2p*)
        SECTION="P2P"; STATUS="KNOWN" ;;
      *wallet*|*revenue*|*payment*|*settlement*)
        SECTION="HEART_ECONOMY"; STATUS="KNOWN" ;;
      *engine*|*execution*|*core*)
        SECTION="CORE_ENGINE"; STATUS="KNOWN" ;;
      *node*|*runtime*|*heartbeat*)
        SECTION="NODE_RUNTIME"; STATUS="KNOWN" ;;
      *evidence*|*verify*|*audit*|*anti-fake*)
        SECTION="IMMUNE_EVIDENCE"; STATUS="KNOWN" ;;
      */public/*|*/www/*|*index.html*|*css*|*frontend*|*ui*)
        SECTION="EYES_UI"; STATUS="KNOWN" ;;
      *api*|*server*|*http*|*websocket*|*transport*)
        SECTION="HANDS_API"; STATUS="KNOWN" ;;
      *market*|*exchange*|*trade*|*order*)
        SECTION="MARKET_EXCHANGE"; STATUS="KNOWN" ;;
      *social*|*advertis*|*industry*)
        SECTION="SOCIAL_ADVERTISING"; STATUS="KNOWN" ;;
      *security*|*auth*|*identity*)
        SECTION="SECURITY_IDENTITY"; STATUS="KNOWN" ;;
      *)
        SECTION="UNKNOWN_NEW"; STATUS="UNKNOWN" ;;
    esac

    PARENT="$(dirname "$F")"
    REL="$F"

    FSQL="${F//\'/\'\'}"
    RSQL="${REL//\'/\'\'}"

    "$PREFIX/bin/sqlite3" "$DB" \
      "INSERT OR IGNORE INTO files
       (source_id,path,relpath,size,mtime,sha256,ext,section,status)
       VALUES
       ($SID,'$FSQL','$RSQL',$SIZE,$MTIME,'$HASH',
        '${EXT//\'/\'\'}','$SECTION','$STATUS');"

  done
done

echo "===== DUPLICATE CLUSTERS ====="

"$PREFIX/bin/sqlite3" "$DB" <<SQL
DELETE FROM duplicates;
INSERT INTO duplicates(sha256,count)
SELECT sha256,COUNT(*)
FROM files
WHERE sha256!=''
GROUP BY sha256
HAVING COUNT(*)>1;
SQL

DUP="$("$PREFIX/bin/sqlite3" "$DB" 'SELECT COUNT(*) FROM duplicates;')"
UNKNOWN="$("$PREFIX/bin/sqlite3" "$DB" "SELECT COUNT(*) FROM files WHERE section='UNKNOWN_NEW';")"
FILES="$("$PREFIX/bin/sqlite3" "$DB" 'SELECT COUNT(*) FROM files;')"
SOURCES="$("$PREFIX/bin/sqlite3" "$DB" 'SELECT COUNT(*) FROM sources;')"

echo "SOURCES=$SOURCES"
echo "FILES=$FILES"
echo "DUPLICATE_GROUPS=$DUP"
echo "UNKNOWN_NEW=$UNKNOWN"

echo "===== SECTION MATRIX ====="
"$PREFIX/bin/sqlite3" -header -column "$DB" \
  "SELECT section,COUNT(*) AS files
   FROM files
   GROUP BY section
   ORDER BY section;"

echo "===== UNKNOWN / NEW ====="
"$PREFIX/bin/sqlite3" "$DB" \
  "SELECT path FROM files WHERE section='UNKNOWN_NEW' ORDER BY path;" \
  > "$OUT/UNKNOWN-NEW.txt"

echo "===== DUPLICATES ====="
"$PREFIX/bin/sqlite3" -header -column "$DB" \
  "SELECT sha256,count FROM duplicates ORDER BY count DESC;" \
  > "$OUT/DUPLICATES.txt"

echo "===== TREASURE CANDIDATES ====="
"$PREFIX/bin/sqlite3" -header -column "$DB" \
  "SELECT section,COUNT(*) AS files
   FROM files
   WHERE status='KNOWN'
   GROUP BY section
   ORDER BY files DESC;" \
  > "$OUT/TREASURE-SECTIONS.txt"

cat > "$OUT/STATUS.txt" <<EOF
GANDOM 2558 GLOBAL 1470 INDEX

STATUS=INDEX_COMPLETE
SOURCES=$SOURCES
FILES=$FILES
DUPLICATE_GROUPS=$DUP
UNKNOWN_NEW=$UNKNOWN
DATABASE=$DB
DELETE=NO
LIVE_MODIFICATION=NO
BACKUP_MODIFICATION=NO
EOF

cat "$OUT/STATUS.txt"

echo
echo "===== FINAL ====="
echo "STATUS=INDEX_COMPLETE"
echo "DATABASE=$DB"
echo "UNKNOWN=$OUT/UNKNOWN-NEW.txt"
echo "DUPLICATES=$OUT/DUPLICATES.txt"
echo "TREASURE=$OUT/TREASURE-SECTIONS.txt"
