# Emlakçı Senaryo Analiz Raporu

> **Kapsam:** `growth` ürünü + `pro` plan alan bir emlakçı müşteri için sistem davranışı analizi.
> Mevcut kod tabanı baz alınmıştır: `orchestrator.js`, `plans.js`, `scraperAgent.js`, `writerAgent.js`, `cronService.js`.

---

## 1. Emlakçı Hangi Paketi Almalı?

| Kriter | Değer |
|--------|-------|
| **Ürün** | `growth` (Growth & Revenue) |
| **Plan** | `pro` — $299/ay |
| **Erişebildiği Ajanlar** | scraper, writer, critic, fileSaver, human_approval, publisher |
| **Erişemediği Ajanlar** | analyzer, innovator, architect, salesRep, auditor, supplyChain |
| **Max Revizyon** | 3 |

> ⚠️ **Fiyat Uyumsuzluğu:** Analiz dokümanında emlakçıya $499/ay fiyat biçilmiş, ancak `plans.js:18`'de `pro` planı $299/ay olarak tanımlı.
> Ya plan $499'a güncellenmeli ya da dokümandaki fiyat düzeltilmeli.

---

## 2. Emlakçının 3 Senaryosu — Gerçek Sistem Karşılaştırması

### Senaryo 1: Sıkıcı İlanı "Arzu Nesnesine" Çevirme

**Vizyon:** Emlakçı ev linkini yapıştırır → Scraper evi tarar → Writer duyguya hitap eden metin üretir → HITL onayı → Yayın

**Gerçek Akış:**

| Adım | Ne Olur? | Kod Referansı | Durum |
|------|----------|---------------|-------|
| Emlakçı `TWITTER: [sahibinden linki] Bu evi pazarla` yazar | Orchestrator tetiklenir | `job-queue.tsx:46` | ✅ Çalışır |
| Orchestrator FREN 0.3 → Scraper'a yönlendirir | `TWITTER:` / `LINKEDIN:` prefix tanınır | `orchestrator.js` | ✅ Çalışır |
| Scraper linki arar | Tavily API ile web araması | `scraperAgent.js:49` | ⚠️ Kısmi |
| Writer sosyal medya modunda içerik üretir | Twitter Thread (5–7 tweet) veya LinkedIn post | `writerAgent.js:102–157` | ✅ Çalışır |
| Critic kalite kontrolü yapar | Revizyon döngüsü (max 3) | `criticAgent.js:26` | ✅ Çalışır |
| fileSaver → HITL onay paneli açılır | Sağ panelde Approve/Override butonu görünür | — | ✅ Çalışır |
| Publisher dağıtır | Telegram/Discord bildirimi | ActionQueue | ✅ Çalışır |
| CMO kampanya üretir | Publish sonrası otomatik tetiklenir | `runner.js:242` | ✅ Çalışır |

**Scraper Kısıtı:**
Tavily bir arama motoru API'sidir, doğrudan URL parse etmez. Emlakçı bir `sahibinden.com` linki yapıştırırsa, Tavily o sayfanın içeriğini değil — URL'deki anahtar kelimeleri arar. İlan arama motorlarında indexlenmişse sonuç iyi gelir; indexlenmemişse genel veri döner. Şu anda `search_depth: "basic"`, `max_results: 3` ile çalışıyor; `include_raw_content: true` veya `urls` parametresi kullanılmıyor.

**Sonuç:** ✅ ÇALIŞIR — Scraper doğrudan URL parse etmiyor, ancak yeterli çıktı üretir.

---

### Senaryo 2: "Sektör Otoritesi" (Kanaat Önderi) Olma

**Vizyon:** Emlakçı "Faiz oranları hakkında LinkedIn postu yaz" der → Scraper güncel haberleri tarar → Writer profesyonel B2B dili ile yazar

**Gerçek Akış:**

| Adım | Ne Olur? | Kod Referansı | Durum |
|------|----------|---------------|-------|
| Emlakçı `LINKEDIN: Türkiye konut kredisi faiz oranları` yazar | FREN 0.3 → Scraper'a | `orchestrator.js` | ✅ |
| Scraper LLM ile en iyi arama sorgusunu üretir | Claude sorguyu optimize eder | `scraperAgent.js:53–57` | ✅ |
| Tavily güncel ekonomi haberlerini çeker | `include_answer: true` ile AI özeti de gelir | — | ✅ |
| Writer LinkedIn modunda yazar | Hook + 150–250 kelime + hashtag | `writerAgent.js:127–135` | ✅ |
| HITL onay → Publish | Standart akış | — | ✅ |

**Sonuç:** ✅ TAM ÇALIŞIR — Sistemin en güçlü olduğu senaryo. Scraper gerçek veri çekiyor, hallüsinasyon riski düşük, Writer LinkedIn formatını tam biliyor.

---

### Senaryo 3: Tam Otonom (Otopilot) Modu

