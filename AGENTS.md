# AI Orchestra — Agent Referans Kılavuzu

Bu dosya, Agent-Matrix sistemindeki tüm AI ajanlarını, görevlerini, giriş/çıkış state alanlarını, yönlendirme mantığını ve entegrasyon kurallarını belgeler.

---

## Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────────┐
│                        LangGraph Workflow                       │
│                                                                 │
│  START → [guardrail] → [orchestrator] ←──────────────────┐    │
│                              │                            │    │
│                              ├→ [scraper]   ─────────────┤    │
│                              ├→ [analyzer]  ─────────────┤    │
│                              ├→ [innovator] ─────────────┤    │
│                              ├→ [writer] ↔ [critic] ─────┤    │
│                              ├→ [architect] ─────────────┤    │
│                              ├→ [fileSaver] ─────────────┘    │
│                              │                                  │
│                         ⛔ [human_approval]  ← interruptBefore │
│                              │                                  │
│                              └→ [publisher] → END              │
└─────────────────────────────────────────────────────────────────┘

Standalone (LangGraph dışı):
  [customerBotAgent]    — Gelen mesaj triage + RAG destek yanıtı
  [cmoAgent]            — Onaylanan rapordan pazarlama kampanyası
  [twitterContentAgent] — Otomatik tweet üretimi + zamanlama
