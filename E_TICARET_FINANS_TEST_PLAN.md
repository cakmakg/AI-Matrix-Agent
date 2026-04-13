# E-COMMERCE & FINANZ — PRODUCTION-TESTPLAN
**Systemanpassungsbericht — Agent-Matrix / AI Orchestra**

---

## 1. ZIELDEPARTMENT & PRODUKTZUORDNUNG

| Kriterium | Wert |
|-----------|------|
| **Produkt (Product Key)** | `backoffice` |
| **Departmentname** | Finance & Operations |
| **Erforderlicher Plan** | `enterprise` (999 $/Monat) |
| **UI-Registerkarte** | Sidebar → „Finance & Operations" |
| **Unterregisterkarten (SubTabs)** | 🧾 **Rechnungsaudit** + 📦 **Supply Chain** |

Quelle: `server/src/config/plans.js:158-185` — `backoffice`-Produktkonfiguration, `requiredPlan: "enterprise"`

---

## 2. AKTIVE AGENTEN-KARTE

### TEST 1 — Rechnungsprüfungsablauf
| Schritt | Agent | Node-Name | Datei | Aufgabe |
|---------|-------|-----------|-------|---------|
| 1 | 🛡️ Guardrail | `guardrail` | `server/src/agents/guardrailAgent.js` | Eingabe-Sanitisierung, Bedrohungsscan |
| 2 | 🧠 Orchestrator | `orchestrator` | `server/src/agents/orchestrator.js` | **FREN A** wird ausgelöst → leitet an `auditor` weiter |
| 3 | 🧾 Auditor (Agent 13) | `auditor` | `server/src/agents/auditorAgent.js` | Rechnungsanalyse + RAG-Vertragsabgleich + Anomalieerkennung |
| 4 | 🧠 Orchestrator | `orchestrator` | — | `invoiceAnalysis` befüllt → **FREN A** → an `fileSaver` |
| 5 | 💾 FileSaver | `fileSaver` | `server/src/agents/fileAgent.js` | Bericht in MongoDB speichern |
| 6 | 🧠 Orchestrator | `orchestrator` | — | **FREN 2** → `fileSaved=true` → `human_approval` |
| 7 | 🛑 HITL | `human_approval` | `server/src/workflows/graph.js:21` | `interruptBefore` — Graph pausiert, wartet auf Genehmigung |
| 8 | 📢 Publisher | `publisher` | `server/src/agents/publisherAgent.js` | Nach Genehmigung: Telegram/Discord-Benachrichtigung |

### TEST 2 — Lieferkettenablauf
| Schritt | Agent | Node-Name | Datei | Aufgabe |
|---------|-------|-----------|-------|---------|
| 1 | 🛡️ Guardrail | `guardrail` | `server/src/agents/guardrailAgent.js` | Eingabe-Sanitisierung |
| 2 | 🧠 Orchestrator | `orchestrator` | `server/src/agents/orchestrator.js` | **FREN B** wird ausgelöst → an `supplyChain` |
| 3 | 📦 SupplyChain (Agent 14) | `supplyChain` | `server/src/agents/supplyChainAgent.js` | Bestandsanalyse + Dringlichkeitsberechnung + Bestellanfrage-Entwurf |
| 4 | 🧠 Orchestrator | `orchestrator` | — | `stockAlerts` befüllt → **FREN B** → an `fileSaver` |
| 5 | 💾 FileSaver | `fileSaver` | `server/src/agents/fileAgent.js` | Bericht in MongoDB speichern |
| 6 | 🧠 Orchestrator | `orchestrator` | — | **FREN 2** → `human_approval` |
| 7 | 🛑 HITL | `human_approval` | — | Graph pausiert, wartet auf Genehmigung |
| 8 | 📢 Publisher | `publisher` | — | Nach Genehmigung: Benachrichtigung |

---

## 3. FREN-MECHANISMUS (Deterministische Routen)

Die FREN-Regeln im Orchestrator laufen **VOR** dem LLM — null Token-Kosten, 100 % deterministisch:

### FREN A — Rechnungsprüfung (`orchestrator.js:58-74`)
```
Regex: /INVOICE_PROCESSING|FATURA_DENETIM|AUDIT_INVOICE/i
  ├─ invoiceAnalysis leer + Plan erlaubt → auditor
  └─ invoiceAnalysis befüllt + fileSaved=false → fileSaver
```

### FREN B — Lieferkette (`orchestrator.js:79-93`)
```
Regex: /STOCK_CHECK|STOK_KONTROL|SUPPLY_ALERT|INVENTORY_LOW/i
  ├─ stockAlerts leer + Plan erlaubt → supplyChain
  └─ stockAlerts befüllt + fileSaved=false → fileSaver
```