**Vizyon:** Emlakçı `TWITTER_AUTO_TOPICS = "Gayrimenkul, Kira Getirisi"` ayarlar → Cron her sabah 09:00'da çalışır → Sistem otomatik tweet üretir → Telegram bildirimi → Emlakçı telefondan onaylar

**Gerçek Durum:**

| Bileşen | Durum | Detay |
|---------|-------|-------|
| Twitter Cron Job | ✅ Var | `cronService.js` — günlük `TWITTER_POST_HOUR` saatinde çalışır |
| `socialContentAgent.js` | ✅ Var | Tavily + LLM ile içerik üretimi, per-tenant HITL desteği |
| `TWITTER_AUTO_TOPICS` | ⚠️ Kısmi | `TenantConfig.socialAuto.topics[]` ile per-tenant ayarlanabilir; ancak eski `twitterContentAgent.js` hâlâ global ENV kullanıyor olabilir |
| Per-tenant topic ayarı | ✅ Var | `TenantConfig.configObject.socialAuto` üzerinden yönetilir |
| Per-tenant persona/voice | ⚠️ Kısmi | `socialContentAgent.js` tenant config'i okuyor; eski twitter agent'ta eksik |
| HITL onayı cron tweet'lerde | ✅ Var | `requireHITL: true` ile `ScheduledPost` → `AWAITING_APPROVAL` statüsü |
| Telegram bildirimi | ✅ Var | Per-tenant Telegram token desteği; fallback global ENV |

**Sonuç:** ⚠️ KISMEN ÇALIŞIR — `socialContentAgent.js` + `TenantConfig.socialAuto` ile otopilot altyapısı mevcut. Eksik olan: `twitterContentAgent.js` referanslarının tamamen kaldırılması ve admin panelinden topic/persona konfigürasyonunun kolaylaştırılması.

---

## 3. Portföy Avı Stratejileri — Sistem Karşılaştırması

### Strateji 1: "Sahibinden" Keskin Nişancısı (Cold Outreach)

**Akış:** Emlakçı `sahibinden.com` linkini yapıştırır → Scraper evi okur → Writer ikna edici soğuk satış metni üretir

| Bileşen | Durum | Detay |
|---------|-------|-------|
| `COLD_OUTREACH:` prefix → FREN C tetikler | ✅ | `orchestrator.js:115–125` |
| Scraper → Writer akışı (analyzer/innovator atlanır) | ✅ | Doğru; pro plan kısıtına uygun |
| E-posta / WhatsApp gönderimi | ⚠️ | Publisher sadece Telegram, Discord, n8n webhook destekliyor; doğrudan e-posta yok |

**Sonuç:** ⚠️ KISMEN ÇALIŞIR — Metin üretilir, ancak gönderim kanalları sınırlı. Emlakçının metni WhatsApp'tan manuel kopyalaması gerekiyor. "50 kişiye otomatik mail" işlevi yok.

---

### Strateji 2: "Otorite Mıknatısı" (Inbound — Sosyal Medya)

**Sonuç:** ✅ ÇALIŞIR — Senaryo 2 ile birebir aynı akış. Tam fonksiyonel.

---

### Strateji 3: "Ücretsiz Değerleme" Kancası (Instagram/Meta Reklam)

| Bileşen | Durum | Detay |
|---------|-------|-------|
| CMO reklam kopyası üretimi | ✅ | `cmoAgent.js:57–67` — Google/Meta Ad Copy üretiyor |
| Instagram/Facebook post yayını | ✅ | `socialMediaService.js` — Instagram Graph API + Facebook Pages API mevcut |
| Sosyal Medya UI | ✅ | Post composer, scheduling, multi-platform seçimi var |
| Lead toplama formu | ❌ | CRM veya lead capture form entegrasyonu yok |

**Sonuç:** ⚠️ KISMEN ÇALIŞIR — Reklam metni üretilip sosyal medyaya gönderilebilir, ancak "tıkla → formu doldur" tarzı lead capture mekanizması sistemde yok.

---

## 4. Pro Planında Eksik Olan Kritik Yetenekler

Emlakçı `pro` planında şu ajanlara **erişemez** (FREN 0 engeli — `orchestrator.js:148–163`):

| Ajan | Ne Yapardı? | Pro Plan'daki Etkisi |
|------|-------------|----------------------|
| `analyzer` | Emlak piyasası derinlemesine analiz, m² fiyat trendleri | Raporlar yüzeysel kalır — yalnızca scraper verisi + writer çıktısı |
| `innovator` | "Vizyoner Alternatif" — rakiplerin göremediği fırsatlar | Raporda "Visionäre Alternative" bölümü üretilmez |
| `salesRep` | B2B müzakere, fiyat pazarlığı, BANT analizi | Soğuk satış otomasyonu kısıtlı kalır |