```

---

## LangGraph State Şeması

Tüm ajanlar bu state üzerinden iletişim kurar.

| Alan | Tür | Yöneten Ajan | Açıklama |
|------|-----|-------------|---------|
| `task` | string | guardrail, orchestrator | Kullanıcının orijinal görevi (sanitize edilmiş) |
| `threadId` | string | fileAgent | LangGraph thread kimliği |
| `scrapedData` | string | scraperAgent | Tavily'den çekilen ham web içeriği |
| `analysisReport` | string | analyzerAgent | Stratejik analiz raporu (3 aksiyon) |
| `innovatorInsight` | string | innovatorAgent | Vizyoner alternatif ("4. yol") |
| `finalContent` | string | writerAgent, architectAgent | Son üretilen Markdown içerik |
| `confidenceScore` | number | writerAgent | KI güven skoru (0–100) |
| `criticFeedback` | string\|null | criticAgent | Eleştirmenin red gerekçesi |
| `humanFeedback` | string\|null | approvalController | İnsan yargıcının geri bildirimi |
| `isApproved` | boolean | criticAgent | Critic onay durumu |
| `humanApproval` | boolean\|null | approvalController | HITL onay durumu |
| `fileSaved` | boolean | fileAgent, architectAgent | Artifact kaydedildi mi |
| `isPublished` | boolean | publisherAgent | Yayın tamamlandı mı |
| `revisionCount` | number | writerAgent | Toplam revizyon sayısı (max 5) |
| `nextAgent` | string | orchestratorNode | Sıradaki agent adı |
| `threatScore` | number | guardrailAgent | Tehdit skoru (0–10) |
| `blockedReason` | string | guardrailAgent | Engelleme gerekçesi |

---

## Routing Tracks (Yönlendirme Akışları)

Orchestrator, `state.task` içindeki anahtar kelimelere göre **8 farklı akışa** yönlendirir. Tüm özel track'ler LLM'den önce deterministik FREN'lerle kontrol edilir.

### 🔬 Research Track (Varsayılan)
```
scraper → analyzer → innovator → writer ↔ critic → fileSaver → [HITL] → publisher
```
Tetikleyici: Özel anahtar kelime yok. Çıktı: B2B IT raporu (Almanca Markdown).

### 📣 Social Media Track
```
scraper → writer ↔ critic → fileSaver → [HITL] → publisher
```
Tetikleyici: `task` içinde `TWITTER` veya `LINKEDIN`. Analyzer ve Innovator atlanır.

### 🎯 Software / CTO Track
```
architect → fileSaved=true → [HITL] → publisher
```
Tetikleyici: `task` içinde `Code`, `Dashboard`, `Software`, `App`, `Blueprint`, `Next.js`. Writer/Critic döngüsü yok.

### 💡 Innovation Radar Track
```
scraper → architect → fileSaved=true → [HITL] → publisher
```
Tetikleyici: `task` içinde `INNOVATION_RADAR`.

### 📄 RFP Track (FREN R)
```
writer ↔ critic → fileSaver → [HITL] → publisher
```
Tetikleyici: `task` içinde `RFP_RESPONSE`, `IHALE_CEVAP`, `TENDER_RESPONSE`. Scraper ve Analyzer atlanır — RAG bilgi tabanından doğrudan ihale yanıtı üretilir.

### 🎯 B2B Outreach Track (FREN C)
```
scraper → writer ↔ critic → fileSaver → [HITL] → publisher
```
Tetikleyici: `task` içinde `COLD_OUTREACH`, `B2B_OUTREACH`, `SOGUK_SATIS`. Scraper hedef şirketi araştırır; Analyzer/Innovator atlanır.

### 🧪 Business Stress Test Track (FREN T)
```
analyzer → innovator → writer ↔ critic → fileSaver → [HITL] → publisher
```
Tetikleyici: `task` içinde `BUSINESS_STRESS_TEST`. Scraper atlanır — Analyzer pitch deck'i (RAG destekli) analiz eder, Innovator pivot önerir, Writer stres testi raporu yazar.

### 📡 Trend Radar Track (Research Track içinde)
```
scraper → analyzer → innovator → writer ↔ critic → fileSaver → [HITL] → publisher
```
Tetikleyici: `task` içinde `TREND_RADAR:`. Tam araştırma döngüsü — Scraper sektör trendlerini tarar, Analyzer meta-trend çıkarır, Innovator 3 yeni ürün konsepti tasarlar.

### 🧾 Finance Audit Track (FREN A)
```
auditor → fileSaver → [HITL] → publisher
```
Tetikleyici: `INVOICE_PROCESSING`, `FATURA_DENETIM`, `AUDIT_INVOICE`.

### 📦 Supply Chain Track (FREN B)
```
supplyChain → fileSaver → [HITL] → publisher
```
Tetikleyici: `STOCK_CHECK`, `STOK_KONTROL`, `SUPPLY_ALERT`, `INVENTORY_LOW`.

### 💼 Sales Track (FREN S)
```
salesRep (× max 3 tur) → fileSaver → [HITL] → publisher
```
Tetikleyici: `HOT_LEAD_FOLLOWUP`, `SALES_NEGOTIATION`. Müzakere turu 3'e ulaşınca hard stop.

---

## LangGraph Ajanları

---

### 1. 🛡️ GuardRail Agent
**Dosya:** `server/src/agents/guardrailAgent.js` | **Node:** `guardrail`
**LLM:** ❌ Yok (saf regex + kural tabanlı) | **MOAT:** Layer 1

Her workflow'un ilk adımı. `state.task` ve `state.humanFeedback` alanlarını prompt injection ve tehdit kalıplarına karşı tarar.

**Tehdit Puanlama:**
| Seviye | Puan/Eşleşme | Örnek |
|--------|-------------|-------|
| HIGH_RISK | +3 | `ignore all previous instructions`, `jailbreak`, `DAN mode` |
| MEDIUM_RISK | +2 | `you are now a`, `act as if`, `pretend to be` |
| STRUCTURAL | +2 | `<system>`, `[INST]`, markdown başlık olarak enjeksiyon |
| LOW_RISK | +1 | `malware`, `SQL injection`, `XSS` |

**Karar Mantığı:**
- Skor **≥ 8** → Workflow engellenir, `nextAgent: "END"`, `SecurityEvent` (CRITICAL) kaydedilir
- Skor **3–7** → Metin sanitize edilir, devam eder, `SecurityEvent` (HIGH/MEDIUM) kaydedilir
- Skor **< 3** → Temiz, orchestrator'a geçilir

**Limitler:** Max 3000 karakter / 500 kelime. Aşımda uyarı loglanır ama engellenmez.

**Input:** `task`, `humanFeedback`
**Output:** `{ task (sanitized), humanFeedback (sanitized), threatScore, blockedReason, nextAgent? }`

---

### 2. 🧠 Orchestrator
**Dosya:** `server/src/agents/orchestrator.js` | **Node:** `orchestrator`
**Signature:** `orchestratorNode(state, config)` | **LLM:** Structured output (routingSchema)

Hub-and-spoke mimarisinin merkezi. Her agent bittikten sonra buraya döner.

**Deterministik Frenler — LLM'den önce çalışır (sıfır maliyet):**

| FREN | Koşul | Sonuç |
|------|-------|-------|
| **S** | `HOT_LEAD_FOLLOWUP` / `SALES_NEGOTIATION` görevi | `salesRep` (max 3 tur) |
| **A** | `INVOICE_PROCESSING` / `FATURA_DENETIM` görevi | `auditor` → `fileSaver` |
| **B** | `STOCK_CHECK` / `SUPPLY_ALERT` görevi | `supplyChain` → `fileSaver` |
| **R** | `RFP_RESPONSE` / `TENDER_RESPONSE` görevi | `writer` (scraper atlanır) |
| **C** | `COLD_OUTREACH` / `B2B_OUTREACH` görevi | `scraper` → `writer` |
| **T** | `BUSINESS_STRESS_TEST` görevi | `analyzer` (scraper atlanır) |
| **0** | Plan guardrail — yetkisiz ajan talebi | Plan yükseltme mesajı + `fileSaver` |
| **1** | `isPublished === true` | `END` |
| **2** | `fileSaved === true && humanApproval === null` | `human_approval` |
| **3** | `revisionCount >= 5` | `human_approval` (döngü kırıcı) |
| **4a** | Research/StressTest + analiz var + innovator yok | `innovator` |
| **4b** | Research/StressTest + analiz + innovator var | `writer` |
| **5** | Research track + scraping var + analiz yok | `analyzer` |
| **6** | `finalContent` var + `revisionCount >= 3` | `fileSaver` |

**nextAgent Enum:** `scraper | analyzer | innovator | writer | critic | fileSaver | human_approval | publisher | architect | salesRep | auditor | supplyChain | END`

**Dynamic Skills:** `getEnabledTools(tenantConfig)` ile tenant'a özel araçlar bağlanır.

**Input:** Tüm state | **Output:** `{ nextAgent }`

---

### 3. 🔍 Scraper Agent
**Dosya:** `server/src/agents/scraperAgent.js` | **Node:** `scraper`
**Signature:** `scraperNode(state)` | **LLM:** Structured output (searchQuery üretimi)

İki adımlı web araştırması:
1. LLM ile `state.task`'ten optimal Tavily arama sorgusu üretir
2. Tavily API'ye native `fetch` ile bağlanır (max 3 kaynak, `search_depth: "basic"`)
3. Her kaynak web içeriğini sanitize eder (HTML + injection filtreleme)

**MOAT Layer 1b — Web İçeriği Sanitizasyonu:**
- HTML tag'ler, `<script>`, `<style>` temizlenir
- Prompt injection kalıpları `[FİLTRELENDİ]` ile maskelenir
- Kaynak başına max: **2000 karakter** | Toplam max: **8000 karakter**
- URL doğrulaması: sadece `http://` veya `https://` kabul edilir

