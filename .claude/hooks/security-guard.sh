#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Agent-Matrix: PreToolUse Hook — Security Guard
# Bash komutu calistirilmadan once tehlikeli pattern'lari engeller.
# exit 2 = BLOKLA, exit 0 = IZIN VER
# ─────────────────────────────────────────────────────────────

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try{
      const j=JSON.parse(d);
      console.log(j.tool_input?.command || '');
    }catch{console.log('')}
  });
" 2>/dev/null)

[[ -z "$COMMAND" ]] && exit 0

# ── Genel Tehlikeli Pattern'lar ──────────────────────────────
DANGEROUS=(
  "rm -rf /"
  "rm -rf ~"
  "rm -rf ."
  "DROP TABLE"
  "DROP DATABASE"
  "format c:"
  "del /f /s"
  "git push --force"
  "git push -f"
  "reset --hard"
  "checkout -- ."
  "git clean -fd"
  "git branch -D main"
  "git branch -D master"
)

for pattern in "${DANGEROUS[@]}"; do
  if [[ "$COMMAND" == *"$pattern"* ]]; then
    echo "🚨 [BLOCKED] Tehlikeli komut tespit edildi: '$pattern'"
    echo "   Komut: $COMMAND"
    echo "   Bu islemi yapmak icin kullanicidan manuel onay alin."
    exit 2
  fi
done

# ── Agent-Matrix'e Ozel Pattern'lar ─────────────────────────

# .env iceriginin loglara sizmasi
if [[ "$COMMAND" =~ cat.*\.env || "$COMMAND" =~ less.*\.env || "$COMMAND" =~ more.*\.env || "$COMMAND" =~ echo.*\.env ]]; then
  echo "🚨 [BLOCKED] .env dosya icerigi terminal'e acilamaz — secret sizintisi riski!"
  echo "   Komut: $COMMAND"
  echo "   .env dosyasini okumak icin Read tool kullanin."
  exit 2
fi

# npm publish — kazara paket yayinlama
if [[ "$COMMAND" == *"npm publish"* ]]; then
  echo "🚨 [BLOCKED] npm publish komutu engellendi — kazara yayinlama riski!"
  exit 2
fi

# MongoDB drop komutu
if [[ "$COMMAND" =~ mongo.*drop ]]; then
  echo "🚨 [BLOCKED] MongoDB drop komutu engellendi — veri kaybi riski!"
  echo "   Komut: $COMMAND"
  exit 2
fi

# Sorun yoksa devam et
exit 0
