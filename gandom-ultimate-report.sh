#!/data/data/com.termux/files/usr/bin/bash
# GANDOM Ultimate Report — LAW 2558
set -u
ROOT="${GANDOM_ROOT:-$HOME/gandom}"
if [ ! -d "$ROOT" ]; then printf 'ERROR: GANDOM root not found\n'; exit 1; fi
cd "$ROOT" || exit 1

GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'
ok() { printf '%s[PASS]%s %s\n' "$GREEN" "$RESET" "$1"; }
fail() { printf '%s[FAIL]%s %s\n' "$RED" "$RESET" "$1"; }
section() { printf '\n==================================================\n%s\n==================================================\n' "$1"; }

probe_http() {
    local port="$1"; local endpoint="$2"; local label="$3"; local code
    code="$(curl -sS -o /dev/null --connect-timeout 2 --max-time 4 -w '%{http_code}' "http://127.0.0.1:${port}${endpoint}" 2>/dev/null)" || code="000"
    if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then ok "$label (port=$port) HTTP=$code"; else fail "$label (port=$port) HTTP=${code:-000}"; fi
}

section "GANDOM ULTIMATE STATUS REPORT"
printf 'Time UTC: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

section "1. HTTP SERVICES"
probe_http 8787 "/health" "Node A"
probe_http 8788 "/health" "Node B"
probe_http 8080 "/" "Web UI"
probe_http 8888 "/health" "Audit"
probe_http 9000 "/health" "Wallet"

section "2. BLOCKCHAIN FILES"
for chain in "blockchain-data/chain.json" "blockchain-data-b/chain.json"; do
    if [ -f "$chain" ]; then
        CHAIN_FILE="$chain" node -e '
        const fs = require("fs");
        try {
            const data = JSON.parse(fs.readFileSync(process.env.CHAIN_FILE, "utf8"));
            const len = Array.isArray(data.chain) ? data.chain.length : "UNKNOWN";
            console.log(`FILE=${process.env.CHAIN_FILE} | LENGTH=${len}`);
        } catch (e) { console.log(`FILE=${process.env.CHAIN_FILE} | ERROR`); }'
    fi
done

section "3. WALLET BALANCES"
if [ -f "wallet/wallet-state.json" ]; then
    node -e '
    const fs = require("fs");
    try {
        const w = JSON.parse(fs.readFileSync("wallet/wallet-state.json", "utf8"));
        console.log("TREASURY_IRT=" + (w.treasury_balance?.irt ?? "MISSING"));
        console.log("OWNER_IRT=" + (w.owner_balance?.irt ?? "MISSING"));
    } catch (e) { console.log("WALLET_ERROR"); }'
fi

section "4. VICTORY RECORD"
if [ -f "GANDOM-VICTORY.json" ]; then cat "GANDOM-VICTORY.json"; printf '\n'; fi

section "5. NODE PROCESSES"
pgrep -af 'node|gandom' || echo "No processes found"

section "6. GIT STATUS"
git status -s

section "REPORT COMPLETE"