**Input:** `task` | **Output:** `{ scrapedData }`

---

### 4. 🧠 Analyzer Agent
**Dosya:** `server/src/agents/analyzerAgent.js` | **Node:** `analyzer`
**Signature:** `analyzerNode(state, config)` | **Custom Prompt:** ✅

`scrapedData`'yı okuyup stratejik 3 aksiyonlu analiz raporu üretir.

**Prompt Hiyerarşisi:** `getPrompt("ANALYZER", clientId)` → `DEFAULT_PROMPTS.ANALYZER`

**Input:** `scrapedData` | **Output:** `{ analysisReport }`

---

### 5. 💡 Innovator Agent ("The Visionary")
**Dosya:** `server/src/agents/innovatorAgent.js` | **Node:** `innovator`
**Signature:** `innovatorNode(state)`

Analyzer'ın 3 "makul" aksiyonunu reddeder ve herkesin gözden kaçırdığı riskli ama yüksek getirili **4. yolu** üretir (Devil's Advocate).

Çıktı: Almanca, max 4 paragraf, "10x-Wette" ile biter. Writer bunu `## Visionäre Alternative` başlığıyla rapora entegre eder.

**Input:** `task`, `analysisReport` | **Output:** `{ innovatorInsight }`

---

### 6. ✍️ Writer Agent
**Dosya:** `server/src/agents/writerAgent.js` | **Node:** `writer`
**Signature:** `writerNode(state, config)` | **Custom Prompt:** ✅ | **Feedback Loop:** ✅

