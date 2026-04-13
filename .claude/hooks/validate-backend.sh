#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Agent-Matrix: PostToolUse Hook — Backend Pattern Validator
# Edit/Write sonrasi backend dosyalarinda kritik pattern ihlallerini kontrol eder.
# Sadece UYARI verir, bloklamaz (exit 0).
# ─────────────────────────────────────────────────────────────

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try{
      const j=JSON.parse(d);
      console.log(j.tool_input?.file_path || j.tool_input?.new_file_path || '');
    }catch{console.log('')}
  });
" 2>/dev/null)

[[ -z "$FILE_PATH" ]] && exit 0
[[ ! -f "$FILE_PATH" ]] && exit 0

WARNINGS=0

# ── server/src/agents/*.js — Agent Dosya Kontrolleri ────────
if [[ "$FILE_PATH" == *server/src/agents/*.js ]]; then

  # require() kullanimi kontrolu (ES Modules ihlali)
  if grep -qP '\brequire\s*\(' "$FILE_PATH" 2>/dev/null; then
    echo "⚠️  [VALIDATE] ES Module ihlali: require() kullanilmis!"
    echo "   Dosya: $FILE_PATH"
    echo "   Kural: server/ altinda sadece import/export kullanilmali."
    WARNINGS=$((WARNINGS + 1))
  fi

  # config parametresi eksik ama config kullaniliyor
  if grep -qP 'config\?\.' "$FILE_PATH" 2>/dev/null || grep -qP 'config\.' "$FILE_PATH" 2>/dev/null; then
    # Fonksiyon signature'inda config var mi kontrol et
    if ! grep -qP 'function\s+\w+\s*\(\s*state\s*,\s*config' "$FILE_PATH" 2>/dev/null && \
       ! grep -qP 'async\s+function\s+\w+\s*\(\s*state\s*,\s*config' "$FILE_PATH" 2>/dev/null && \
       ! grep -qP '\(\s*state\s*,\s*config\s*\)\s*=>' "$FILE_PATH" 2>/dev/null; then
      echo "⚠️  [VALIDATE] LangGraph config gotcha: 'config' kullaniliyor ama fonksiyon signature'inda (state, config) yok!"
      echo "   Dosya: $FILE_PATH"
      echo "   Kural: config?.configurable kullaniyorsan (state, config) tanimlanmali."
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
fi

# ── server/src/models/*.js — Model Export Kontrolleri ────────
if [[ "$FILE_PATH" == *server/src/models/*.js ]]; then

  # export default kullanimi (named export olmali)
  if grep -qP '^\s*export\s+default\b' "$FILE_PATH" 2>/dev/null; then
    echo "⚠️  [VALIDATE] Named export kullanilmali, export default degil!"
    echo "   Dosya: $FILE_PATH"
    echo "   Kural: export const ModelName = mongoose.model(...) seklinde olmali."
    WARNINGS=$((WARNINGS + 1))
  fi

  # require() kullanimi
  if grep -qP '\brequire\s*\(' "$FILE_PATH" 2>/dev/null; then
    echo "⚠️  [VALIDATE] ES Module ihlali: require() kullanilmis!"
    echo "   Dosya: $FILE_PATH"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# ── server/src/routes/*.js — Route Ordering Kontrolleri ──────
if [[ "$FILE_PATH" == *server/src/routes/*.js ]]; then

  # require() kullanimi
  if grep -qP '\brequire\s*\(' "$FILE_PATH" 2>/dev/null; then
    echo "⚠️  [VALIDATE] ES Module ihlali: require() kullanilmis!"
    echo "   Dosya: $FILE_PATH"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# ── server/src/ altindaki tum .js dosyalari ──────────────────
if [[ "$FILE_PATH" == *server/src/*.js ]]; then

  # adminController import'u standalone servislerden (circular dependency)
  BASENAME=$(basename "$FILE_PATH")
  if [[ "$BASENAME" == "bannedIPCacheService.js" || "$BASENAME" == "costEventBus.js" || "$BASENAME" == "rateLimiter.js" ]]; then
    if grep -qP 'import.*adminController' "$FILE_PATH" 2>/dev/null; then
      echo "⚠️  [VALIDATE] Circular dependency riski: $BASENAME icerisinde adminController import edilmis!"
      echo "   Kural: bannedIPCacheService, costEventBus ve rateLimiter standalone kalmali."
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
fi

if [[ $WARNINGS -gt 0 ]]; then
  echo "━━━ Toplam $WARNINGS uyari tespit edildi. ━━━"
fi

exit 0