### FREN 0 — Plan-Guardrail (`orchestrator.js:147-167`)
Wenn ein Nicht-Enterprise-Benutzer eine Aufgabe unter dem `backoffice`-Produkt sendet, wird sie auf Controller-Ebene blockiert. Falls sie den Orchestrator dennoch erreicht, greift FREN 0 als zweite Verteidigungslinie.

### FREN 2 — HITL-Weiterleitung (`orchestrator.js:181-184`)
```
fileSaved=true + humanApproval=null → human_approval (HITL-Pausierung)
```

---

## 4. STATE-FELDER (Zustandsfelder)

Von diesen Tests verwendete LangGraph-State-Felder (`state/graphState.js`):

| Feld | Typ | Verwendender Agent | Beschreibung |
|------|-----|-------------------|--------------|
| `invoiceAnalysis` | string | auditor → orchestrator | Rechnungsprüfungsbericht (Markdown) |
| `anomalyDetected` | boolean | auditor | Wurde eine Anomalie in der Rechnung erkannt? |
| `confidenceScore` | number | auditor | Vertrauensscore (0–100 %) |
| `stockAlerts` | string | supplyChain → orchestrator | Bestandsanalysebericht (Markdown) |
| `draftOrderEmail` | string | supplyChain | Entwurf der Bestellanfrage an den Lieferanten |
| `finalContent` | string | auditor / supplyChain | Beide Agenten setzen dieses Feld → fileSaver speichert es |
| `fileSaved` | boolean | fileSaver | Wurde die Datei in MongoDB gespeichert? |
| `humanApproval` | null / boolean | human_approval | HITL-Entscheidungsstatus |

---

## 5. MONGODB-MODELLE

### InvoiceAudit (`server/src/models/InvoiceAudit.js`)
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `threadId` | String (unique) | Workflow-Thread-Identifikator |
| `clientId` | String | Mandant (Tenant) |
| `anomalyDetected` | Boolean | Anomalie erkannt? |
| `anomalyType` | Enum | `PRICE_MISMATCH` · `DUPLICATE_INVOICE` · `SUSPICIOUS_VENDOR` · `AMOUNT_EXCEEDS_LIMIT` · `NONE` |
| `auditAnalysis` | String | Vollständiger Prüfbericht (Markdown) |
| `recommendedAction` | Enum | `APPROVE` · `REJECT` · `ESCALATE` · `PENDING` |
| `confidenceScore` | Number (0–100) | Vertrauensscore der Analyse |
| `ragMatchFound` | Boolean | Wurde ein Vertrag in der RAG-Wissensdatenbank gefunden? |
| `ragMatchDetails` | String | RAG-Ergebnisdetails (max. 500 Zeichen) |
| `rawInvoiceText` | String | Ursprünglicher Rechnungstext |
| `status` | Enum | `AWAITING_APPROVAL` · `APPROVED` · `REJECTED` · `ESCALATED` · `POSTED` |

### SupplyChainEvent (`server/src/models/SupplyChainEvent.js`)
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `threadId` | String (unique) | Workflow-Thread-Identifikator |
| `clientId` | String | Mandant (Tenant) |
| `sku` | String (required) | Produkt-SKU |
| `currentStock` | Number | Aktueller Lagerbestand |
| `reorderPoint` | Number | Nachbestellpunkt |
| `daysUntilStockout` | Number | Geschätzte Tage bis Leerstand |
| `urgencyLevel` | Enum | `LOW` · `MEDIUM` · `HIGH` · `CRITICAL` |
| `plannerAnalysis` | String | Vollständiger Planerbericht (Markdown) |
| `draftOrderEmail` | String | Entwurf der Bestellanfrage |
| `eventType` | Enum | `INVENTORY_LOW` · `STOCKOUT_IMMINENT` · `REORDER_TRIGGERED` · `DELIVERY_DELAYED` · `VENDOR_ISSUE` |
| `status` | Enum | `ALERT` · `AWAITING_APPROVAL` · `ORDER_SENT` · `ACKNOWLEDGED` · `RESOLVED` |

---

## 6. VORAUSSETZUNGEN UND VORBEREITUNG

### 6.1 Kontoerstellung
1. Registrierung über `POST /api/auth/register`:
   - `name`: „TechNova E-Commerce"
   - `plan`: **enterprise** (Ohne diesen Plan werden auditor/supplyChain durch FREN 0 blockiert)
   - `product`: **backoffice**

2. Client-Dokument in MongoDB validieren:
   ```js
   db.clients.findOne({ name: "TechNova E-Commerce" })
   // Erwartet: plan: "enterprise", product: "backoffice"
   ```

### 6.2 Knowledge Base (RAG) laden
Damit der Auditor einen Vertragsabgleich durchführen kann, muss der Lieferantenvertrag in die RAG-Datenbank geladen werden:

```
POST /api/knowledge
Header: X-Api-Key: <technova_api_key>
Body: {
  "title": "Shenzhen Electronics Co. — Lieferantenvertrag",
  "content": "Lieferant: Shenzhen Electronics Co.\nProdukt: iPhone 15 Pro Hülle\nVertraglich vereinbarter Stückpreis: 2,00 $ / Stück\nVertragsbedingung: Die Frachtkosten (Navlun) gehen zu Lasten des Lieferanten.\nZahlung: 30 Tage Zahlungsziel.\nGültigkeit: 01.01.2025 — 31.12.2026\nVertrags-Nr.: #VENDOR-SZ-2025-042"
}
```

Diese Daten werden mittels Gemini-Embedding vektorisiert und in der `Knowledge`-Kollektion gespeichert. Der Auditor ruft sie über `searchKnowledge("Shenzhen Electronics Co. vereinbarter Preis Vertrag", clientId, 3)` ab.

### 6.3 Server & Frontend starten
```bash
cd server && node src/index.js     # Port 3000
cd frontend && npm run dev          # Port 3002
```

---

## 7. TEST 1: RECHNUNGSANOMALIE UND BETRUGSERKENNUNG

### 7.1 UI-Navigation
1. Im Frontend einloggen (Konto: TechNova E-Commerce)
2. In der Seitenleiste muss **„Finance & Operations"** ausgewählt sein (`product: backoffice`)
3. In der InputZone auf die Unterregisterkarte **„🧾 Rechnungsaudit"** klicken
4. Das TaskPrefix `INVOICE_PROCESSING: ` wird automatisch vorangestellt

### 7.2 Eingabe (systemangepasst)
Im Textfeld einfügen:
```
Lieferant: Shenzhen Electronics Co.
Produkt: 10.000 x iPhone 15 Pro Hüllen
Stückpreis: 2,15 $ (Gesamt: 21.500 $)
Zusatzkosten: 1.200 $ (Internationale Frachtkosten)
Gesamtbetrag: 22.700 $
```

**Senden-Button drücken.** Das Frontend sendet `INVOICE_PROCESSING: Lieferant: Shenzhen Electronics Co...`

### 7.3 Erwarteter Systemablauf

| Schritt | Ereignis | Konsolenlog | SSE-Event |
|---------|----------|-------------|-----------|
| 1 | Guardrail-Scan | `🛡️ GuardRail devreye girdi... ✅ Temiz giriş — Tehdit Skoru: 0/10` | — |
| 2 | Orchestrator FREN A | `⚡ FREN A: Fatura görevi → auditor'a yönlendiriliyor.` | `agent_active: ceo` |
| 3 | Auditor-RAG-Suche | `RAG: Shenzhen Electronics Co. için X kayıt bulundu.` | `agent_active: auditor` |
| 4 | Auditor-Analyse abgeschlossen | `✅ Denetçi: Anomali: ⚠️ TESPİT EDİLDİ. Güven: 92%` | — |
| 5 | Orchestrator FREN A (2. Durchlauf) | `⚡ FREN A: Fatura analizi tamam → fileSaver'a.` | `agent_active: ceo` |
| 6 | FileSaver speichern | `💾 Report kaydedildi` | — |
| 7 | Orchestrator FREN 2 | `⚡ SİSTEM MÜDAHALESİ: Dosya kaydedildi → Yargıca` | `agent_active: ceo` |
| 8 | HITL-Pausierung | `👨‍⚖️ Yargıç kararı bekleniyor...` | `workflow_complete: AWAITING_HUMAN_APPROVAL` |

> **Hinweis:** Die Konsolenlogs sind auf Türkisch, da der Server-Code türkische `console.log`-Nachrichten verwendet. Dies ist kein Fehler.

### 7.4 Erwartete Auditor-Ausgabe

```markdown
## Rechnungsprüfung — Shenzhen Electronics Co.

### Zusammenfassung
- **Rechnungsbetrag:** 22.700 $
- **Vereinbarter Preis (aus RAG):** 2,00 $/Stück × 10.000 = 20.000 $
- **Abweichung:** +2.700 $ (+13,5 %)
- **Anomalie erkannt:** ✅ JA

### Befunde
1. Stückpreisabweichung: 2,15 $ gegenüber 2,00 $ → Anstieg um 7,5 % (Vertragsverletzung)
2. Frachtkosten: 1.200 $ — laut Vertrag „gehen die Frachtkosten zu Lasten des Lieferanten"
3. Gesamtüberberechnung: 1.500 $ (Preis) + 1.200 $ (Fracht) = 2.700 $

### Empfehlung
**ABLEHNEN** — Die Vertragsbedingungen wurden um 13,5 % verletzt. Eine Rechnungsreklamation (Claim) sollte an den Lieferanten gesendet werden.

### Entwurf der Reklamations-E-Mail
Sehr geehrte Damen und Herren der Buchhaltung,
Shenzhen Electronics Co.,

bezugnehmend auf Ihre Rechnung mit der Nr. #INV-883 müssen wir folgende Vertragsverletzungen beanstanden:

1. **Stückpreisabweichung:** Der berechnete Stückpreis von 2,15 $ weicht um 7,5 % vom vertraglich vereinbarten Preis von 2,00 $ ab. Überzahlung: 1.500 $.
2. **Unberechtigte Frachtkosten:** 1.200 $ für internationale Fracht – laut Vertrag #VENDOR-SZ-2025-042 gehen die Frachtkosten zu Lasten des Lieferanten.

Wir fordern eine korrigierte Rechnung über 20.000 $ (10.000 × 2,00 $) ohne Frachtzuschlag.

Mit freundlichen Grüßen,
TechNova E-Commerce — Finanzabteilung

### Konfidenz-Score
92 %
```