**3 Çalışma Modu:**

**Mod 1 — Revizyon** (`state.humanFeedback` veya `state.criticFeedback` varsa):
Önceki içeriği geri bildirime göre düzeltir. Social media ve normal içerik için ayrı revizyon promptları kullanılır.

**Mod 2 — Social Media** (`TWITTER` veya `LINKEDIN` keyword):
- Twitter-only: 5–7 tweet thread (her biri max 280 karakter, `---` ile ayrılmış)
- LinkedIn-only: Hook + 150–250 kelime ana gövde + hashtag
- Her ikisi: İkisi de aynı anda üretilir

**Mod 3 — Ana B2B Raporu** (varsayılan):
`analysisReport` + `innovatorInsight` kullanır. Bölümler: Management Summary, IST-Analyse, SOLL-Konzept, Architektur & Roadmap, Business Value/ROI, Visionäre Alternative. Son satırda `CONFIDENCE_SCORE:XX` üretir.

**Feedback Injection (KRITISCHE LERNREGEL):**
Son 3 negatif `Feedback` kaydı şu formatta tüm prompt dallarının başına eklenir:
```
⚠️ KRITISCHE LERNREGEL — Benutzer hat frühere Fehler korrigiert:
1. "..."
2. "..."
Bitte beachte diese Regeln unbedingt.
---
[asıl prompt]
```

**Prompt Hiyerarşisi:** `getPrompt("WRITER", clientId)` → `tenantConfig.agentPersona` → hardcoded default

**Güven Skoru:** Temel 50 + veri bolluğu (+20) + net öneriler (+15) + veri eksiksizliği (+15)

**Output:** `{ finalContent, confidenceScore, criticFeedback: null, humanFeedback: null, isApproved: false, fileSaved: false, humanApproval: null, revisionCount }`

---

### 7. 🧐 Critic Agent
**Dosya:** `server/src/agents/criticAgent.js` | **Node:** `critic`
**Signature:** `criticNode(state, config)` | **Custom Prompt:** ✅ | **LLM:** Structured output

`finalContent`'i QA perspektifinden denetler. Onaylarsa döngü biter; reddederse gerekçeyle writer'a geri döner.

**Structured Output:** `{ isApproved: boolean, criticFeedback: string }`

**Döngü Sınırı:** Orchestrator `revisionCount >= 3`'te zorla `fileSaver`'a, `revisionCount >= 5`'te `human_approval`'a yönlendirir.

**Input:** `finalContent` | **Output:** `{ isApproved, criticFeedback }`

---

### 8. 👨‍🏫 Architect Agent (CTO)
**Dosya:** `server/src/agents/architectAgent.js` | **Node:** `architect`
**Signature:** `architectNode(state, config)` | **LLM:** Structured output (blueprintSchema)

Yazılım projeleri ve INNOVATION_RADAR görevleri için kullanılır. Kod yazmaz — AI coding araçlarının okuyup uygulayacağı **Master Prompt & Mimari Blueprint** üretir.

**Blueprint Bölümleri:** System Prompt & AI Persona, Project Overview & Core Logic, Tech Stack & Required AI Skills, Folder Structure, Execution Workflow (adım adım), Strict Coding & Audit Guidelines.

**Dosya Kaydı:** `server/output/<projectName>_blueprint.md` olarak diske yazılır.

Writer/Critic/fileAgent atlanır — `fileSaved: true` doğrudan döner.

**Input:** `task`, `scrapedData` (INNOVATION_RADAR için) | **Output:** `{ finalContent, fileSaved: true }`

---

### 9. 💾 File Agent
**Dosya:** `server/src/agents/fileAgent.js` | **Node:** `fileSaver`
**Signature:** `fileNode(state, config)` | **LLM:** ❌ Yok

`finalContent`'i MongoDB `Report` koleksiyonuna upsert eder. `threadId` birincil anahtar.

