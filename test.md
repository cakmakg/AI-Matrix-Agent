# 🏗️ AI Orchestra — Frontend UI Redesign Master Raporu

## 1. MEVCUT DURUM ANALİZİ (Sorun Tespiti)

### 1.1 Mevcut Layout Yapısı

```text
┌──────────────┬─────────────────────────────────┬──────────────────┐
│   SIDEBAR    │        ORTA PANEL (60%)         │  SAĞ PANEL (25%) │
│   (200px)    │                                 │   (380px)        │
│              │  ┌────────────────────────────┐ │                  │
│  Navigasyon  │  │  12 Ajan Grid (4x3)        │ │  Input Formu     │
│              │  │  Devasa kartlar            │ │  Sub-tab'lar     │
│              │  │  Hepsi aynı büyüklükte     │ │  Queue kartları  │
│              │  ├────────────────────────────┤ │  HITL onayları   │
│              │  │  Echtzeit-Aktivitätslog    │ │  Kampanyalar     │
│              │  │  (30 satır log)            │ │  Arşiv           │
│              │  └────────────────────────────┘ │                  │
└──────────────┴─────────────────────────────────┴──────────────────┘

#,Sorun,Etki
S1,"En değerli alan (orta %60) ""Ajan Grid + Log""a ayrılmış","Kullanıcı asıl işini (rapor okuma, onay verme) sağdaki 380px'lik dar sütunda yapmak zorunda."
S2,"12 ajan kartı hep aynı boyutta, hep görünür",Bilişsel yük — kullanıcı hangi ajanın aktif olduğunu bulmak için 12 kartı taramalı.
S3,Input formu + Queue + Arşiv hepsi aynı 380px sütuna sıkıştırılmış,"Rapor metni, HITL onay kartları, kampanya içerikleri okunamaz halde."
S4,OperatingTable (HITL Approval) ayrı bir bileşen ama dar alanda render ediliyor,"Markdown raporlar okunabilir değil, approval UX sıkışık."
S5,Aktivite logu orta panelde çok yer kaplıyor,Son kullanıcı (emlakçı vs.) log okumaz — sadece sonuç ister.
S6,"KPI kartları (4 adet) aşırı büyük, sabit header'da devasa alan kaplıyor","Her biri 80px+ yükseklik, toplamda ~100px+ sadece KPI'ya gidiyor."
S7,Workflow durumu sadece küçük header text'te görünüyor,Kullanıcı mevcut iş akışının hangi aşamada olduğunu net göremez.

1.3 "Mühendislik UI" vs "İş UI" Karşılaştırması
Kriter,Mevcut (Mühendislik),Hedef (İş/Workspace)
Ana Odak,Ajan mekanizması,Çıktı ve aksiyonlar
Ajan Görünürlüğü,"12 kart, hep görünür",Durum özeti + drill-down
Rapor Okuma,380px dar sütun,Geniş merkez alan
Input Alanı,Sağ köşeye sıkışmış,"Üst-orta, prominent"
Log/Terminal,Orta panelin yarısı,"Küçük, katlanabilir sağ panel"
Benzeri Ürünler,Datadog terminal,"Linear, Notion, Vercel"

2. YENİ TASARIM MİMARİSİ
2.1 Yeni Layout (Ters Çevrilmiş Hiyerarşi)
┌──────────┬────────────────────────────────────────────┬──────────────────┐
│ SIDEBAR  │               ANA SAHNE (Orta)             │ SİSTEM MONİTÖR   │
│ (200px)  │            (~calc(100% - 200px - 320px))   │   (320px)        │
│          │                                            │                  │
│          │  ┌────────────────────────────────────────┐│  ┌────────────┐  │
│ Logo     │  │  Compact KPI Bar (tek satır, 48px)     ││  │ Workflow   │  │
│          │  ├────────────────────────────────────────┤│  │ Pipeline   │  │
│ Nav      │  │  INPUT ZONE                            ││  │ (dikey)    │  │
│          │  │  Sub-tabs + Prompt kutusu              ││  │            │  │
│          │  │  [F&E Radar] [Son Rapor]               ││  ├────────────┤  │
│          │  ├────────────────────────────────────────┤│  │ Ajan Chips │  │
│          │  │                                        ││  │ (compact)  │  │
│          │  │  TASK BOARD (Ana İş Alanı)             ││  │            │  │
│          │  │                                        ││  ├────────────┤  │
│          │  │  • HITL Approval Cards (geniş)         ││  │ Mini       │  │
│          │  │  • Rapor Okuma (full-width markdown)   ││  │ Terminal   │  │
│          │  │  • Support Tickets (geniş kartlar)     ││  │ (event     │  │
│          │  │  • Campaign Drafts (geniş kartlar)     ││  │  feed)     │  │
│          │  │  • Arşiv                               ││  │            │  │
│          │  │                                        ││  └────────────┘  │
│ Status   │  └────────────────────────────────────────┘│                  │
└──────────┴────────────────────────────────────────────┴──────────────────┘

2.2 Piksel Dağılımı (1920px Ekran)
Bölge,Eski,Yeni,Değişim
Sidebar,200px,200px,Aynı (dokunulmaz)
Orta Panel,~960px (Agent Grid + Log),~1400px (Input + TaskBoard),+440px
Sağ Panel,380px (Input + Queue),320px (System Monitor),-60px
Input alanı,Sağ 380px içinde sıkışık,Orta panelde tam genişlik,3.7x genişleme
Rapor okuma,380px (sağda),"~1400px (ortada, kart içinde)",3.7x genişleme

2.3 Yeni Bilgi Hiyerarşisi (Öncelik Sırası)
LEVEL 1 (Her zaman görünür — Header):
  → Sistem durumu (1 satır), Aktif ajan sayısı, Bekleyen görev sayısı, Workflow phase

LEVEL 2 (Hemen erişilebilir — Orta Panel üst):
  → Task Input (sub-tabs + prompt kutusu)
  → Aksiyon butonları (F&E Radar, Son Rapor)

LEVEL 3 (Ana iş alanı — Orta Panel alt):
  → HITL onay kartları (geniş, okunabilir)
  → Rapor içeriği (full-width markdown)
  → Destek ticket'ları
  → Kampanya taslakları
  → Arşiv

LEVEL 4 (Drill-down — Sağ Panel):
  → Aktif workflow pipeline görseli
  → Ajan durum chips (compact)
  → Mini event terminal (katlanabilir)


3. BİLEŞEN BAZLI DETAYLI TASARIM
3.1 Compact KPI Bar (Yeni — Header İçinde)
Eski: 4 adet 80px+ yüksekliğinde devasa KPI kartı → Toplam ~100px header alanı

Yeni: Tek satır, 48px yüksekliğinde inline KPI badges
┌──────────────────────────────────────────────────────────────────────┐
│  AI Orchestra Kontrollzentrum         🟢 4/12 Agents │ 🔴 3 Pending │ ⏱ 1:50 │ ⟳ │
│  Läuft — #f1461dd9                                                   │
└──────────────────────────────────────────────────────────────────────┘

Tasarım Detayları:

Sol: Başlık + phase subtitle (mevcut gibi).

Sağ: Inline badge'ler (her biri küçük pill şeklinde).

🟢 4/12 Agents → Yeşil dot + sayı

🔴 3 Pending → Kırmızı dot + bekleyen görev sayısı

⏱ 1:50 → Cron countdown

⟳ → Refresh butonu

Kazanç: ~52px dikey alan tasarrufu.

3.2 Input Zone (Orta Panele Taşınmış)
Eski: Sağ panelde 380px genişliğinde, textarea 3 satır

Yeni: Orta panelde tam genişlik, daha rahat ve prominent

┌──────────────────────────────────────────────────────────────────┐
│  GROWTH & REVENUE                                      [growth]  │
│                                                                  │
│  [🐦 Twitter/X] [💼 LinkedIn] [📸 Instagram] [...] [🎯 Cold..]   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Twitter thread konusu girin...                    [▶]   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [✦ F&E-Radar]  [↓ Letzter Bericht]                              │
└──────────────────────────────────────────────────────────────────┘

Tasarım Detayları:

Sub-tab'lar yatay scroll ile (mevcut overflow-x-auto korunur).

Input alanı full-width — URL ve text tipleri büyük, rahat.

File drop zone daha geniş ve belirgin.

Aksiyon butonları alt satırda inline.

3.3 Task Board (Ana İş Alanı — En Kritik Değişiklik)
Eski: 380px sütunda sıkışık küçük kartlar
Yeni: Full-width geniş kartlar, rapor içeriği inline okunabilir

3.3.1 HITL Approval Card (Genişletilmiş)

┌──────────────────────────────────────────────────────────────────┐
│  🔴 HITL — Genehmigung ausstehend                    14:32 Uhr   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Aufgabe: LINKEDIN: Baufinanzierungszinsen knacken die 4%-Ma...  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ## Marktanalyse: Baufinanzierung 2026                     │  │
│  │                                                            │  │
│  │  Die aktuelle Zinsentwicklung zeigt einen deutlichen       │  │
│  │  Rückgang der Baufinanzierungszinsen unter die...          │  │
│  │                                                            │  │
│  │  ### Kernpunkte:                                           │  │
│  │  - Zinssätze fallen erstmals unter 4%                      │  │
│  │  - Nachfrage steigt um 23% im Q1 2026                      │  │
│  │  ...                                          [Mehr lesen] │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Pipeline: CEO → SCR → ANL → WRT → QA ✓ → 📁 ✓ → [🔴 HITL]       │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────────┐                   │
│  │ ✓ AUTORISIEREN  │  │  ✗ Override / Reject │                   │
│  └─────────────────┘  └──────────────────────┘                   │
│                                                                  │
│  Feedback: [___________________________________________]         │
└──────────────────────────────────────────────────────────────────┘

Tasarım Detayları:

Kart full-width (padding ile ~1340px kullanılabilir alan).

Rapor metni inline preview: İlk ~300 karakter + "Mehr lesen" butonu.

"Mehr lesen" tıklanınca kart expand oluyor (accordion), full markdown render.

Workflow pipeline mini görseli kart içinde (yatay chips dizisi).

Approve/Reject butonları kartın altında, büyük ve belirgin.

Feedback textarea kartın içinde (ayrı modal/panel yok).

3.3.2 Support Ticket Card (Genişletilmiş)
┌──────────────────────────────────────────────────────────────────┐
│  🐛 Fehlerbericht          [CRITICAL]  [email]   12. Mär 09:15  │
├──────────────────────────────────────────────────────────────────┤
│  Von: kunde@example.com                                          │
│  Betreff: Login-Fehler seit dem letzten Update                   │
│                                                                  │
│  KI-Zusammenfassung: Kunde meldet wiederholte 500-Fehler beim   │
│  Login seit dem Deployment vom 10. März. Betrifft nur Safari.   │
│                                                                  │
│  ┌ AI Draft Response ────────────────────────────────────────┐  │
│  │  Sehr geehrter Herr Müller, vielen Dank für Ihre...       │  │
│  │  [Vollständige Antwort anzeigen]                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  RAG: [📖 Wissensbasis: Login-Flow (92%)] [📖 Safari-Bugs(78%)] │
│                                                                  │
│  [✓ Antwort senden]  [✗ Ablehnen]  [⬆ Eskalieren]              │
└──────────────────────────────────────────────────────────────────┘

3.3.3 Campaign Card (Genişletilmiş)
┌──────────────────────────────────────────────────────────────────┐
│  📣 CMO — Kampagne           [Li] [Tw] [Fb]    11. Mär 21:43   │
├──────────────────────────────────────────────────────────────────┤
│  Baufinanzierungszinsen knacken die 4%-Marke                     │
│                                                                  │
│  ┌─ LinkedIn ──────────────────┐  ┌─ Twitter/X ──────────────┐  │
│  │  🏠 Die Zinswende ist da!   │  │  🧵 Thread: Baufinanz... │  │
│  │  Baufinanzierungen unter... │  │  1/ Die Zinsen fallen... │  │
│  │            [234/300 Zeichen]│  │           [180/280 Zeich] │  │
│  └─────────────────────────────┘  └──────────────────────────┘  │
│                                                                  │
│  [🚀 Veröffentlichen (2 Plattformen)]  [✗ Ablehnen]            │
└──────────────────────────────────────────────────────────────────┘


Tasarım detayları:

Platform içerikleri yan yana grid (2-3 sütun) — geniş alan sayesinde mümkün
Her platform kartı kendi character count'u ile
Tek butonla toplu yayınlama
3.4 System Monitor (Sağ Panel — Küçültülmüş)
Eski: 380px, Input + Queue (ana iş alanı)
Yeni: 320px, Sadece sistem durumu bilgisi (secondary)



┌──────────────────────────┐
│  ⚡ WORKFLOW PIPELINE      │
│                          │
│  ● CEO  ── routing       │
│  ● SCR  ── fetching      │
│  ○ ANL  ── wartend       │
│  ○ WRT  ── wartend       │
│  ○ QA   ── wartend       │
│  ○ HITL ── wartend       │
│  ○ PUB  ── wartend       │
├──────────────────────────┤
│  🤖 AGENTEN (3/12 aktiv) │
│                          │
│  [🟢 CEO] [🟢 SCR]       │
│  [🟢 WRT] [⚪ ANL]       │
│  [⚪ VZN] [⚪ QA ]        │
│  [⚪ HITL] [⚪ PUB]       │
│  [⚪ RDR] [⚪ CMO]        │
│  [⚪ CTO] [⚪ CFO]        │
├──────────────────────────┤
│  📟 EVENT FEED        [▼]│
│                          │
│  14:32:08 CEO routing... │
│  14:32:05 SCR fetching.. │
│  14:31:59 CEO dispatch.. │
│  14:31:55 ▶ Workflow     │
│             started      │
│                          │
│  [... 26 more events]    │
└──────────────────────────┘

3 Bölüm:

A) Workflow Pipeline (Üst — ~180px)
Dikey step-by-step pipeline görseli
Aktif adım yeşil pulsing dot
Tamamlanan adımlar check mark
Bekleyenler gri
HITL adımı özel turuncu/kırmızı vurgu
Sadece workflow çalışırken görünür — IDLE durumda "System bereit" mini badge
B) Agent Chips (Orta — ~160px)
12 ajan, 2 sütunlu küçük chip grid
Her chip: renkli dot + 3 harf kısaltma
Durum renkleri: Yeşil (aktif), Turuncu (thinking), Kırmızı (error), Gri (idle)
Tıklanabilir — tıklayınca chip expand olup detay gösterir (drill-down)
Varsayılan: Compact chips, detay gizli
C) Mini Event Terminal (Alt — flex-1, kalan alan)
Katlanabilir (collapse/expand toggle)
Varsayılan: Son 10 event gösterir
Expand: Full terminal scroll
Monospace font, renk kodlu agent isimleri (mevcut gibi)
Çökük (collapsed) halinde: Sadece son 3 event + "X more" badge
3.5 Expanded Report View (Overlay/Modal)
Kullanıcı bir HITL kartındaki "Mehr lesen" veya "Vollständigen Bericht anzeigen" butonuna tıkladığında:

┌──────────────────────────────────────────────────────────────────┐
│  ← Zurück                    Report #f1461dd9        [⤢ Expand] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ## Marktanalyse: Baufinanzierung 2026                         │
│                                                                  │
│   Die aktuelle Zinsentwicklung zeigt einen deutlichen            │
│   Rückgang der Baufinanzierungszinsen unter die 4%-Marke,       │
│   was erhebliche Auswirkungen auf den Immobilienmarkt hat.      │
│                                                                  │
│   ### 1. Aktuelle Marktsituation                                │
│   ...                                                            │
│   ### 2. Auswirkungen für Immobilienmakler                      │
│   ...                                                            │
│   ### 3. Handlungsempfehlungen                                  │
│   ...                                                            │
│                                                                  │
│   ```                                                            │
│   Zinsentwicklung Q1 2026:                                       │
│   Jan: 4.12% → Feb: 3.95% → Mär: 3.78%                        │
│   ```                                                            │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Confidence: ████████████░░ 85% HIGH                             │
│  Cost: $0.12  │  Pipeline: CEO→SCR→ANL→WRT→QA✓→📁✓→HITL        │
│                                                                  │
│  [✓ AUTORISIEREN]    [✗ Override]    Feedback: [__________]     │
└──────────────────────────────────────────────────────────────────┘


Davranış:

HITL kartı tıklanınca orta panelde genişler (Task Board'un üstüne overlay veya replace)
"← Zurück" ile Task Board'a geri dönülür
Full-width markdown render — prose class ile optimize
Approve/Reject butonları her zaman altta görünür (sticky footer)


4. RENK KODLAMA SİSTEMİ
4.1 Durum Renkleri (Status Colors)
Durum                    Renk                    Hex             Kullanım    Aktif/Çalışıyor       Neon Yeşil           #39ff14    Aktif ajandotbaşarılıbadge HITL/Beklemede        Alert Kırmızı        #ff2d55 Onay bekleyen kartlar, HITL badge 
Thinking            Cyan                  #00f0ff    Düşünen ajan, bilgi badge'leri UyarıAmber#ffb000Cron timer, uyarı loglarıHataKırmızı#ff2d55Error state, reject butonlarıCMO/CampaignTuruncu#ff6b35Kampanya kartlarıIdle/DisabledBeyaz/20%rgba(255,255,255,0.2)Pasif ajanlar, boş durumlar

4.2 Arka Plan Katmanları
Katman,Renk,Kullanım
Base,#070c14,Ana arka plan (Vantablack)
Elevated,#0b1220,"Header, sağ panel, yükseltilmiş yüzeyler"
Card,"rgba(255,255,255,0.02) → 0.04 hover",Kart arka planları
Border,"rgba(255,255,255,0.06) → 0.10 hover",Kenarlar

5. DETAYLI BİLEŞEN ETKİ ANALİZİ
5.1 Dosya Bazlı Değişiklik Planı
#,Dosya,                     Değişiklik,                         Seviye
1,app/page.tsx,Layout grid'i yeniden yapılandır (3-column),      Büyük
2,mission-control/job-queue.tsx,Tamamen yeniden yazılacak (TaskBoard), Kritik
3,mission-control/operating-table.tsx,HITL approval inline karta entegre edilecek,Büyük
4,mission-control/cmo-studio.tsx,  Campaign kartı inline genişletme entegrasyonu,Orta
5,layout/sidebar.tsx,              Dokunulmayacak (zaten iyi),Yok
6,context/right-panel.tsx,Silinecek / System Monitor'e dönüştürülecek,Büyük
7,context/report-viewer.tsx,Inline expanded view olarak refactor,Büyük
8,context/email-viewer.tsx,Inline support card expansion olarak refactor,Orta
9,context/campaign-viewer.tsx,Inline campaign card expansion olarak refactor,Orta
10,hud/terminal-logs.tsx,Mini terminal olarak küçültülecek,Orta
11,hud/artifacts-panel.tsx,Sağ paneldeki pipeline görseline entegre,Küçük
12,agents/agent-topology.tsx,Silinebilir veya chip grid'e dönüşür,Küçük

5.2 Yeni Bileşenler (Oluşturulacak)
#	Bileşen	                 Dosya	                            Açıklama
1	CompactKpiBar	components/mission-control/compact-kpi-bar.tsx	Inline header KPI badges
2	TaskBoard	components/mission-control/task-board.tsx	Ana iş alanı — HITL, Support, Campaign kartları
3	TaskCard	components/mission-control/task-card.tsx	Genişleyebilir (expandable) unified kart bileşeni
4	SystemMonitor	components/monitor/system-monitor.tsx	Sağ panel — Pipeline + Chips + Terminal
5	WorkflowPipeline	components/monitor/workflow-pipeline.tsx	Dikey step görseli
6	AgentChips	components/monitor/agent-chips.tsx	Compact 2-sütun ajan grid
7	MiniTerminal	components/monitor/mini-terminal.tsx	Katlanabilir event feed
8	InputZone	components/mission-control/input-zone.tsx	ProductInput refactored — full-width
9	ReportExpanded	components/mission-control/report-expanded.tsx	Full-width rapor okuma görünümü

5.3 Silinecek/Birleştirilecek Bileşenler

Bileşen                                    	Neden
AgentCard (job-queue.tsx içindeki)         	Chip formatına dönüşüyor
KpiCard (job-queue.tsx içindeki)           	CompactKpiBar'a dönüşüyor
ActivityRow (job-queue.tsx içindeki)       	MiniTerminal'e taşınıyor
right-panel.tsx                            	SystemMonitor ile değiştiriliyor
blueprint-viewer.tsx                       	ReportExpanded içine entegre

6. STATE DEĞİŞİKLİKLERİ
6.1 Mevcut Store'a Eklenecek State
// UISlice'a eklenecek
expandedTaskId: string | null;        // Hangi kart expand durumda (thread ID)
expandedTaskType: "report" | "support" | "campaign" | null;
monitorCollapsed: boolean;            // Sağ panel collapse toggle
terminalExpanded: boolean;            // Mini terminal expand toggle
6.2 Kaldırılacak/Değişecek State
// drawerItem artık kullanılmayacak (sağ panel drawer yerine inline expand)
// Ama backward-compat için tutulabilir — diğer view'lar (social, settings) hâlâ kullanıyor olabilir


7. RESPONSIVE DAVRANIŞ
7.1 Breakpoint Stratejisi

Ekran	Sidebar	Orta Panel	Sağ Panel
≥1440px	200px	flex-1	320px
1280–1439px	200px	flex-1	280px (daraltılmış)
1024–1279px	64px (icon-only)	flex-1	280px
<1024px	Gizli (hamburger)	flex-1	Gizli (toggle)

7.2 Sağ Panel Toggle
≥1280px: Her zaman görünür
<1280px: Toggle butonu ile açılıp kapanır
Kapatıldığında orta panel full-width olur

8. ANİMASYON VE MİKRO-ETKİLEŞİMLER
8.1 Kart Expand/Collapse
Framer Motion kullanılarak pürüzsüz geçiş sağlanacak:

// framer-motion layout animation
<motion.div layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>

8.2 Workflow Pipeline Transitions
Yeni adım aktif olunca: scale(1.05) + glow efekti
Tamamlanan adım: opacity: 1 → 0.6, check mark fade-in
8.3 Agent Chip Status Change
Status değişiminde: Renk geçişi transition-colors duration-300
Aktif olunca: ring-2 ring-[#39ff14]/30 + pulse

9. DİĞER VIEW'LARA ETKİ
9.1 Etkilenmeyen View'lar (Dokunulmayacak)
Bu view'lar activeView ile tamamen farklı render edildikleri için redesign'dan etkilenmezler:

ChatView (chat)
CfoDashboard (cfo)
KnowledgeView (knowledge)
SettingsView (settings)
SkillsView (skills)
SocialView (social)
SecurityView (security)
AuditorDashboard (auditor)
SupplyChainDashboard (supply)
AdminLayout (admin)
CxDashboard (cx)
9.2 Etkilenen View (Sadece Control)
Sadece activeView === "control" durumundaki layout değişiyor. Bu şu bileşenleri etkiler:

page.tsx → Layout grid tanımı
JobQueue → Tamamen yeniden yapılandırılacak
OperatingTable → Inline'a taşınacak

10. UYGULAMA ADIMLARI (Sıralı)
Faz 1: Altyapı (Layout Skeleton)
page.tsx — 3-column grid: Sidebar + MainStage + SystemMonitor
SystemMonitor bileşeni oluştur (boş shell)
InputZone bileşeni — ProductInput'u refactor et (full-width)
Faz 2: Task Board (Ana Değişiklik)
TaskBoard bileşeni — HITL, Support, Campaign kartlarını geniş formatta göster
TaskCard — Unified expandable kart (report/support/campaign tipine göre)
Inline HITL approval (OperatingTable'dan taşı)
Inline report expanded view
Faz 3: System Monitor (Sağ Panel)
WorkflowPipeline — Dikey step görseli
AgentChips — Compact 2-sütun grid
MiniTerminal — Katlanabilir event feed
Faz 4: Compact KPI + Polish
CompactKpiBar — Inline header badges
Animasyon ve geçiş efektleri
Responsive davranış
Faz 5: Temizlik
Kullanılmayan bileşenleri/state'leri kaldır
Test ve doğrulama

Bu rapor, mevcut 42+ bileşenin tümünü, state yapısını, veri akışını ve piksel dağılımını analiz ederek hazırlandı. Uygulamaya geçmemi istersen, Faz 1'den başlayarak adım adım ilerleyebilirim.