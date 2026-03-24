# ADMIN PANEL — GOD MODE / Küresel Komuta Merkezi

> **Proje:** AI Orchestra (Agent-Matrix) & Cyber-Nexus UI
> **Tarih:** 2026-03-24
> **Versiyon:** v1.0 — İlk Mimari Plan

---

## İçindekiler

1. [Mevcut Durum Analizi](#1-mevcut-durum-analizi)
2. [Panel 1 — Global Fleet Radar](#2--panel-1-global-fleet-radar-küresel-filo-radarı)
3. [Panel 2 — SOC Siber Savunma](#3--panel-2-soc-siber-savunma-merkezi)
4. [Panel 3 — Ameliyathane & Zaman Makinesi](#4--panel-3-ameliyathane--zaman-makinesi)
5. [Panel 4 — FinOps & Token Burn Rate](#5--panel-4-finops--token-burn-rate)
6. [Yatay Kesişen Gereksinimler](#6-yatay-kesişen-gereksinimler)
7. [Uygulama Fazları](#7-uygulama-fazları)

---

## 1. Mevcut Durum Analizi

### Kullanılabilir Altyapı

| Katman | Mevcut | Eksik |
|--------|--------|-------|
| **Tenant sistemi** | `Client.js` model, `tenant.js` middleware, API key auth | `isAdmin` rolü yok, cross-tenant sorgulama yok |
| **Güvenlik** | `SecurityEvent` model (7 gün TTL), `guardrailNode`, rate limiter | Kill switch yok, IP ban mekanizması yok, admin SOC paneli yok |
| **Finans** | `Transaction` model, `costTracker.js`, Stripe webhook | Canlı burn rate yok, plan bazlı kâr/zarar analizi yok |
| **SSE** | `agentEventBus` per-thread EventEmitter, buffering | Sistem geneli event bus yok — her şey `threadId`'ye bağlı |
| **LangGraph State** | `MemorySaver` (in-memory), Zod state schema | MongoDB checkpointer yok → server restart = tüm state kayıp |
| **Frontend** | 9 view (`activeView` ile switch), Zustand 5 slice, Vantablack tema | Admin view yok, cross-tenant dashboard yok |

### Kritik Mimari Engeller

1. **MemorySaver in-memory** — Workflow replay ("Zaman Makinesi") için MongoDB checkpointer şart
2. **SSE per-thread** — Global Fleet Radar için `systemEventBus` (tüm tenant'ları izleyen) lazım
3. **Tüm endpoint'ler `req.clientId` filtreli** — Admin endpoint'leri bu filtreyi bypass etmeli
4. **Rol sistemi yok** — Client model'e `isAdmin` + admin middleware eklenmeli

---

## 2. 🛰️ Panel 1: Global Fleet Radar (Küresel Filo Radarı)

> Sol Panel — 20 müşterinin (Tenant) tamamını canlı izleme

### Konsept

Burada tüm tenant'lar alt alta listelenir. Her birinin yanında yanıp sönen durum ışıkları vardır:

```
[🟢] Tenant_01 (Lojistik A.Ş): Ajan 14 (Tedarik) şu an stok hesaplıyor
[🟡] Tenant_07 (E-Ticaret): Claude API limitine yaklaşılıyor, sistem yavaşlatıldı
[🔴] Tenant_12 (Ajans): LangGraph State şemasında hata (Crash)!
[⚫] Tenant_03 (Danışmanlık): İdle — aktif workflow yok
```

Herhangi bir tenant'a tıklandığında "Ghost Mode" (Hayalet Modu) açılır — müşterinin haberi olmadan onun workspace'ini ve ajanlarının o an ne yazdığını canlı izlersin.

### Backend Gereksinimleri

#### Yeni Endpoint'ler

| Method | Route | Açıklama |
|--------|-------|----------|
| `GET` | `/api/admin/tenants` | Tüm tenant'lar + aktif workflow sayıları + plan bilgisi |
| `GET` | `/api/admin/tenants/:slug/live` | SSE — Tek tenant'ın canlı ajan akışı (Ghost Mode) |
| `GET` | `/api/admin/events/global` | SSE — Tüm tenant'ların birleşik event akışı |

#### Altyapı Değişiklikleri

**`runner.js` — systemEventBus eklenmesi:**

```javascript
// Mevcut: emitToThread(threadId, event)  →  sadece o thread'in SSE'sine gönderir
// Yeni:   Her emitToThread çağrısı aynı zamanda global bus'a da yayınlar

import { EventEmitter } from 'events';
export const systemEventBus = new EventEmitter();

export function emitToThread(threadId, event) {
  // ... mevcut thread-bazlı emit ...

  // Global admin event bus'a da yayınla
  systemEventBus.emit('global', {
    threadId,
    clientId: event.clientId,
    tenantSlug: event.tenantSlug,
    type: event.type,
    agent: event.agent,
    timestamp: Date.now()
  });
}
```

**Tenant durum ışığı hesaplama mantığı:**

| Durum | Koşul |
|-------|-------|
| 🟢 **ACTIVE** | En az 1 aktif workflow (SSE'den `agent_active` event gelmiş, `workflow_complete` gelmemiş) |
| 🟡 **WARNING** | Rate limit uyarısı (`rateLimiter` %80 doluluk) VEYA son 1 saatte `SecurityEvent` (severity: medium) |
| 🔴 **ERROR** | Son 5 dk'da `workflow_error` event VEYA `SecurityEvent` (severity: critical) |
| ⚫ **IDLE** | Aktif workflow yok, alarm yok |

### Frontend Bileşenleri

| Dosya | Sorumluluk |
|-------|-----------|
| `components/admin/fleet-radar.tsx` | Canlı tenant listesi + durum ışıkları (neon animasyonlu) |
| `components/admin/ghost-viewer.tsx` | Seçili tenant'ın workspace'ine Ghost Mode giriş — read-only ajan izleme |

### UI Tasarım Notları

- Tenant listesi sol panel olarak sabit durur (sidebar genişliğinde, ~280px)
- Her tenant satırı: `[durum ışığı] [firma adı] [plan badge] [aktif ajan sayısı]`
- Durum ışıkları `framer-motion` ile pulse animasyonu (🟢 yavaş, 🟡 hızlı, 🔴 çok hızlı)
- Ghost Mode açıldığında orta panelde tenant'ın OperatingTable'ı read-only olarak render edilir
- Arka plan: `bg-black` + hafif yeşil grid overlay (radar hissi)

---

## 3. 🛡️ Panel 2: SOC Siber Savunma Merkezi

> Sağ Üst Panel — Dijital kalkan, tehdit izleme ve müdahale

### Konsept

Sistemin beyni internete n8n webhook'ları ile bağlıdır. Bu panel; DDoS, prompt injection, ve API abuse gibi saldırıları canlı izler ve müdahale imkânı verir.

**Tehdit türleri:**
- **DDoS / Spam**: Saniyede binlerce istek → LLM faturasını patlatma girişimi
- **Prompt Injection**: Görünmez talimatlar → Guardrail node'un tespit ettiği zehirleme denemeleri
- **API Abuse**: Geçersiz API key'ler, rate limit aşımları
- **Data Exfiltration**: Anormal büyüklükte response denemeleri

### Backend Gereksinimleri

#### Yeni Endpoint'ler

| Method | Route | Açıklama |
|--------|-------|----------|
| `GET` | `/api/admin/security/global` | Cross-tenant tehdit özeti (son 24 saat) |
| `POST` | `/api/admin/tenants/:slug/halt` | **Kill Switch** — Tenant'ı askıya al |
| `POST` | `/api/admin/tenants/:slug/resume` | Tenant'ı yeniden aktifle |
| `POST` | `/api/admin/security/ban-ip` | IP'yi blacklist'e ekle |
| `DELETE` | `/api/admin/security/ban-ip/:ip` | IP'yi blacklist'ten çıkar |
| `GET` | `/api/admin/security/banned-ips` | Banlı IP listesi |
| `GET` | `/api/admin/security/live` | SSE — Canlı tehdit akışı (global) |

#### Model Değişiklikleri

**`Client.js` — status alanı eklenmesi:**

```javascript
// Mevcut alanlar: name, slug, apiKey, plan, product, email, passwordHash
// Eklenecek:
status: {
  type: String,
  enum: ['active', 'suspended', 'deleted'],
  default: 'active'
},
suspendedAt: Date,
suspendedBy: String,  // admin clientId
suspendReason: String
```

**Yeni model — `BannedIP.js`:**

```javascript
{
  ip: { type: String, required: true, unique: true },
  reason: String,
  bannedBy: String,        // admin clientId
  source: String,          // 'manual' | 'auto' (guardrail)
  matchCount: { type: Number, default: 0 },  // kaç kez bu IP engellendi
  expiresAt: Date,         // null = kalıcı ban
  createdAt: Date
}
```

#### Kill Switch Mekanizması (Detaylı Akış)

```
Admin [HALT TENANT] butonuna basar
         │
         ▼
POST /api/admin/tenants/:slug/halt
         │
         ├── 1. Client.status = "suspended"
         ├── 2. Client.suspendedAt = Date.now()
         ├── 3. Client.suspendReason = req.body.reason
         ├── 4. TenantConfig.integrations → webhook URL'ler _backup'a kopyalanıp null'lanır
         ├── 5. Devam eden workflow'lar → runner.js'de graceful shutdown
         ├── 6. AdminLog kaydı oluşturulur
         └── 7. systemEventBus.emit('tenant_halted', { slug, reason })

         ▼
tenant.js middleware (sonraki isteklerde):
  if (client.status !== 'active') → 403 { error: 'TENANT_SUSPENDED', reason }
```

**Auto-Ban Kuralları (Guardrail entegrasyonu):**

```javascript
// guardrailAgent.js'e eklenecek otomatik ban mantığı:
const AUTO_BAN_RULES = [
  { pattern: /ignore previous instructions/i, action: 'ban_ip', duration: '24h' },
  { pattern: /ignore all prior/i,            action: 'ban_ip', duration: '24h' },
  { pattern: /system prompt/i,               action: 'log_only' },
  // 5 dk'da 50+ tehdit → IP otomatik banla
  { type: 'rate_threshold', window: '5m', max: 50, action: 'ban_ip', duration: '1h' }
];
```

#### Middleware Değişiklikleri

**`tenant.js`:**
```javascript
// Mevcut: API key → Client lookup → req.clientId
// Eklenecek: status kontrolü
if (client.status === 'suspended') {
  return res.status(403).json({
    error: 'TENANT_SUSPENDED',
    reason: client.suspendReason,
    suspendedAt: client.suspendedAt
  });
}
```

**`rateLimiter.js`:**
```javascript
// Mevcut: IP/clientId bazlı rate limit
// Eklenecek: BannedIP kontrolü (her istekte)
const banned = await BannedIP.findOne({ ip: req.ip, expiresAt: { $gt: new Date() } });
if (banned) {
  banned.matchCount += 1;
  await banned.save();
  return res.status(403).json({ error: 'IP_BANNED', reason: banned.reason });
}
```

### Frontend Bileşenleri

| Dosya | Sorumluluk |
|-------|-----------|
| `components/admin/soc-panel.tsx` | Canlı tehdit haritası + alarm feed (son 50 event) |
| `components/admin/kill-switch.tsx` | Devasa kırmızı HALT butonu + onay modalı (glassmorphism) |
| `components/admin/ip-manager.tsx` | Banlı IP listesi + manuel ekleme/çıkarma |

### UI Tasarım Notları

- Panel arka planı: koyu kırmızı/siyah gradient — tehlike hissi
- Tehdit event'leri: Matrix-tarzı yukarıdan aşağı akan log satırları
- Her event satırı: `[timestamp] [severity badge] [tenant] [event type] [detay]`
- Severity renkleri: `LOW → cyan`, `MEDIUM → amber`, `HIGH → turuncu`, `CRITICAL → kırmızı pulse`
- Kill Switch butonu: büyük, yuvarlak, kırmızı, `hover:scale-110` + `animate-pulse` — "Nükleer buton" hissi
- Onay modalı: `backdrop-blur-xl` + "Bu işlem [Firma X]'in TÜM operasyonlarını durduracak. Emin misiniz?" uyarısı
- IP ban listesi: tablo formatı, her satırda `[IP] [neden] [ban tarihi] [kalan süre] [🗑️ kaldır]`

---

## 4. 🔬 Panel 3: Ameliyathane & Zaman Makinesi

> Orta Panel — Workflow debug, state inspection ve replay

### Konsept

Bir müşteri "Writer ajanı saçmaladı" diye ticket açtığında, admin threadId'yi girer ve o workflow'un adım adım kaydını bir "video oynatıcı" gibi geri sarar:

```
Adım 1: [Scraper]     → PDF'in 3. sayfası bozuk, parse edilemedi
Adım 2: [Analyzer]    → Eksik veriyle analiz üretildi (düşük confidence: 23%)
Adım 3: [Writer]      → Eksik analizle alakasız rapor yazdı
Adım 4: [Critic]      → "Rapor yetersiz" dedi, revision istedi
Adım 5: [Writer v2]   → Hâlâ aynı bozuk veriden besleniyor → saçmalık devam
```

**Sonuç:** Hata senin kodunda değil, müşterinin PDF'i bozuk. 2 dakikada teşhis konur.

### Backend Gereksinimleri

#### Kritik Altyapı — MongoDB Checkpointer

Mevcut `MemorySaver` (in-memory) yerine persistent MongoDB checkpointer yazılacak.

**Yeni model — `WorkflowCheckpoint.js`:**

```javascript
{
  threadId:      { type: String, required: true, index: true },
  clientId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  stepNumber:    { type: Number, required: true },
  nodeName:      { type: String, required: true },  // 'scraper', 'analyzer', 'writer', etc.

  // State snapshot — o adımdaki tam LangGraph state
  stateSnapshot: {
    task:             String,
    nextAgent:        String,
    scrapedData:      String,
    analysisReport:   String,
    innovatorInsight: String,
    finalContent:     String,
    criticFeedback:   String,
    revisionCount:    Number,
    confidenceScore:  Number,
    threatScore:      Number,
    // ... diğer state alanları
  },

  // Node I/O
  inputSummary:  String,   // Node'a giren verinin özeti (ilk 500 char)
  outputSummary: String,   // Node'un ürettiğinin özeti (ilk 500 char)

  // Timing
  startedAt:     { type: Date, required: true },
  completedAt:   Date,
  durationMs:    Number,

  // Error tracking
  error:         String,   // null = başarılı, doluysa hata mesajı
  status:        { type: String, enum: ['running', 'success', 'error'], default: 'running' },

  createdAt:     { type: Date, default: Date.now }
}

// Compound index: threadId + stepNumber (unique)
// TTL index: 30 gün sonra otomatik temizlensin
```

**`graph.js` değişiklikleri:**

```javascript
// Mevcut:
const checkpointer = new MemorySaver();

// Yeni: Custom MongoCheckpointer (LangGraph BaseCheckpointSaver extend eder)
import { MongoCheckpointer } from '../services/mongoCheckpointer.js';
const checkpointer = new MongoCheckpointer();
```

**Yeni servis — `mongoCheckpointer.js`:**

LangGraph'ın `BaseCheckpointSaver` abstract class'ını extend eden custom checkpointer. Her `put()` çağrısında:
1. Yeni `WorkflowCheckpoint` dokümanı oluşturur
2. `stepNumber`'ı otomatik artırır
3. `stateSnapshot`'ı JSON olarak kaydeder
4. Mevcut `MemorySaver` davranışını da korur (in-memory cache + MongoDB persistence)

#### Yeni Endpoint'ler

| Method | Route | Açıklama |
|--------|-------|----------|
| `GET` | `/api/admin/workflows` | Cross-tenant workflow listesi (filter: clientId, status, date range) |
| `GET` | `/api/admin/workflows/:threadId/replay` | Adım adım checkpoint listesi (timeline verisi) |
| `GET` | `/api/admin/workflows/:threadId/state/:step` | Belirli adımdaki tam state snapshot |
| `POST` | `/api/admin/workflows/:threadId/retry` | Başarısız workflow'u son başarılı checkpoint'ten yeniden başlat |
| `GET` | `/api/admin/workflows/:threadId/diff/:step1/:step2` | İki adım arasındaki state farkı (JSON diff) |

### Frontend Bileşenleri

| Dosya | Sorumluluk |
|-------|-----------|
| `components/admin/operating-room.tsx` | Workflow arama + filtreleme tablosu |
| `components/admin/time-machine.tsx` | Replay player — yatay timeline + ileri/geri kontroller |
| `components/admin/state-inspector.tsx` | JSON state viewer (syntax highlighted, collapsible) |
| `components/admin/step-diff.tsx` | İki adım arası state diff görünümü (kırmızı/yeşil) |

### UI Tasarım Notları

**Timeline (Zaman Çizelgesi):**
```
──[🟢 Guardrail]──[🔵 Orchestrator]──[🟣 Scraper]──[🔵 Analyzer]──[🟡 Writer]──[🔴 ERROR]──
       0.2s              0.1s             3.4s           2.1s           4.7s          ✗
```

- Yatay timeline bar — her node bir daire/kare ile temsil edilir
- Node'un süresi dairenin genişliğiyle orantılı
- Başarılı: neon yeşil border, hatalı: kırmızı pulse
- Herhangi bir node'a tıkla → altında state inspector açılır
- İleri/geri oklar + "Play All" butonu (otomatik adım adım geçiş, 2sn aralıkla)
- State inspector: sol tarafta JSON ağacı (collapsible), sağ tarafta "önceki adımla diff"
- Arka plan: koyu lacivert + cyan grid çizgileri — "ameliyathane" hissi

---

## 5. 💸 Panel 4: FinOps & Token Burn Rate

> Alt Panel — Canlı maliyet radarı, borsa ticker tarzı

### Konsept

Neon yeşili bir borsa ekranı (Ticker) akar. Her tenant'ın anlık token yakımı, aylık P&L'i ve marj alarmları görünür.

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔥 LIVE BURN: $0.034/sec │ TODAY: $127.45 │ MTD: $2,847.22        │
├─────────────────────────────────────────────────────────────────────┤
│ TENANT          PLAN      REVENUE    EXPENSE    P&L      MARGIN    │
│ Lojistik A.Ş   pro       $299.00    $187.33    +$111    37.1% 🟢  │
│ E-Ticaret Ltd   enterprise $999.00   $823.44    +$175    17.5% 🟡  │
│ Ajans X         free      $99.00     $94.77     +$4.23    4.3% 🔴  │
│ Danışmanlık     holding   $3000.00   $445.12    +$2554   85.2% 🟢  │
└─────────────────────────────────────────────────────────────────────┘
```

### Backend Gereksinimleri

#### Yeni Endpoint'ler

| Method | Route | Açıklama |
|--------|-------|----------|
| `GET` | `/api/admin/finance/global` | Tüm sistem: toplam gelir, gider, net P&L, ajan bazlı dağılım |
| `GET` | `/api/admin/finance/burn-rate` | Son 1h / 24h / 7d burn rate ($ per second, per hour) |
| `GET` | `/api/admin/finance/per-tenant` | Tenant bazlı kâr/zarar tablosu (plan fiyatı vs LLM maliyeti) |
| `GET` | `/api/admin/finance/alerts` | Zarar riski olan tenant'lar (margin < %20) |
| `GET` | `/api/admin/finance/live` | SSE — Canlı token yakım akışı (her LLM çağrısında event) |
| `POST` | `/api/admin/tenants/:slug/throttle` | Tenant'ı ucuz modele geç / istekleri yavaşlat |

#### Kâr/Zarar Hesaplama Mantığı

```javascript
async function calculateTenantPnL(clientId, period = 'month') {
  const client = await Client.findById(clientId);
  const planPrices = { free: 99, pro: 299, enterprise: 999, holding: 3000 };

  const revenue = planPrices[client.plan];

  const expenses = await Transaction.aggregate([
    { $match: {
      clientId,
      type: 'EXPENSE',
      createdAt: { $gte: startOfMonth() }
    }},
    { $group: { _id: null, total: { $sum: '$amount' } }}
  ]);

  const expense = expenses[0]?.total || 0;
  const pnl = revenue - expense;
  const margin = revenue > 0 ? (pnl / revenue) * 100 : 0;

  return { clientId, plan: client.plan, revenue, expense, pnl, margin };
}
```

**Marj Alarm Eşikleri:**

| Marj | Seviye | Aksiyon |
|------|--------|---------|
| `> 50%` | 🟢 Sağlıklı | — |
| `20% – 50%` | 🟡 Dikkat | İzle |
| `5% – 20%` | 🟠 Tehlike | Admin'e push notification |
| `< 5%` | 🔴 Zarar sınırı | Otomatik throttle önerisi + admin alarmı |
| `< 0%` | ⛔ ZARAR | Admin'e acil bildirim + tenant dashboard'a uyarı |

#### costTracker.js Değişiklikleri

```javascript
// Mevcut: trackLLMCost → Transaction.create
// Eklenecek: systemEventBus'a maliyet event'i yayınlama

import { systemEventBus } from '../workflows/runner.js';

export async function trackLLMCost(inputTokens, outputTokens, agentName, threadId, clientId, modelName) {
  // ... mevcut Transaction.create mantığı ...

  // Admin canlı burn rate akışı için
  systemEventBus.emit('cost', {
    clientId,
    agentName,
    threadId,
    amount: totalCost,
    inputTokens,
    outputTokens,
    model: modelName,
    timestamp: Date.now()
  });
}
```

#### Throttle Mekanizması

```javascript
// POST /api/admin/tenants/:slug/throttle
// Body: { action: 'downgrade_model' | 'rate_limit' | 'pause_cron' }

// downgrade_model: TenantConfig'e modelOverride = 'claude-3-haiku' ekler
//   → Ajan çağrılarında tenantConfig.modelOverride varsa o model kullanılır
// rate_limit: O tenant'ın rate limit'ini yarıya düşürür
// pause_cron: O tenant'ın cron job'larını durdurur (cronService'de kontrol)
```

### Frontend Bileşenleri

| Dosya | Sorumluluk |
|-------|-----------|
| `components/admin/finops-panel.tsx` | Borsa ticker + P&L tablosu + canlı burn counter |
| `components/admin/burn-rate-chart.tsx` | Sparkline grafik — son 24 saatin dakika bazlı burn rate'i |
| `components/admin/margin-alerts.tsx` | Zarar riski olan tenant alarmları listesi + throttle aksiyonu |

### UI Tasarım Notları

- Üst bar: "Borsa ticker" — soldan sağa akan `$0.034/sec` gibi canlı rakamlar (neon yeşil, monospace font)
- Ana tablo: siyah arka plan, her satır bir tenant — P&L'e göre renk kodlu
- Margin sütunu: renk gradient (yeşil → sarı → kırmızı) + animasyonlu bar
- Alarm satırları: kırmızı arka plan pulse + "⚠️ ZARAR RİSKİ" badge
- Sparkline grafikler: her tenant'ın yanında minik 24h trend çizgisi (yukarı → yeşil, aşağı → kırmızı)
- Arka plan: `bg-black` + koyu yeşil radial gradient (finans terminali hissi)

---

## 6. Yatay Kesişen Gereksinimler

### 6.1 Admin Authentication & Authorization

#### Client.js Model Güncellemesi

```javascript
// Eklenecek alanlar:
isAdmin: { type: Boolean, default: false },
status: {
  type: String,
  enum: ['active', 'suspended', 'deleted'],
  default: 'active'
},
suspendedAt: Date,
suspendedBy: String,
suspendReason: String
```

#### Yeni Middleware — `admin.js`

```javascript
// server/src/middleware/admin.js
export function requireAdmin(req, res, next) {
  if (!req.tenant?.client?.isAdmin) {
    return res.status(403).json({ error: 'ADMIN_REQUIRED' });
  }
  next();
}
```

#### Kullanım

```javascript
// routes/adminRoutes.js
import { requireAdmin } from '../middleware/admin.js';

router.use(requireAdmin);  // Tüm /api/admin/* rotaları korunur
router.get('/tenants', adminController.listTenants);
router.post('/tenants/:slug/halt', adminController.haltTenant);
// ...
```

### 6.2 Admin Audit Log

#### Yeni Model — `AdminLog.js`

```javascript
{
  adminId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  action:     { type: String, required: true },
  // Örnekler: 'TENANT_HALTED', 'TENANT_RESUMED', 'IP_BANNED', 'IP_UNBANNED',
  //           'PLAN_CHANGED', 'TENANT_THROTTLED', 'WORKFLOW_RETRIED'
  target: {
    type:     String,  // 'tenant', 'ip', 'workflow'
    id:       String,  // slug, IP adresi veya threadId
  },
  details:    mongoose.Schema.Types.Mixed,  // Ek detaylar (JSON)
  createdAt:  { type: Date, default: Date.now }
}

// Index: (adminId, createdAt) — admin bazlı sorgulama
// TTL: 90 gün
```

### 6.3 Frontend Admin Layout

#### Yeni Ana Layout — `admin-layout.tsx`

```
┌──────────────────────────────────────────────────────────────────────┐
│                    GOD MODE — GLOBAL COMMAND CENTER                  │
├────────────┬──────────────────────────────────┬─────────────────────┤
│            │                                  │                     │
│  🛰️ Fleet  │     🔬 Operating Room            │   🛡️ SOC Panel     │
│   Radar    │        & Time Machine            │   (Siber Savunma)  │
│            │                                  │                     │
│  (Sol,     │     (Orta, flex-1)               │   (Sağ Üst,       │
│   280px)   │                                  │    350px)          │
│            │                                  │                     │
│            ├──────────────────────────────────┴─────────────────────┤
│            │                                                        │
│            │     💸 FinOps & Token Burn Rate                        │
│            │        (Alt Panel, h-64)                               │
│            │                                                        │
└────────────┴────────────────────────────────────────────────────────┘
```

#### Zustand Store Değişiklikleri

**Yeni slice — `adminSlice.ts`:**

```typescript
interface AdminSlice {
  // Fleet Radar
  tenants: TenantStatus[];
  selectedTenant: string | null;  // slug
  ghostMode: boolean;

  // SOC
  securityFeed: SecurityEvent[];
  bannedIPs: BannedIP[];

  // FinOps
  globalFinance: GlobalFinanceData | null;
  tenantPnL: TenantPnL[];
  burnRate: number;  // $/sec
  marginAlerts: MarginAlert[];

  // Time Machine
  selectedWorkflow: string | null;  // threadId
  workflowCheckpoints: WorkflowCheckpoint[];
  selectedStep: number | null;
  stepState: Record<string, unknown> | null;

  // Actions
  fetchTenants: () => Promise<void>;
  haltTenant: (slug: string, reason: string) => Promise<void>;
  resumeTenant: (slug: string) => Promise<void>;
  banIP: (ip: string, reason: string, duration?: string) => Promise<void>;
  unbanIP: (ip: string) => Promise<void>;
  fetchWorkflowReplay: (threadId: string) => Promise<void>;
  fetchStepState: (threadId: string, step: number) => Promise<void>;
  connectGlobalSSE: () => void;
  connectFinanceSSE: () => void;
}
```

**`page.tsx` değişikliği:**

```typescript
// activeView'a "admin" seçeneği eklenir
activeView === "admin" && <AdminLayout />
```

**`sidebar.tsx` değişikliği:**

```typescript
// isAdmin kontrolü ile "GOD MODE" butonu gösterilir
{clientIsAdmin && (
  <SidebarButton
    icon={<TerminalIcon />}
    label="GOD MODE"
    onClick={() => setActiveView('admin')}
    className="border border-red-500/50 text-red-400 hover:bg-red-500/10"
  />
)}
```

### 6.4 Dosya Yapısı Özeti

```
server/src/
├── middleware/
│   └── admin.js                          ← YENİ: Admin auth middleware
├── controllers/
│   └── adminController.js                ← YENİ: Tüm admin endpoint handler'ları
├── routes/
│   └── adminRoutes.js                    ← YENİ: /api/admin/* rotaları
├── models/
│   ├── Client.js                         ← GÜNCELLE: isAdmin, status alanları
│   ├── AdminLog.js                       ← YENİ: Admin audit log
│   ├── BannedIP.js                       ← YENİ: IP blacklist
│   └── WorkflowCheckpoint.js             ← YENİ: Workflow state geçmişi
├── services/
│   └── mongoCheckpointer.js              ← YENİ: LangGraph MongoDB checkpointer
└── workflows/
    └── runner.js                         ← GÜNCELLE: systemEventBus eklenmesi

frontend/src/
├── components/admin/
│   ├── admin-layout.tsx                  ← YENİ: 4 panelli God Mode layout
│   ├── fleet-radar.tsx                   ← YENİ: Canlı tenant izleme
│   ├── ghost-viewer.tsx                  ← YENİ: Tenant workspace Ghost Mode
│   ├── soc-panel.tsx                     ← YENİ: Siber savunma merkezi
│   ├── kill-switch.tsx                   ← YENİ: Tenant durdurma butonu + modal
│   ├── ip-manager.tsx                    ← YENİ: IP ban yönetimi
│   ├── operating-room.tsx                ← YENİ: Workflow arama/filtreleme
│   ├── time-machine.tsx                  ← YENİ: Replay timeline player
│   ├── state-inspector.tsx               ← YENİ: JSON state viewer
│   ├── step-diff.tsx                     ← YENİ: Adımlar arası state diff
│   ├── finops-panel.tsx                  ← YENİ: Borsa ticker + P&L tablosu
│   ├── burn-rate-chart.tsx               ← YENİ: Sparkline burn rate grafiği
│   └── margin-alerts.tsx                 ← YENİ: Marj alarm listesi
├── store/slices/
│   └── adminSlice.ts                     ← YENİ: Admin state yönetimi
└── store/types.ts                        ← GÜNCELLE: Admin type'ları
```

---

## 7. Uygulama Fazları

### Faz 1 — Temel: Admin Auth & Altyapı

**Kapsam:** Admin kimlik doğrulama, route yapısı, veritabanı şema güncellemeleri

| # | Görev | Dosya(lar) |
|---|-------|-----------|
| 1.1 | `Client.js`'e `isAdmin` ve `status` alanları ekle | `models/Client.js` |
| 1.2 | `admin.js` middleware yaz (requireAdmin) | `middleware/admin.js` |
| 1.3 | `AdminLog.js` model oluştur | `models/AdminLog.js` |
| 1.4 | `adminRoutes.js` + `adminController.js` iskelet oluştur | `routes/`, `controllers/` |
| 1.5 | `/api/admin/*` rotalarını `index.js`'e mount et | `routes/index.js` |
| 1.6 | `tenant.js`'de `status === 'suspended'` kontrolü ekle | `middleware/tenant.js` |

**Bağımlılık:** Yok (hemen başlanabilir)

---

### Faz 2 — Global Fleet Radar (Sol Panel)

**Kapsam:** Canlı tenant izleme, systemEventBus, Ghost Mode

| # | Görev | Dosya(lar) |
|---|-------|-----------|
| 2.1 | `runner.js`'e `systemEventBus` ekle, her event'i global yayınla | `workflows/runner.js` |
| 2.2 | `GET /api/admin/tenants` → tüm tenant'lar + aktif workflow bilgisi | `adminController.js` |
| 2.3 | `GET /api/admin/events/global` → admin SSE endpoint | `adminController.js` |
| 2.4 | `GET /api/admin/tenants/:slug/live` → Ghost Mode SSE | `adminController.js` |
| 2.5 | `adminSlice.ts` oluştur (tenant listesi, SSE bağlantıları) | `store/slices/adminSlice.ts` |
| 2.6 | `fleet-radar.tsx` bileşeni (tenant listesi + durum ışıkları) | `components/admin/` |
| 2.7 | `ghost-viewer.tsx` bileşeni (seçili tenant izleme) | `components/admin/` |

**Bağımlılık:** Faz 1

---

### Faz 3 — SOC Siber Savunma (Sağ Üst Panel)

**Kapsam:** Kill switch, IP banlama, global tehdit izleme

| # | Görev | Dosya(lar) |
|---|-------|-----------|
| 3.1 | `BannedIP.js` model oluştur | `models/BannedIP.js` |
| 3.2 | Kill Switch endpoint: `POST /api/admin/tenants/:slug/halt` | `adminController.js` |
| 3.3 | Resume endpoint: `POST /api/admin/tenants/:slug/resume` | `adminController.js` |
| 3.4 | IP ban/unban endpoint'leri | `adminController.js` |
| 3.5 | `rateLimiter.js`'e BannedIP kontrolü ekle | `middleware/rateLimiter.js` |
| 3.6 | `GET /api/admin/security/global` → cross-tenant tehdit özeti | `adminController.js` |
| 3.7 | `soc-panel.tsx` (canlı tehdit feed'i) | `components/admin/` |
| 3.8 | `kill-switch.tsx` (HALT butonu + onay modalı) | `components/admin/` |
| 3.9 | `ip-manager.tsx` (IP ban yönetimi) | `components/admin/` |

**Bağımlılık:** Faz 1

---

### Faz 4 — FinOps & Token Burn Rate (Alt Panel)

**Kapsam:** Canlı maliyet izleme, P&L hesaplama, marj alarmları

| # | Görev | Dosya(lar) |
|---|-------|-----------|
| 4.1 | `costTracker.js`'e `systemEventBus.emit('cost', ...)` ekle | `services/costTracker.js` |
| 4.2 | `GET /api/admin/finance/global` → toplam gelir/gider/P&L | `adminController.js` |
| 4.3 | `GET /api/admin/finance/per-tenant` → tenant bazlı P&L | `adminController.js` |
| 4.4 | `GET /api/admin/finance/burn-rate` → anlık/saatlik/günlük burn rate | `adminController.js` |
| 4.5 | `GET /api/admin/finance/alerts` → marj < %20 olan tenant'lar | `adminController.js` |
| 4.6 | `GET /api/admin/finance/live` → SSE canlı maliyet akışı | `adminController.js` |
| 4.7 | `POST /api/admin/tenants/:slug/throttle` → model downgrade / rate limit | `adminController.js` |
| 4.8 | `finops-panel.tsx` (ticker + P&L tablosu) | `components/admin/` |
| 4.9 | `burn-rate-chart.tsx` (sparkline grafik) | `components/admin/` |
| 4.10 | `margin-alerts.tsx` (alarm listesi + aksiyonlar) | `components/admin/` |

**Bağımlılık:** Faz 1 + costTracker mevcut (Faz 2-3 ile paralel yapılabilir)

---

### Faz 5 — Zaman Makinesi (Orta Panel)

**Kapsam:** MongoDB checkpointer, workflow replay, state inspection

| # | Görev | Dosya(lar) |
|---|-------|-----------|
| 5.1 | `WorkflowCheckpoint.js` model oluştur | `models/WorkflowCheckpoint.js` |
| 5.2 | `mongoCheckpointer.js` servisi yaz (BaseCheckpointSaver extend) | `services/mongoCheckpointer.js` |
| 5.3 | `graph.js`'de MemorySaver → MongoCheckpointer geçişi | `workflows/graph.js` |
| 5.4 | `GET /api/admin/workflows` → cross-tenant workflow listesi | `adminController.js` |
| 5.5 | `GET /api/admin/workflows/:threadId/replay` → checkpoint timeline | `adminController.js` |
| 5.6 | `GET /api/admin/workflows/:threadId/state/:step` → state snapshot | `adminController.js` |
| 5.7 | `POST /api/admin/workflows/:threadId/retry` → workflow yeniden başlat | `adminController.js` |
| 5.8 | `operating-room.tsx` (workflow arama/filtreleme) | `components/admin/` |
| 5.9 | `time-machine.tsx` (replay timeline player) | `components/admin/` |
| 5.10 | `state-inspector.tsx` (JSON tree viewer) | `components/admin/` |
| 5.11 | `step-diff.tsx` (adımlar arası fark görünümü) | `components/admin/` |

**Bağımlılık:** Faz 1 (en karmaşık faz — MongoDB checkpointer ciddi engineering gerektirir)

---

### Faz 6 — Birleştirme & Polish

**Kapsam:** Admin layout, sidebar entegrasyonu, animasyonlar, son dokunuşlar

| # | Görev | Dosya(lar) |
|---|-------|-----------|
| 6.1 | `admin-layout.tsx` — 4 paneli birleştiren grid layout | `components/admin/` |
| 6.2 | `sidebar.tsx`'e "GOD MODE" butonu ekle (isAdmin kontrolüyle) | `components/layout/sidebar.tsx` |
| 6.3 | `page.tsx`'de `activeView === "admin"` routing | `app/page.tsx` |
| 6.4 | `types.ts`'e admin type'ları ekle | `store/types.ts` |
| 6.5 | Framer Motion animasyonları: panel geçişleri, pulse efektleri | Tüm admin bileşenleri |
| 6.6 | Responsive breakpoint'ler (ultrawide optimizasyonu) | `admin-layout.tsx` |
| 6.7 | Keyboard shortcut'lar (`Ctrl+G` → God Mode toggle) | `page.tsx` |

**Bağımlılık:** Faz 2-5 tamamlanmış olmalı

---

## Toplam Tahmini Bileşen Sayıları

| Kategori | Yeni Dosya | Güncellenen Dosya |
|----------|-----------|------------------|
| **Backend Model** | 3 (AdminLog, BannedIP, WorkflowCheckpoint) | 1 (Client.js) |
| **Backend Middleware** | 1 (admin.js) | 2 (tenant.js, rateLimiter.js) |
| **Backend Controller** | 1 (adminController.js) | 0 |
| **Backend Route** | 1 (adminRoutes.js) | 1 (index.js) |
| **Backend Service** | 1 (mongoCheckpointer.js) | 2 (runner.js, costTracker.js) |
| **Backend Workflow** | 0 | 1 (graph.js) |
| **Frontend Component** | 13 (admin/ klasörü) | 2 (page.tsx, sidebar.tsx) |
| **Frontend Store** | 1 (adminSlice.ts) | 1 (types.ts) |
| **TOPLAM** | **21 yeni dosya** | **10 güncelleme** |