**Kritik:** `threadId` için `config?.configurable?.thread_id` kullanır (state.threadId değil). `clientId` da config'den gelir.

**Input:** `finalContent`, `task`, `confidenceScore` | **Output:** `{ fileSaved: true/false }`

---

### 10. 🛑 Human Approval (HITL Gate)
**Node:** `human_approval` | **LLM:** ❌ Yok — sadece interrupt noktası

Graph burada durur (`interruptBefore: ["human_approval"]`). Kullanıcı:
- **AUTHORIZE** → `POST /api/approve` → `runPublishWorkflow`
- **OVERRIDE** → `POST /api/approve` → `runRevisionWorkflow`
- **👍/👎** → `POST /api/feedback` → `Feedback` koleksiyonuna kaydedilir

---

### 11. 🚀 Publisher Agent
**Dosya:** `server/src/agents/publisherAgent.js` | **Node:** `publisher`
**Signature:** `publisherNode(state, config)` | **LLM:** ❌ Yok | **MOAT:** Layer 4

Onaylanan içeriği dağıtım kanallarına iletir. Doğrudan API çağrısı YAPMAZ — her eylem `ActionQueue`'ya yazılır, `actionWorkerService.js` işler.

| actionType | Payload |
|-----------|---------|
| `WEBHOOK_N8N` | `{ threadId, task, content, humanFeedback, fileSaved }` |
| `TELEGRAM` | Rapor önizlemesi (ilk 300 karakter) |
| `DISCORD` | Görev başlığı + durum embed |

Per-tenant URL: `actionWorkerService`, `TenantConfig.integrations`'dan okur; yoksa global `.env`.

**Input:** `finalContent`, `task`, `humanFeedback`, `threadId` | **Output:** `{ isPublished: true }`

---

## Standalone Ajanlar (LangGraph Dışı)

---

### 12. 📣 CMO Agent
**Dosya:** `server/src/agents/cmoAgent.js`
**Tetikleyici:** `runCMOWorkflow` (runner.js) — publisher bittikten sonra arka planda

Publisher onayından sonra raporu 4 parçalı pazarlama kampanyasına dönüştürür:
1. **LinkedIn Post** — 150–200 kelime, B2B, CTO/Architect hedefi
2. **Twitter/X Thread** — 3 tweet: hook + insight + CTA + hashtag
3. **Google/Meta Ad Copy** — Headline (30 char), Description (90 char), Primary Text (125 char), hedef kitle, bütçe
4. **Campaign Summary** — 2–3 cümle değer önermesi

Çıktı `CampaignDraft` koleksiyonuna kaydedilir. Onaylanınca Telegram + Discord'a iletilir.

```js
generateCampaign(reportContent, task, threadId, clientId) → string (Markdown)
publishCampaign(campaign) → boolean
```

---

### 13. 🤖 Customer Bot Agent
**Dosya:** `server/src/agents/customerBotAgent.js`
**Tetikleyici:** `POST /api/inbox` | **LLM:** Structured output (leadSchema)

Gelen müşteri mesajlarını 5 kategoriye ayırır, RAG ile bilgi tabanını sorgular, otomatik taslak yanıt üretir.

| Kategori | Eylem |
|---------|-------|
| `SPAM` | Pas geç |
| `HOT_LEAD` | `orchestratorTask` üret → `runHotLeadWorkflow` tetikle |
| `SUPPORT_PRICING` | RAG sorgula → Almanca fiyat teklifi taslağı |
| `SUPPORT_BUG` | Empati yanıtı → geliştirici ekibine yönlendirme mesajı |
| `OTHER` | Pas geç |

**RAG:** `searchKnowledge(tenantId, message)` ile `Knowledge` koleksiyonunu sorgular; bulunan bağlam prompte eklenir.

```js
processIncomingMessage(customerMessage, clientId, tenantConfig)
→ { category, isHotLead, analysis, orchestratorTask, draftResponse, ragSources }
```

---

### 14. 🐦 Twitter Content Agent
**Dosya:** `server/src/agents/twitterContentAgent.js`
**Tetikleyici:** `cronService.js` — günlük `TWITTER_POST_HOUR` saatinde