### 7.5 HITL-Genehmigungsbildschirm
- Der ReportViewer öffnet sich im rechten Panel
- Im Status `workflowPhase: "AWAITING_APPROVAL"` erscheinen die Schaltflächen **AUTHORIZE** und **OVERRIDE**
- Der Berichtsinhalt zeigt die Anomaliedetails
- **AUTHORIZE** → `POST /api/approve` → Publisher wird ausgeführt (Telegram/Discord-Benachrichtigung)
- **OVERRIDE** → Revisions-Workflow startet (Writer-Critic-Schleife)

### 7.6 MongoDB-Validierung
```js
// InvoiceAudit-Prüfung
db.invoiceaudits.findOne({ threadId: "<thread_id>" })
// Erwartet: anomalyDetected: true, ragMatchFound: true, status: "AWAITING_APPROVAL"

// Report-Prüfung
db.reports.findOne({ threadId: "<thread_id>" })
// Erwartet: status: "AWAITING_APPROVAL", content enthält "Anomalie erkannt: ✅ JA"
```

---

## 8. TEST 2: KRITISCHE BESTANDSKRISE UND AUTONOME BESCHAFFUNG

### 8.1 UI-Navigation
1. In der InputZone auf die Unterregisterkarte **„📦 Supply Chain"** klicken
2. Das TaskPrefix `STOCK_CHECK: ` wird automatisch vorangestellt

### 8.2 Eingabe (systemangepasst)
```
Lagerbestand iPhone 15 Pro Hüllen auf kritischem Niveau.
Aktueller Bestand: 450 Stück.
Tägliche Verkaufsrate (Velocity): 150 Stück/Tag.
Geschätzte Restlaufzeit: 3 Tage.
Lieferant: Shenzhen Electronics Co.
Aktion: Sofortige Produktionsanweisung an die Fabrik in China — Lieferung per Luftfracht anfordern.
```

**Senden-Button drücken.** Das Frontend sendet `STOCK_CHECK: Lagerbestand iPhone 15 Pro Hüllen...`

### 8.3 Erwarteter Systemablauf

| Schritt | Ereignis | Konsolenlog | SSE-Event |
|---------|----------|-------------|-----------|
| 1 | Guardrail | `✅ Temiz giriş — Tehdit Skoru: 0/10` | — |
| 2 | Orchestrator FREN B | `⚡ FREN B: Stok görevi → supplyChain'e yönlendiriliyor.` | `agent_active: ceo` |
| 3 | SupplyChain-RAG-Suche | (Lieferanteninformationen werden gesucht) | `agent_active: supplyChain` |
| 4 | SupplyChain-Analyse | `✅ Tedarik Planlayıcısı: Aciliyet: CRITICAL. Tahmini stok bitişi: 3 gün.` | — |
| 5 | Orchestrator FREN B (2. Durchlauf) | `⚡ FREN B: Stok analizi tamam → fileSaver'a.` | `agent_active: ceo` |
| 6 | FileSaver | Speicherung | — |
| 7 | Orchestrator FREN 2 | `→ Yargıca` | `agent_active: ceo` |
| 8 | HITL | `👨‍⚖️ Yargıç bekleniyor` | `workflow_complete: AWAITING_HUMAN_APPROVAL` |

### 8.4 Erwartete SupplyChain-Ausgabe

