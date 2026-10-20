#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
LAW="$ROOT/gandom-core/governance/GOLDEN-MOTHER-LAW-2558.json"
HASH="$LAW.sha256"

case "${1:-status}" in

status|verify)
  test -f "$LAW" || {
    echo "LAW_2558=NOT_FOUND"
    exit 1
  }

  node - "$LAW" <<'NODE'
const fs=require("fs");
const p=process.argv[2];
const x=JSON.parse(fs.readFileSync(p,"utf8"));

const required =
  x.id==="2558" &&
  x.project==="GANDOM" &&
  x.status==="ACTIVE" &&
  x.scope==="ABSOLUTE_MOTHER_RULE" &&
  x.rules.real_execution===true &&
  x.rules.real_evidence_required===true &&
  x.rules.no_fake_pass===true &&
  x.rules.owner_financial_control===true &&
  x.rules.ai_withdrawal_authority===false &&
  x.rules.ai_transfer_authority===false &&
  x.completion_rule.final_step==="125";

console.log("LAW_2558_ID="+x.id);
console.log("LAW_2558_STATUS="+x.status);
console.log("LAW_2558_INTERNAL_VERIFICATION="+(required?"PASS":"FAIL"));
process.exit(required?0:1);
NODE
  ;;

copy)
  cat "$LAW"
  ;;

hash)
  sha256sum "$LAW"
  ;;

execute)
  "$0" verify
  export GANDOM_LAW_2558=ACTIVE
  export GANDOM_LAW_2558_VERIFIED=TRUE
  export GANDOM_LAW_2558_ID=2558
  echo "LAW_2558_EXECUTION_GATE=PASS"
  echo "GANDOM_LAW_2558=ACTIVE"
  ;;

*)
  echo "LAW 2558 COMMANDS:"
  echo "  status   = استعلام وضعیت"
  echo "  verify   = راستی‌آزمایی داخلی"
  echo "  copy     = کپی/نمایش کامل قانون"
  echo "  hash     = استعلام Hash"
  echo "  execute  = اجرای Gate داخلی قانون"
  exit 2
  ;;
esac