`TWITTER_AUTO_TOPICS` env değişkeninden konuları okur, Tavily'den güncel veri çeker, insan sesiyle tweet üretir, `ScheduledPost` olarak zamanlar (09:00 / 12:00 / 15:00 / 18:00 / 21:00).

**Env Konfigürasyonu:**
| Değişken | Varsayılan | Açıklama |
|---------|-----------|---------|
| `TWITTER_PERSONA` | Teknoloji meraklısı, girişimci | Kim olduğun |
| `TWITTER_VOICE` | Samimi, düşündürücü, provokatif | Ses tonu |
| `TWITTER_LANG` | `tr` | `tr / de / en / mixed` |
| `TWITTER_HASHTAGS` | `1` | Tweet başına max hashtag |
| `TWITTER_AUTO_TOPICS` | — | Virgülle ayrılmış konu listesi |
| `TWITTER_POST_HOUR` | `7` | Günlük üretim saati |
| `TWITTER_TWEETS_PER_TOPIC` | `3` | Konu başına tweet sayısı |

```js
generateAndScheduleTweets(topic, count) → string[] (ScheduledPost id'leri)
runDailyTwitterScheduler()              → void
```

---

## n8n Entegrasyonu

### Veri Akışı
```
Platform (Gmail/YouTube/Slack/Instagram/Twitter/TikTok)
    → n8n (veri toplar, temizler)
    → POST /api/inbox (customerBotAgent)
    → AI Agents (sınıflandırma + yanıt üretimi)
    → Onay gerekirse: Cyber-Nexus UI → HITL
    → Onay sonrası: ActionQueue → actionWorkerService
    → n8n webhook → platforma yanıt
```

### Mevcut n8n Workflow'ları

| Workflow | ID | Durum | Açıklama |
|---|---|---|---|
| 📧 Email AI Sınıflandırıcı | PHpZSDhLt5ySqnI7 | 🟢 Aktif | 6 kategori, GPT-4o-mini |
| 🎬 YouTube Yorum Dinleyici | yt1 | ⏸ Pasif | Her 5 dk polling |
| 📩 Gmail Dinleyici | gm1 | ⏸ Pasif | Her dk, okunmamış |
| 💬 Slack Dinleyici | sl1 | ⏸ Pasif | Real-time |
| 📱 Instagram DM+Yorum | ig1 | ⏸ Pasif | Meta Webhook |
| 🐦 Twitter/X Mention | tw1 | ⏸ Pasif | Her 2 dk |
| 🎵 TikTok Yorum | tk1 | ⏸ Pasif | Her 10 dk |

### `POST /api/inbox` — n8n'den Beyin'e
```json
{
  "source": "gmail|youtube|slack|instagram|twitter|tiktok",
  "type": "email|comment|dm|mention|message",
  "category": "ACIL_DESTEK|TEKLIF_TALEBI|...",
  "platform_id": "platform_specific_id",
  "author": "Gönderen adı",
  "content": "Mesaj içeriği",
  "received_at": "ISO 8601",
  "ai_summary": "GPT özeti",
  "priority": "critical|high|medium|low"
}
```

### n8n Webhook URL'leri (Beyin → Platforma)
| Platform | Path |
|---|---|
| YouTube | `POST /webhook/youtube-reply` |
| Slack | `POST /webhook/slack-reply` |
| Instagram | `POST /webhook/instagram-reply` |
| Twitter/X | `POST /webhook/twitter-reply` |
| Gmail | n8n Gmail node'u |

### Email Kategorileri (Destek SLA)
| Kategori | SLA | Öncelik |
|---------|-----|---------|
| 🔴 ACIL_DESTEK | 1 saat | critical |
| 💰 TEKLIF_TALEBI | 24 saat | high |
| 📋 IHTIYAC_ANALIZI | 48 saat | medium |
| 💲 FIYAT_SORUSTURMASI | 24 saat | medium |
| 😤 SIKAYET_IADE | 4 saat | high |
| ℹ️ GENEL_BILGI | 72 saat | low |