```markdown
## Lagerbestandsanalyse — iPhone 15 Pro Hülle

### Bestandsstatus
- **Aktueller Bestand:** 450 Einheiten
- **Nachbestellpunkt:** 750 Einheiten (5 × täglicher Verbrauch)
- **Verbrauchsrate:** 150 Einheiten/Tag
- **Voraussichtlicher Lagerausfall:** 3 Tage
- **Dringlichkeitsstufe:** 🔴 KRITISCH

### Analyse
Der aktuelle Bestand wird innerhalb von 3 Tagen vollständig aufgebraucht sein.
Selbst eine Luftfracht-Lieferung benötigt mindestens 5–7 Werktage, sodass
ein Ausfallzeitraum (Downtime) von mindestens 2–4 Tagen nahezu unvermeidlich ist.
Eine sofortige Bestellung von 25.000 Einheiten wird empfohlen, um einen
30-tägigen Sicherheitsbestand aufzubauen.

### Empfohlene Bestellmenge
**25.000 Einheiten** — 30 Tage Sicherheitsbestand + aktuelle Unterdeckung

### Bestellanfrage-Entwurf
Sehr geehrte Damen und Herren,
Shenzhen Electronics Co. — Produktionsabteilung,

**DRINGENDE BESTELLANFRAGE — Luftfracht erforderlich**

| Position | Details |
|----------|---------|
| SKU | iPhone 15 Pro Hülle |
| Menge | 25.000 Stück |
| Lieferart | Luftfracht (Air Freight) — innerhalb von 7 Werktagen |
| Grund | Bestand kritisch (3 Tage Restbestand, 150 Stück/Tag Abverkaufsrate) |
| Vertrag | #VENDOR-SZ-2025-042 |

Wir bitten um sofortige Aufnahme dieser Bestellung in den Produktionsplan
und Bestätigung der Lieferfähigkeit bis Ende dieser Woche.

Mit freundlichen Grüßen,
TechNova E-Commerce — Supply Chain Management
```

### 8.5 MongoDB-Validierung
```js
// SupplyChainEvent-Prüfung
db.supplychainevents.findOne({ threadId: "<thread_id>" })
// Erwartet:
//   urgencyLevel: "CRITICAL"
//   daysUntilStockout: 3
//   eventType: "STOCKOUT_IMMINENT"
//   status: "AWAITING_APPROVAL"
//   draftOrderEmail: (nicht leer)
```

---

## 9. TEST 3: PLAN-GUARDRAIL-TEST (Negativtest)

### Szenario
Ein Benutzer mit `free`- oder `pro`-Plan sendet einen `INVOICE_PROCESSING`- oder `STOCK_CHECK`-Befehl.

### Erwartetes Verhalten

**Controller-Ebene** (`agentController.js:43-51`): Der `free`-Plan gibt direkt `403` zurück.

**Orchestrator FREN A/B-Ebene**: Die Agenten `auditor` und `supplyChain` befinden sich in der `allowedAgents`-Liste des `enterprise`-Plans (`plans.js:24-29`). Im `pro`-Plan sind diese Agenten nicht enthalten → `planRules.allowedAgents.includes("auditor")` gibt `false` zurück → LLM-Routing greift → **POST-LLM-PLAN-VALIDIERUNG** (`orchestrator.js:332-335`) fängt ab und leitet an `fileSaver` mit Plan-Upgrade-Nachricht weiter.

### Testschritte
1. Mit einem `pro`-Plan-Konto einloggen
2. `INVOICE_PROCESSING: Testrechnung analysieren` senden
3. Erwartet: Im Orchestrator-Log wird `⚡ FREN A` **nicht** ausgelöst (Auditor nicht autorisiert), LLM-Routing greift, POST-LLM-Guard blockiert und erzeugt eine Plan-Upgrade-Meldung

### Erwartete Ausgabe
```
⚠️ **Plan-Beschränkung:** Diese Funktion ist im **Growth & Revenue**-Paket nicht verfügbar.

Upgrade auf Enterprise erforderlich, um Rechnungsprüfung und Lieferkettenmanagement freizuschalten.
```

---

## 10. TEST 4: FRONTEND-KOMPONENTENVALIDIERUNG

### 10.1 InputZone-Unterregisterkarten-Prüfung
| Prüfung | Erwartetes Ergebnis |
|---------|---------------------|
| Bei Auswahl von `backoffice` müssen 2 Unterregisterkarten erscheinen | „🧾 Rechnungsaudit" + „📦 Supply Chain" |
| Bei Auswahl von „Rechnungsaudit" lautet das `taskPrefix` | `INVOICE_PROCESSING: ` |
| Bei Auswahl von „Supply Chain" lautet das `taskPrefix` | `STOCK_CHECK: ` |
| Beide Unterregisterkarten haben `type: "text"` | Es wird ein Textfeld angezeigt (nicht file/url) |

### 10.2 Agent-Topologie-Validierung
Die folgenden Agenten müssen in der UI bei SSE-Events aufleuchten:
- `ceo` (Orchestrator) — während des FREN-Routings
- `auditor` / `supplyChain` — der ausführende Hauptagent
- `hitl` — bei HITL-Pausierung

### 10.3 HITL-Panel-Prüfung
| Prüfung | Erwartetes Ergebnis |
|---------|---------------------|
| Öffnung des ReportViewers | `workflow_complete`-SSE-Event → `pendingContent` wird gesetzt → rechtes Panel öffnet sich |
| AUTHORIZE-Button | `POST /api/approve` → Publisher → Telegram/Discord |
| OVERRIDE-Button | Revisions-Workflow → Writer-Critic-Schleife startet |

---