> **Kritik Çelişki:** Analiz dokümanı `Scraper → Analyzer → Innovator → Writer` tam araştırma akışını anlatıyor.
> Ancak `pro` planında `analyzer` ve `innovator` YASAK — FREN 0 bunu `orchestrator.js:148–163`'te engelliyor.
> **Tam araştırma akışı için emlakçının `enterprise` ($999/ay) alması gerekir.**

---

## 5. Sistem Skor Tablosu (Emlakçı Perspektifi)

| Yetenek | Puan | Açıklama |
|---------|------|----------|
| Sosyal Medya İçerik Üretimi | 9/10 | Twitter thread + LinkedIn post mükemmel çalışıyor |
| HITL Onay Mekanizması | 10/10 | Vantablack UI, sağ panel, Approve/Override — kusursuz |
| Scraper (Web Araştırma) | 7/10 | Tavily genel arama yapıyor; spesifik URL parse eksik |
| Soğuk Satış Metni (Outreach) | 8/10 | Metin üretilir, gönderim otomasyonu zayıf |
| Otopilot Modu | 6/10 | `socialAuto` altyapısı var; eski agent referansları temizlenmeli |
| Portföy Pazarlama | 8/10 | Metin + kampanya üretimi güçlü |
| Lead Toplama | 2/10 | CRM/form entegrasyonu yok |
| Multi-Platform Yayın | 8/10 | Twitter, LinkedIn, Instagram, Facebook hepsi var |
| Per-Tenant Kişiselleştirme | 7/10 | `socialAuto` tenant-aware; eski twitter agent hâlâ global |
| Maliyet/Değer Oranı | 7/10 | Pro plan $299/ay — metin üretimi + sosyal medya yönetimi için makul |

**Genel Skor: 7.2/10**

---

## 6. Bulgular ve Öneriler

### Hemen Çalışan Akışlar (Sıfır Değişiklik)

- `TWITTER:` veya `LINKEDIN:` ile sosyal medya içerik üretimi
- `COLD_OUTREACH:` ile hedef firma araştırma + soğuk satış metni
- HITL onay → Publish → CMO kampanya otomasyonu
- Sosyal medya hesap bağlama + post scheduling
- `TenantConfig.socialAuto` ile per-tenant otopilot konfigürasyonu

---

### Geliştirme Gerektiren 5 Kritik Boşluk (Öncelik Sırasına Göre)

| Öncelik | Boşluk | Zorluk | Beklenen Etki |
|---------|--------|--------|---------------|
| 🔴 **1** | **Plan Uyumsuzluğu:** Dokümanda `analyzer`/`innovator` vaadediliyor, `pro` planında yasak. Ya `pro` → $499'a çıkarılıp bu ajanlar açılmalı, ya da dokümandaki vaatler daraltılmalı | Karar | Müşteri beklenti yönetimi — en yüksek öncelik |
| 🟠 **2** | **`twitterContentAgent.js` Temizliği:** Eski global-ENV bazlı agent referansları kaldırılmalı, `socialContentAgent.js` tek kaynak olmalı | Düşük | Otopilot modu tamamen per-tenant ve kararlı hale gelir |
| 🟡 **3** | **URL Scraping:** Tavily'nin `urls` parametresi veya ayrı Puppeteer/Cheerio ile doğrudan `sahibinden.com` linki parse edilmeli | Orta | Senaryo 1 çok daha güçlü olur; halüsinasyon riski düşer |
| 🟢 **4** | **E-posta Gönderim Kanalı:** Publisher'a `EMAIL` actionType eklenmeli veya n8n webhook ile Gmail/SMTP entegre edilmeli | Orta | Portföy Avı Strateji 1 tam otonom hale gelir |
| 🔵 **5** | **Lead Toplama:** CRM entegrasyonu veya basit form → webhook mekanizması eklenmeli | Yüksek | Strateji 3'te "tıkla → form doldur" akışı açılır |

---

## Özet

Sistem, emlakçı için **sosyal medya içerik üretimi** ve **HITL onay mekanizması** konusunda çok güçlü. Bir emlakçı bugün `growth` ürününü alıp "Sosyal Medya" ve "Soğuk Satış" sekmelerini aktif olarak kullanabilir. Writer'ın sosyal medya modu (Twitter thread + LinkedIn post) gerçekten iyi çalışıyor.

`TenantConfig.socialAuto` ile otopilot altyapısı da büyük ölçüde hazır — eski `twitterContentAgent.js` referansları temizlendiğinde Senaryo 3 tam çalışır hale gelecek.

Ancak **"hiç uyumayan dijital pazarlama direktörü"** vaadini tam karşılamak için şu iki geliştirme kritik:

1. **Doğrudan URL scraping** — Sahibinden ilanlarının gerçek verisi çekilmeli
2. **E-posta gönderim kanalı** — Soğuk satış metni manuel kopyalama olmadan gönderilebilmeli

Bu ikisi olmadan emlakçı sisteme her seferinde manuel giriş yapmak zorunda — ki bu "günde 1 dakika" vaadini karşılamıyor.