### n8n Geliştirme Kuralları
1. Her zaman önce `search_templates()` ile başla
2. `validate_workflow()` çalıştırmadan deploy etme
3. n8n sadece veri taşır — iş mantığı Node.js Beyin'de kalır
4. `platform_id` ile idempotency sağla — aynı mesaj iki kez işlenmemeli
5. Webhook güvenliği: `X-Webhook-Secret` header kontrolü

---

## Agent Geliştirme Kuralları

1. **Config parametresi zorunlu:** `clientId` veya `tenantConfig` kullanan her node `(state, config)` imzasını kullanmalıdır. Eksik `config` → `ReferenceError` at runtime.
2. **State dışına yazma yasak:** Node'lar sadece state return eder. Doğrudan API çağrısı yapmamalıdır (publisher hariç → ActionQueue'ya yazar).
3. **LLM maliyeti kaydet:** Her LLM çağrısından sonra `trackLLMCost()` veya `trackLLMCostFromStrings()` çağrılmalıdır.
4. **Hata toleransı:** `try/catch` ile sarılmış olmalı; hata durumunda state'e `null` veya anlamlı varsayılan değer dönülmelidir.
5. **Tek sorumluluk:** Her ajan tek iş yapar. Scraper scrape eder, Analyzer analiz eder, Writer yazar.
6. **Custom Prompt Desteği (ANALYZER, CRITIC, WRITER):**
   ```js
   const customPrompt = await getPrompt("ANALYZER", clientId);
   const systemInstruction = customPrompt || DEFAULT_PROMPTS.ANALYZER;
   ```
7. **Döngü koruması:** Yeni bir Writer↔Critic benzeri döngü eklendiğinde mutlaka `revisionCount` sayacı ve orchestrator fren kuralı tanımlanmalıdır.

---

## 🛡️ God Mode Admin Panel

`/api/admin/*` altındaki tüm endpoint'ler `requireAdmin` middleware ile korunur. Sadece `Client.isAdmin === true` olan hesaplar erişebilir.

### Admin Hesabı Oluşturma
```bash
cd server && node scripts/create-admin.js
# E-posta: admin@agentmatrix.io  Şifre: Admin1234!
# Sonra frontend'de login → sidebar'da kırmızı GOD MODE butonu
```