## 11. RAG-INTEGRATION — KRITISCHE DETAILS

### RAG im Auditor (`auditorAgent.js:51-65`)

Der Auditor extrahiert den Lieferantennamen mittels Regex aus dem Aufgabentext:

```javascript
// 1. Lieferantenname aus dem Aufgabentext extrahieren
const vendorMatch = taskText.match(/vendor[:\s]+([^\n,]+)/i) ||
                    taskText.match(/tedarikçi[:\s]+([^\n,]+)/i) ||
                    taskText.match(/lieferant[:\s]+([^\n,]+)/i);

// 2. In der RAG-Wissensdatenbank nach dem Vertrag suchen
const ragResults = await searchKnowledge(
    `${vendorName} vereinbarter Preis Vertrag`, clientId, 3
);
```

**Wichtig:** Die Eingabe muss das Format `Lieferant: Shenzhen Electronics Co.` verwenden, damit der Regex `/lieferant[:\s]+([^\n,]+)/i` den Lieferantennamen korrekt erfasst.

### RAG im SupplyChain (`supplyChainAgent.js:55-69`)

```javascript
// SKU oder Produktname für Lieferanteninformationen suchen
const skuMatch = taskText.match(/sku[:\s]+([^\n,\s]+)/i) ||
                 taskText.match(/urun[:\s]+([^\n,]+)/i) ||
                 taskText.match(/produkt[:\s]+([^\n,]+)/i);
```

**Eingabeformat-Empfehlung:** `Produkt: iPhone 15 Pro Hülle` oder `SKU: IPH15-CASE` verwenden, um die RAG-Match-Wahrscheinlichkeit zu erhöhen.

### RAG-Fehlverhalten bei fehlendem Vertrag
Wenn kein passender Eintrag in der Wissensdatenbank gefunden wird, fährt der Auditor mit folgendem Hinweis fort:
```
WISSENSDATENBANK: Keine übereinstimmenden Einträge gefunden.
```
In diesem Fall wird die Rechnung nur allgemein analysiert — ein Vertragsabgleich ist nicht möglich.

---

## 12. SSE-EVENT-ABLAUF (Frontend-Monitoring)

### Erwartete SSE-Event-Sequenz für beide Tests

**Test 1 — Rechnungsprüfung:**
```
data: {"type":"agent_active","agent":"ceo"}        ← Orchestrator denkt nach
data: {"type":"agent_active","agent":"auditor"}     ← Auditor arbeitet
data: {"type":"agent_active","agent":"ceo"}        ← Orchestrator hat entschieden
data: {"type":"agent_active","agent":"hitl"}        ← HITL-Tor
data: {"type":"workflow_complete","status":"AWAITING_HUMAN_APPROVAL","pendingContent":"..."}
```

**Test 2 — Lieferkette:**
```
data: {"type":"agent_active","agent":"ceo"}            ← Orchestrator denkt nach
data: {"type":"agent_active","agent":"supplyChain"}    ← Planer arbeitet
data: {"type":"agent_active","agent":"ceo"}            ← Orchestrator hat entschieden
data: {"type":"agent_active","agent":"hitl"}            ← HITL-Tor
data: {"type":"workflow_complete","status":"AWAITING_HUMAN_APPROVAL","pendingContent":"..."}
```

### Frontend-Zustandsänderungen (agent-store.ts)
| Zustandsfeld | Vor dem Test | Während des Tests | Nach HITL |
|-------------|-------------|-------------------|-----------|
| `workflowPhase` | `"IDLE"` | `"RUNNING"` | `"AWAITING_APPROVAL"` |
| `agentStatuses.auditor` | `"IDLE"` | `"ACTIVE"` | `"SUCCESS"` |
| `agentStatuses.supplyChain` | `"IDLE"` | `"ACTIVE"` | `"SUCCESS"` |
| `pendingContent` | `""` | `""` | Berichtsinhalt (Markdown) |
| `activeAgent` | `null` | `"auditor"` / `"supplyChain"` | `null` |

---

## 13. VERGLEICH: ORIGINALPLAN VS. SYSTEMVERHALTEN

