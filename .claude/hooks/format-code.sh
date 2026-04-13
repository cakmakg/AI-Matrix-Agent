#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Agent-Matrix: PostToolUse Hook — Auto ESLint Fix
# Edit veya Write sonrasi frontend .ts/.tsx dosyalarini lint'ler.
# ─────────────────────────────────────────────────────────────

INPUT=$(cat)

# JSON parse — node kullan (python3 Windows'ta her zaman yok)
FILE_PATH=$(echo "$INPUT" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try{
      const j=JSON.parse(d);
      console.log(j.tool_input?.file_path || j.tool_input?.new_file_path || '');
    }catch{console.log('')}
  });
" 2>/dev/null)

# Dosya yolu bos ise cik
[[ -z "$FILE_PATH" ]] && exit 0

# Frontend .ts/.tsx dosyalari icin ESLint fix
if [[ "$FILE_PATH" == *frontend/src/*.tsx || "$FILE_PATH" == *frontend/src/*.ts ]]; then
  # ESLint config frontend/ altinda, oradan calistir
  FRONTEND_DIR="$(cd "$(dirname "$0")/../.." && pwd)/frontend"
  if [[ -f "$FRONTEND_DIR/eslint.config.mjs" ]]; then
    cd "$FRONTEND_DIR" && npx eslint --fix "$FILE_PATH" 2>/dev/null || true
  fi
fi

exit 0