### 6 Panel Mimarisi

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GOD MODE — Admin Layout                         │
│                                                                     │
│  [Fleet Radar 280px] │  [Operating Room / Ghost Viewer flex-1]  │  │
│  Tenant listesi      │  Center: OperatingRoom (Zaman Makinesi)  │  │
│  Live agent badge    │       veya GhostViewer (seçili tenant)   │  │
│  Plan/ürün bilgisi   │                                           │  │
│  Suspend/unsuspend   ├──────────────────────────────────────────┤  │
│                      │                                           │  │
│                      │         [SOC Panel 350px]                 │  │
│                      │   Global olaylar, IP yasaklama, loglar   │  │
│──────────────────────┴──────────────────────────────────────────┘  │
│              [FinOps Panel h-56 — tam genişlik alt bar]             │
│   Burn rate sparkline  │  P&L tablosu  │  ⚡THROTTLE butonları     │
└─────────────────────────────────────────────────────────────────────┘
```

### Panel 1 — Fleet Radar
**Endpoint:** `GET /api/admin/tenants`
- Tüm tenant'ları plan, ürün, durum, bu ayki workflow sayısı ile listeler
- Global SSE (`GET /api/admin/events/global`) ile canlı `liveStatus` + `lastAgent` güncellenir
- Tenant'a tıklanınca → `selectedTenantSlug` set edilir → merkez panel Ghost Mode'a geçer
- Admin olmayan tenant'lar için **Suspend** / **Unsuspend** işlemi

### Panel 2 — Ghost Mode (Ghost Viewer)
**Endpoint:** `GET /api/admin/tenants/:slug/live` (SSE)
- Seçili tenant'ın gerçek zamanlı SSE akışına "sızdırma" modunda bağlanır
- Tenant'ın agent aktivasyonlarını, workflow aşamalarını admin'e aynen gösterir
- Disconnect → `selectedTenantSlug: null` → merkez panel Operating Room'a döner

### Panel 3 — SOC Panel (Security Operations Center)
**Endpoints:** `GET /api/admin/security`, `GET /api/admin/logs`, `POST /api/admin/ips/ban`, `DELETE /api/admin/ips/:ip`
- `SecurityEvent` kayıtlarını severity'ye göre listeler (CRITICAL/HIGH/MEDIUM/LOW)
- Global event stream'i canlı dinler — yeni tehdit olayları anlık görünür
- IP banlama: `BannedIP` MongoDB modelinden okunur, in-memory `bannedIPCache` (Map) üzerinden express middleware'de kontrol edilir
- **Circular dependency çözümü:** `bannedIPCacheService.js` bağımsız modül olarak export eder

### Panel 4 — FinOps (Finansal Operasyonlar)
**Endpoints:** `GET /api/admin/finance`, `GET /api/admin/finance/live` (SSE), `POST /api/admin/tenants/:slug/throttle`
- **Burn Rate Chart:** Pure SVG sparkline (280×48) — cost/call (turuncu) + kümülatif (kırmızı) iki çizgi, gradient alan, canlı nokta
- **Canlı SSE:** `costEventBus` (bağımsız EventEmitter) → her LLM çağrısı sonrası `cost_tick` eventi → son 60 nokta tutulur
- **Throttle:** Kiracının `TenantConfig.configObject.throttled = true` yapılır; `critical`/`loss` margin satırlarında `⚡THROTTLE` butonu hover'da görünür
- **Circular dependency çözümü:** `costEventBus.js` bağımsız modül; `costTracker.js` → `costEventBus.js` → `adminController.js` zinciri

### Panel 5 — Zaman Makinesi (Time Machine)
**Endpoints:** `GET /api/admin/workflows/recent`, `GET /api/admin/workflows/:threadId/snapshots`
- **WorkflowSnapshot modeli:** Her LangGraph node'u sonrasında `{ threadId, step, nodeName, clientId, output (kırpılmış), keyState }` kaydedilir (fire-and-forget `.catch(() => {})`)
- **runner.js:** Her snapshot kaydından sonra `systemEventBus.emit("global", { type: "snapshot_saved", ... })` → global SSE ile admin'e anlık bildirim
- **Frontend debounce:** `timeMachineThreadId` eşleşen `snapshot_saved` eventi geldiğinde 700ms debounce ile `fetchWorkflowSnapshots` tetiklenir (spam önleme)
- **Operating Room:** Sol %35 — recent workflow listesi (LIVE badge'li aktif olanlar); Sağ %65 — seçili thread için TimeMachine
- **TimeMachine:** Sol 200px dikey adım timeline'ı; Sağ StateInspector (keyState pills + output key-value)
- TTL: 7 gün (MongoDB TTL index)

### Panel 6 — Entegrasyon & Polishing (Faz 6)
- Global SSE `snapshot_saved` eventi → `recentWorkflows` canlı güncelleme
- `connectFinanceSSE` + `connectGlobalSSE` → AdminLayout mount/unmount'ta açılır/kapanır
- 30 saniyede bir `fetchRecentWorkflows` + `fetchAdminTenants` + `fetchGlobalSecurity` + `fetchGlobalFinance` poll
- Merkez panel layout: `overflow-hidden` wrapper → GhostViewer `p-4 overflow-y-auto` sarmalı / OperatingRoom tam yükseklik

### Admin SSE Event Tipleri

| type | Kaynak | Açıklama |
|------|--------|----------|
| `agent_active` | `emitToThread → systemEventBus` | Ajan aktifleşti (tüm tenant'lar) |
| `workflow_complete` | `emitToThread → systemEventBus` | Workflow bitti / HITL bekleniyor |
| `error` | `emitToThread → systemEventBus` | Workflow hatası |
| `snapshot_saved` | `runner.js` doğrudan | LangGraph node snapshot'ı kaydedildi |
| `cost_tick` | `costEventBus` | LLM token ücreti → FinOps SSE |
| `connected` / `heartbeat` | `adminController` | SSE bağlantı sağlığı (filtre edilir) |

### Admin Middleware Katmanı
```
POST /api/admin/*
    → tenant.js (API key doğrulama → req.clientId)
    → requireAdmin (isAdmin === true kontrolü)
    → controller
```