| Erwartung im Originalplan | Tatsächliches Systemverhalten | Erläuterung |
|--------------------------|------------------------------|-------------|
| Writer-Agent wird nach dem Auditor aktiv | Writer ist **nicht beteiligt** — der Auditor erzeugt seinen `finalContent` selbst | FREN-A-Route: `auditor → fileSaver → HITL`. Writer wird übersprungen. |
| Prefix `AUDIT_INVOICE:` | System verwendet Prefix `INVOICE_PROCESSING:` | Die UI-Unterregisterkarte stellt `INVOICE_PROCESSING: ` voran — allerdings erkennt die FREN-A-Regex auch `AUDIT_INVOICE` |
| Prefix `SUPPLY_ALERT:` | System verwendet Prefix `STOCK_CHECK:` | Die UI-Unterregisterkarte stellt `STOCK_CHECK: ` voran — allerdings erkennt die FREN-B-Regex auch `SUPPLY_ALERT` |
| Schaltfläche „REDDET VE İHTAR GÖNDER" (Ablehnen und Abmahnung senden) | System verwendet `AUTHORIZE` / `OVERRIDE` | `POST /api/approve` → `action: "approve"` oder `"reject"` + Feedback |
| E-Mail fliegt direkt an den Lieferanten via n8n | Publisher → ActionQueue → actionWorkerService → n8n-Webhook | Indirekt: HITL-Genehmigung → Publisher → `N8N_PUBLISH_WEBHOOK` |
| Mock-Data-Dashboard (Recharts) | Aktuelles CFO-Dashboard (`/api/finance/summary`) | KPI-Karten und Diagramme erfordern separate Frontend-Entwicklung |
| SupplyChain-Agent → Writer erstellt die Bestellanfrage | SupplyChain-Agent erstellt `draftOrderEmail` + `finalContent` selbst | Architekturentscheidung: kein Writer in der Supply-Route |

---

## 14. OPTIMIERTE EINGABEFORMATE FÜR TESTS

### Test 1 — Rechnungsprüfung (RAG-kompatibles Format)
```
Lieferant: Shenzhen Electronics Co.
Produkt: 10.000 x iPhone 15 Pro Hüllen
Stückpreis: 2,15 $ (Gesamt: 21.500 $)
Zusatzkosten: 1.200 $ (Internationale Frachtkosten)
Gesamtbetrag: 22.700 $
```
> Die Unterregisterkarte fügt automatisch das Prefix `INVOICE_PROCESSING: ` hinzu.

### Test 2 — Bestandskrise (regex-kompatibles Format)
```
Lagerbestand iPhone 15 Pro Hüllen auf kritischem Niveau.
Aktueller Bestand: 450 Stück.
Tägliche Verkaufsrate (Velocity): 150 Stück/Tag.
Geschätzte Restlaufzeit: 3 Tage.
Lieferant: Shenzhen Electronics Co.
Aktion: Sofortige Produktionsanweisung an die Fabrik in China — Lieferung per Luftfracht anfordern.
```
> Die Unterregisterkarte fügt automatisch das Prefix `STOCK_CHECK: ` hinzu.

---

## 15. QA-CHECKLISTE

| Nr. | Prüfpunkt | Erwartetes Ergebnis | FREN / Agent |
|-----|-----------|---------------------|-------------|
| 1 | Wird der `INVOICE_PROCESSING`-Befehl an den richtigen Agenten weitergeleitet? | Konsole: `⚡ FREN A → auditor'a yönlendiriliyor` | FREN A |
| 2 | Hat der Auditor Vertragsinformationen aus RAG abgerufen? | Konsole: `RAG: Shenzhen Electronics Co. için X kayıt bulundu` | auditor |
| 3 | Wurde die Stückpreisabweichung berechnet? | Bericht: `2,15 $ vs. 2,00 $ → 7,5 % Anstieg` | auditor |
| 4 | Wurden vertragswidrige Frachtkosten erkannt? | Bericht: `Anomalie erkannt: ✅ JA` | auditor |
| 5 | Wurde die Gesamtüberberechnung korrekt berechnet? | `1.500 $ + 1.200 $ = 2.700 $` | auditor |
| 6 | Wurde der InvoiceAudit-MongoDB-Eintrag erstellt? | `anomalyDetected: true, ragMatchFound: true` | auditor |
| 7 | Hat der FileSaver den Bericht gespeichert? | `fileSaved: true` → State | fileSaver |
| 8 | Befindet sich der Bericht im HITL-Panel im Status AWAITING_APPROVAL? | ReportViewer geöffnet, AUTHORIZE/OVERRIDE-Buttons sichtbar | FREN 2 |
| 9 | Wird der `STOCK_CHECK`-Befehl an den richtigen Agenten weitergeleitet? | Konsole: `⚡ FREN B → supplyChain'e yönlendiriliyor` | FREN B |
| 10 | Hat SupplyChain die Dringlichkeitsstufe korrekt bestimmt? | `urgencyLevel: "CRITICAL"` (3 Tage ≤ Schwellenwert) | supplyChain |
| 11 | Wurde ein Bestellanfrage-Entwurf erstellt? | Feld `draftOrderEmail` ist befüllt | supplyChain |
| 12 | Wurde der SupplyChainEvent-MongoDB-Eintrag erstellt? | `eventType: "STOCKOUT_IMMINENT"` | supplyChain |
| 13 | Wird ein Nicht-Enterprise-Benutzer blockiert (FREN 0 ausgelöst)? | `403` oder Plan-Upgrade-Meldung | FREN 0 |
| 14 | Funktioniert der Publisher nach AUTHORIZE? | Benachrichtigung an Telegram/Discord wird gesendet | publisher |
| 15 | Ist die SSE-Event-Reihenfolge korrekt? | `ceo → auditor/supplyChain → ceo → hitl → workflow_complete` | runner.js |
| 16 | Wurden WorkflowSnapshot-Einträge (Zeitmaschine) geschrieben? | Für jeden Knoten ein Snapshot in MongoDB | runner.js |

---

## 16. KRITISCHE HINWEISE (Systemspezifisch)

### 16.1 Task-Prefix-Unterschied
Im Originaltestplan wurde `AUDIT_INVOICE:` verwendet, die UI-Unterregisterkarte fügt jedoch `INVOICE_PROCESSING:` hinzu. Beide Präfixe werden durch die FREN-A-Regex erkannt (`/INVOICE_PROCESSING|FATURA_DENETIM|AUDIT_INVOICE/i`) — daher funktionieren beide. **Beim Testen über die Benutzeroberfläche wird das Präfix automatisch hinzugefügt** — nicht manuell eingeben.

### 16.2 RAG-Datenpflicht
Der `searchKnowledge()`-Aufruf des Auditors (`auditorAgent.js:53-63`) extrahiert den Lieferantennamen per Regex (`/lieferant[:\s]+([^\n,]+)/i`). Die Eingabezeile „Lieferant: Shenzhen Electronics Co." wird durch diesen Regex erfasst. **Wenn keine Vertragsdaten in der RAG-Datenbank vorhanden sind**, arbeitet der Auditor dennoch weiter, gibt aber „Wissensdatenbank: Keine übereinstimmenden Einträge gefunden" aus — ein Vertragsabgleich ist dann nicht möglich, es wird nur eine allgemeine Analyse erstellt.

### 16.3 Writer-Agent ist in diesem Ablauf NICHT beteiligt
Im Originaltestplan heißt es „der Writer-Agent schreibt einen CFO-Bericht", doch im tatsächlichen System setzen die Agenten Auditor und SupplyChain `finalContent` selbst (`auditorAgent.js:127`, `supplyChainAgent.js:139`). Der Orchestrator FREN A/B leitet nicht zum Writer weiter — er geht direkt zum `fileSaver`. Dies ist kein Bug, sondern eine bewusste Architekturentscheidung.

### 16.4 MongoDB-Vektorindex
Für die RAG-Funktion muss in Atlas ein `vector_index` existieren (Gemini `gemini-embedding-001`, 1536 Dimensionen).

### 16.5 Auditor-Regex für Lieferantenerkennung
Der Auditor unterstützt drei Sprachen zur Lieferantenerkennung:
- Englisch: `vendor[:\s]+`
- Türkisch: `tedarikçi[:\s]+`
- Deutsch: `lieferant[:\s]+`

Die Eingabe sollte eines dieser Formate verwenden, damit die RAG-Suche ausgelöst wird.

### 16.6 SupplyChain-Regex für Produkterkennung
Der SupplyChain-Agent unterstützt drei Formate:
- `sku[:\s]+` → SKU-Code
- `urun[:\s]+` → Produktname (Türkisch)
- `produkt[:\s]+` → Produktname (Deutsch)

---

## 17. ZUSAMMENFASSUNG

Dieser Testplan validiert die folgenden Fähigkeiten des **`backoffice`**-Mega-Departments (Finance & Operations) des Agent-Matrix-Systems:

| Fähigkeit | Beschreibung |
|-----------|--------------|
| **FREN A/B — Deterministisches Routing** | LLM-freies, regex-basiertes Agenten-Routing mit null Token-Kosten |
| **RAG-Integration** | Abruf von Vertragsdaten aus der Vektordatenbank für mathematischen Abgleich |
| **Auditor (Agent 13)** | Erkennung von Rechnungsanomalien, Berechnung von Stückpreisabweichungen |
| **SupplyChain (Agent 14)** | Analyse der Bestandsreichweite, Dringlichkeitsklassifizierung, Bestellanfrage |
| **HITL-Gateway** | Graph-Pausierung mit `interruptBefore: ["human_approval"]` und menschliche Genehmigung |
| **Plan-Guardrail (FREN 0)** | Blockierung von Nicht-Enterprise-Benutzern |
| **SSE-Echtzeit-Streaming** | Sofortige Übertragung von Agentenaktivierungen an das Frontend |

**Offener Punkt:** Das im Originaltestplan beschriebene **Dashboard (Finanzvisualisierung)** — Test 3 mit KPI-Karten und Recharts-Diagrammen — ist derzeit im Frontend nicht implementiert. Das `CfoDashboard`-Panel ist nicht an die Backend-API (`/api/finance/summary`) angebunden.

---

**Testplan-Datum:** 05.04.2026
**Systemversion:** AI Orchestra / Agent-Matrix
**Testumgebung:** localhost (Server: 3000, Frontend: 3002)
