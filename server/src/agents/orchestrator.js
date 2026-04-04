import { ChatBedrockConverse } from "@langchain/aws";
import { z } from "zod";
import { trackLLMCostFromStrings } from "../services/costTracker.js";
import { getEnabledTools } from "../skills/index.js";
import { getPlanRules } from "../config/plans.js";

const llm = new ChatBedrockConverse({
    model: "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const routingSchema = z.object({
    nextAgent: z.enum(["scraper", "analyzer", "innovator", "writer", "critic", "fileSaver", "human_approval", "publisher", "architect", "salesRep", "auditor", "supplyChain", "END"])
        .describe("Welcher Agent als Nächstes aufgerufen wird oder ob der Prozess beendet wird (END)."),
    reason: z.string().describe("Eine kurze Erklärung auf Deutsch.")
});

export async function orchestratorNode(state, config) {
    const tenantConfig = config?.configurable?.tenantConfig;
    const clientPlan = config?.configurable?.plan || "free";
    const planRules = getPlanRules(clientPlan);

    const tools = getEnabledTools(tenantConfig);
    const agentWithTools = tools.length > 0 ? llm.bindTools(tools) : llm;
    const llmWithStructuredOutput = agentWithTools.withStructuredOutput(routingSchema, { name: "route_task" });

    console.log(`👨‍💼 Orkestra Şefi (Ajan 7) düşünüyor... (Plan: ${clientPlan.toUpperCase()}, Deneme: ${state.revisionCount}) [Araç: ${tools.length}]`);

    // ==========================================
    // 💼 FREN S: SATIŞ ROTASI (LLM'den ÖNCE — deterministik)
    // HOT_LEAD_FOLLOWUP veya SALES_NEGOTIATION içeren task'lar salesRep'e gider.
    // Müzakere turu 3'e ulaşırsa hard stop: fileSaver'a zorla.
    // ==========================================
    const taskText_sales = state.task || "";
    const isSalesTask = /HOT_LEAD_FOLLOWUP|SALES_NEGOTIATION/i.test(taskText_sales);

    if (isSalesTask) {
        // Hard stop: 3 tur sonra savaş biter
        if (state.negotiationRound >= 3) {
            console.log("   -> ⚡ SATIŞ HARD STOP: Maksimum müzakere turuna ulaşıldı (3). fileSaver'a yönlendiriliyor.");
            return { nextAgent: "fileSaver" };
        }
        // salesRep enterprise planında mevcut
        if (planRules.allowedAgents.includes("salesRep")) {
            console.log(`   -> ⚡ SATIŞ ROTASI: Tur ${state.negotiationRound + 1} → salesRep`);
            return { nextAgent: "salesRep" };
        }
        // Enterprise değilse bilgi maili üretmek için writer'a yönlendir
        console.log("   -> ⚡ SATIŞ ROTASI (plan yetersiz): Writer standart teklif üretecek.");
        return { nextAgent: "writer" };
    }

    // ==========================================
    // 🧾 FREN A: DENETÇİ ROTASI — INVOICE_PROCESSING (LLM'den ÖNCE)
    // ==========================================
    const taskText_audit = state.task || "";
    const isAuditTask = /INVOICE_PROCESSING|FATURA_DENETIM|AUDIT_INVOICE/i.test(taskText_audit);

    if (isAuditTask) {
        // Denetçi çalıştı ve içerik var → fileSaver'a
        if (state.invoiceAnalysis && !state.fileSaved) {
            console.log("   -> ⚡ FREN A: Fatura analizi tamam → fileSaver'a.");
            return { nextAgent: "fileSaver" };
        }
        // Denetçi henüz çalışmadı → auditor'a
        if (!state.invoiceAnalysis && planRules.allowedAgents.includes("auditor")) {
            console.log("   -> ⚡ FREN A: Fatura görevi → auditor'a yönlendiriliyor.");
            return { nextAgent: "auditor" };
        }
    }

    // ==========================================
    // 📦 FREN B: TEDARİK ZİNCİRİ ROTASI — STOCK_CHECK (LLM'den ÖNCE)
    // ==========================================
    const taskText_supply = state.task || "";
    const isSupplyTask = /STOCK_CHECK|STOK_KONTROL|SUPPLY_ALERT|INVENTORY_LOW/i.test(taskText_supply);

    if (isSupplyTask) {
        // Planlayıcı çalıştı ve içerik var → fileSaver'a
        if (state.stockAlerts && !state.fileSaved) {
            console.log("   -> ⚡ FREN B: Stok analizi tamam → fileSaver'a.");
            return { nextAgent: "fileSaver" };
        }
        // Planlayıcı henüz çalışmadı → supplyChain'e
        if (!state.stockAlerts && planRules.allowedAgents.includes("supplyChain")) {
            console.log("   -> ⚡ FREN B: Stok görevi → supplyChain'e yönlendiriliyor.");
            return { nextAgent: "supplyChain" };
        }
    }

    // ==========================================
    // 📄 FREN R: RFP / İHALE YANITLAYICI — RFP_RESPONSE (LLM'den ÖNCE)
    // Scraper ve Analyzer atlanır; RAG'daki geçmiş teklif dosyaları üzerinden
    // doğrudan Writer → Critic → fileSaver akışı çalışır.
    // ==========================================
    const isRfpTask = /RFP_RESPONSE|IHALE_CEVAP|TENDER_RESPONSE/i.test(state.task || "");
    if (isRfpTask) {
        if (!state.finalContent && !state.fileSaved) {
            if (planRules.allowedAgents.includes("writer")) {
                console.log("   -> ⚡ FREN R: RFP görevi → writer'a (RAG destekli, scraper/analyzer atlanıyor).");
                return { nextAgent: "writer" };
            }
        }
    }

    // ==========================================
    // 🎯 FREN C: B2B COLD OUTREACH — COLD_OUTREACH (LLM'den ÖNCE)
    // Hedef şirketi scrape et → direkt Writer'a gönder.
    // Analyzer ve Innovator atlanır (genel araştırma değil, kişisel mail).
    // ==========================================
    const isOutreachTask = /COLD_OUTREACH|B2B_OUTREACH|SOGUK_SATIS/i.test(state.task || "");
    if (isOutreachTask) {
        if (!state.scrapedData && !state.fileSaved) {
            console.log("   -> ⚡ FREN C: B2B Outreach → scraper'a (hedef şirket araştırılıyor).");
            return { nextAgent: "scraper" };
        }
        if (state.scrapedData && !state.finalContent && !state.fileSaved) {
            console.log("   -> ⚡ FREN C: Hedef araştırıldı → writer'a (analyzer/innovator atlanıyor).");
            return { nextAgent: "writer" };
        }
        if (state.finalContent && !state.fileSaved) {
            console.log("   -> ⚡ FREN C: Outreach maili hazır → fileSaver'a yönlendiriliyor.");
            return { nextAgent: "fileSaver" };
        }
    }

    // ==========================================
    // 🧪 FREN T: İŞ MODELİ STRES TESTİ — BUSINESS_STRESS_TEST (LLM'den ÖNCE)
    // PDF pitch deck yüklendi → Analyzer (mantık hatası bul) → Innovator (pivot öner) → Writer
    // Scraper atlanır; FREN 4a/4b sonraki adımları yönetir.
    // ==========================================
    const isStressTestTask = /BUSINESS_STRESS_TEST|IS_MODELI_TEST|PIVOT_ADVISOR/i.test(state.task || "");
    if (isStressTestTask) {
        if (!state.analysisReport && !state.fileSaved) {
            if (planRules.allowedAgents.includes("analyzer")) {
                console.log("   -> ⚡ FREN T: Stres Testi → analyzer'a (scraper atlanıyor, RAG destekli analiz).");
                return { nextAgent: "analyzer" };
            }
        }
    }

    // ==========================================
    // 🛑 FREN 0: SaaS PLAN GUARDRAIL (LLM'den ÖNCE — sıfır maliyet)
    // Müşteri yetki dışı bir ajanı talep ediyorsa anında reddet.
    // Controller seviyesinde zaten engellenmiş olmalı, bu ikinci savunma hattıdır.
    // ==========================================
    const taskText_early = state.task || "";
    const requestsAnalyzer  = /\b(analiz|analysis|markt|competitor|pazar)\b/i.test(taskText_early);
    const requestsInnovator = /\b(innovation|inovasyon|innovator|vizyon)\b/i.test(taskText_early);
    const requestsArchitect = /\b(code|blueprint|architect|software|app|dashboard)\b/i.test(taskText_early);

    const planBlockedMap = {
        free: requestsAnalyzer || requestsInnovator || requestsArchitect,
        pro:  requestsArchitect,
    };

    if (planBlockedMap[clientPlan]) {
        console.log(`   -> 🛑 FREN 0 (PLAN GUARDRAIL): '${clientPlan}' planı bu işlemi çalıştıramaz. Yükseltme mesajı üretiliyor.`);
        return {
            finalContent: `⚠️ **Plan Sınırı:** Bu işlem **${planRules.label}** paketinde mevcut değil.\n\nErişmek istediğiniz özellik için planınızı yükseltin.`,
            nextAgent: "fileSaver",
        };
    }

    // ==========================================
    // 🛑 1. SERT MÜHENDİSLİK FRENLERİ (Sonsuz Döngü Kırıcılar)
    // Bu kurallar LLM'den önce çalışır ve inatlaşmayı kesin olarak önler.
    // ==========================================

    // FREN 1: Yayın tamamlandıysa → END (tekrar döngüye girmesin)
    if (state.isPublished === true) {
        console.log("   -> ⚡ SİSTEM MÜDAHALESİ: Yayın tamamlandı → END.");
        return { nextAgent: "END" };
    }

    // FREN 2: Dosya kaydedildi ve yargıç henüz bakmadı → doğrudan HITL'e git (LLM'e bırakma!)
    if (state.fileSaved === true && (state.humanApproval === null || state.humanApproval === undefined)) {
        console.log("   -> ⚡ SİSTEM MÜDAHALESİ: Dosya kaydedildi → doğrudan Yargıca gidiliyor.");
        return { nextAgent: "human_approval" };
    }

    // FREN 3: Genel Döngü Sınırı (Writer↔Critic döngüsü 5 kez dönerse fişi çek)
    if (state.revisionCount >= 5) {
        console.log("   -> ⚡ SİSTEM MÜDAHALESİ: Maksimum deneme sınırına ulaşıldı! Yargıç onayına zorlanıyor.");
        return { nextAgent: "human_approval" };
    }

    // ==========================================
    // 🛑 FREN 4 & 5: Research-Track Döngü Kırıcı
    // LLM bazen gerekçesinde "writer" der ama structured output olarak "analyzer" döner.
    // Bu deterministik kurallar LLM tutarsızlığını tamamen engeller.
    // ==========================================
    const taskText = state.task || "";
    const isInnovationRadar = /INNOVATION_RADAR/i.test(taskText);
    const isSocialMedia    = /TWITTER|LINKEDIN|INSTAGRAM|YOUTUBE|TIKTOK|EMAIL_CAMPAIGN/i.test(taskText);
    const isCodingProject  = /\b(Code|Dashboard|Software|App|Blueprint|Next\.js)\b/i.test(taskText);
    const isRfpTrack         = /RFP_RESPONSE|IHALE_CEVAP|TENDER_RESPONSE/i.test(taskText);
    const isOutreachTrack    = /COLD_OUTREACH|B2B_OUTREACH|SOGUK_SATIS/i.test(taskText);
    const isStressTestTrack  = /BUSINESS_STRESS_TEST|IS_MODELI_TEST|PIVOT_ADVISOR/i.test(taskText);
    // TREND_RADAR bilinçli olarak isResearchTrack içine dahil edilir (Scraper → Analyzer → Innovator → Writer tam döngüsü).
    const isResearchTrack    = !isInnovationRadar && !isSocialMedia && !isCodingProject && !isRfpTrack && !isOutreachTrack && !isStressTestTrack;

    // FREN 4a: Analiz tamamlandı, Vizyoner henüz çalışmadı → Innovator'a
    // (Research track + Business Stress Test — her ikisi de Analyzer→Innovator→Writer izler)
    if ((isResearchTrack || isStressTestTrack) && state.analysisReport && !state.innovatorInsight && !state.finalContent && !state.fileSaved) {
        console.log("   -> ⚡ FREN 4a: Analiz tamam, Vizyoner bekliyor → Innovator'a.");
        return { nextAgent: "innovator" };
    }

    // FREN 4b: Hem analiz hem vizyoner tamam, içerik henüz yok → Writer'a
    if ((isResearchTrack || isStressTestTrack) && state.analysisReport && state.innovatorInsight && !state.finalContent && !state.fileSaved) {
        console.log("   -> ⚡ FREN 4b: Analiz + Vizyoner tamam, içerik yok → doğrudan Writer'a.");
        return { nextAgent: "writer" };
    }

    // FREN 5: Scraping tamamlandı, analiz eksik, içerik yok → doğrudan Analyzer
    if (isResearchTrack && state.scrapedData && !state.analysisReport && !state.finalContent) {
        console.log("   -> ⚡ FREN 5: Scraping tamam, analiz eksik → doğrudan Analyzer'a.");
        return { nextAgent: "analyzer" };
    }

    // FREN 6: Revisions sınırı — Critic reddi bile olsa revisionCount >= 3 ise fileSaver
    if (state.finalContent && state.revisionCount >= 3 && !state.fileSaved) {
        console.log("   -> ⚡ FREN 6: Revizyon sınırına ulaşıldı (>= 3) → fileSaver'a zorlanıyor.");
        return { nextAgent: "fileSaver" };
    }


    // ==========================================
    // 🧠 2. LLM YÖNLENDİRMESİ (Normal Akış)
    // ==========================================
    const kritikerStatus = state.isApproved ? "FREIGEGEBEN" : (state.criticFeedback ? "ABGELEHNT_MIT_FEEDBACK" : "NOCH_NICHT_GEPRÜFT");
    const richterStatus = state.humanApproval === true ? "FREIGEGEBEN" : (state.humanApproval === false ? "ABGELEHNT_MIT_FEEDBACK" : "NOCH_NICHT_GEPRÜFT");

    const prompt = `Sie sind ein deterministischer State-Machine-Router für ein KI-Agenten-Team.
    Sie müssen Aufgaben AUSSCHLIESSLICH in der folgenden REIHENFOLGE ausführen.

    ⚠️ WICHTIG — SaaS-PLAN-BESCHRÄNKUNG:
    Aktueller Kundenplan: [${clientPlan.toUpperCase()}] (${planRules.label})
    ERLAUBTE AGENTEN für diesen Plan: ${planRules.allowedAgents.join(", ")}
    Maximale Revisionen: ${planRules.maxRevisions}
    Sie dürfen NUR Agenten aus der obigen Liste auswählen. Wählen Sie niemals einen nicht genehmigten Agenten.

    Aktueller Status (STATE):
    - Aufgabe (Task): "${state.task}"
    - Scraping-Daten vorhanden: ${state.scrapedData ? "JA" : "NEIN"}
    - Analysebericht vorhanden: ${state.analysisReport ? "JA" : "NEIN"}
    - Visionäre Alternative (Innovator) vorhanden: ${state.innovatorInsight ? "JA" : "NEIN"}
    - Autorentext (Final Content) vorhanden: ${state.finalContent ? "JA" : "NEIN"}
    - Kritiker-Status: ${kritikerStatus}
    - Revisions-Zähler (Versuche): ${state.revisionCount}
    - Datei gespeichert: ${state.fileSaved ? "JA" : "NEIN"}
    - Richter-Status: ${richterStatus}
    - An Kanal gesendet: ${state.isPublished ? "JA" : "NEIN"}
    - Rechnungsanalyse (Auditor) vorhanden: ${state.invoiceAnalysis ? "JA" : "NEIN"}
    - Bestandsalarm (Supply Chain) vorhanden: ${state.stockAlerts ? "JA" : "NEIN"}

    STRIKTE ROUTING-REGELN (Gehen Sie diese von oben nach unten durch!):

    // 🧾 ROUTE A: RECHNUNGSPRÜFUNG / BUCHHALTUNG (Audit-Track)
    Regel A.1: Wenn die Aufgabe "INVOICE_PROCESSING", "FATURA_DENETIM" oder "AUDIT_INVOICE" enthält UND invoiceAnalysis "NEIN" ist -> wähle "auditor". (Fatura önce denetçiye!)
    Regel A.2: Wenn die Aufgabe "INVOICE_PROCESSING" enthält UND invoiceAnalysis "JA" ist UND Datei gespeichert "NEIN" -> wähle "fileSaver".

    // 📦 ROUTE B: LIEFERKETTE / LAGERBESTAND (Supply-Track)
    Regel B.1: Wenn die Aufgabe "STOCK_CHECK", "STOK_KONTROL", "SUPPLY_ALERT" oder "INVENTORY_LOW" enthält UND stockAlerts "NEIN" ist -> wähle "supplyChain". (Stok önce planlayıcıya!)
    Regel B.2: Wenn die Aufgabe "STOCK_CHECK" enthält UND stockAlerts "JA" ist UND Datei gespeichert "NEIN" -> wähle "fileSaver".

    // 💼 ROUTE S: VERTRIEB / SALES (Sales-Track)
    Regel S.1: Wenn die Aufgabe "HOT_LEAD_FOLLOWUP" oder "SALES_NEGOTIATION" enthält UND negotiationRound < 3 -> wähle "salesRep". (Immer Vertriebsagent für Verhandlungen!)
    Regel S.2: Wenn die Aufgabe "HOT_LEAD_FOLLOWUP" oder "SALES_NEGOTIATION" enthält UND negotiationRound >= 3 -> wähle "fileSaver". (Verhandlung beendet — kein weiterer Versuch!)

    // 📄 ROUTE R: RFP / AUSSCHREIBUNGSANTWORT (RFP-Track)
    Regel R.1: Wenn die Aufgabe "RFP_RESPONSE", "IHALE_CEVAP" oder "TENDER_RESPONSE" enthält UND Autorentext "NEIN" ist -> wähle "writer". (RAG-basiert — kein Scraping nötig!)
    Regel R.2: Wenn die Aufgabe "RFP_RESPONSE" enthält UND Autorentext "JA" ist UND Datei gespeichert "NEIN" ist -> wähle "fileSaver".

    // 🎯 ROUTE C: B2B COLD OUTREACH (Outreach-Track)
    Regel C.1: Wenn die Aufgabe "COLD_OUTREACH", "B2B_OUTREACH" oder "SOGUK_SATIS" enthält UND Scraping-Daten "NEIN" sind -> wähle "scraper". (Erst Zielunternehmen recherchieren!)
    Regel C.2: Wenn die Aufgabe "COLD_OUTREACH" enthält UND Scraping-Daten "JA" sind UND Autorentext "NEIN" ist -> wähle "writer". (Direkt zum Writer — Analyzer/Innovator überspringen!)

    // 🧪 ROUTE T: BUSINESS STRESS TEST (Stres Testi — Scraper atlanır!)
    Regel T.1: Wenn die Aufgabe "BUSINESS_STRESS_TEST" enthält UND Analysebericht "NEIN" ist -> wähle "analyzer". (Direkt zum Analyzer — kein Scraping!)
    Regel T.2: Wenn die Aufgabe "BUSINESS_STRESS_TEST" enthält UND Analysebericht "JA" ist UND Visionäre Alternative "NEIN" ist -> wähle "innovator". (Pivot-Vorschläge generieren!)
    Regel T.3: Wenn die Aufgabe "BUSINESS_STRESS_TEST" enthält UND Analysebericht "JA" ist UND Visionäre Alternative "JA" ist UND Autorentext "NEIN" ist -> wähle "writer". (Final-Stressbericht schreiben!)

    // 📡 ROUTE TR: TREND RADAR (Vollständiger Research-Track)
    Regel TR.1: Wenn die Aufgabe "TREND_RADAR" enthält UND Scraping-Daten "NEIN" sind -> wähle "scraper". (Aktuelle Trends aus Reddit/Twitter/TechCrunch sammeln!)
    Regel TR.2: Wenn die Aufgabe "TREND_RADAR" enthält UND Scraping-Daten "JA" sind UND Analysebericht "NEIN" ist -> wähle "analyzer". (Meta-Trend aus den Rohdaten extrahieren!)
    Regel TR.3: Wenn die Aufgabe "TREND_RADAR" enthält UND Analysebericht "JA" ist UND Visionäre Alternative "NEIN" ist -> wähle "innovator". (3 neue Produktkonzepte entwickeln!)
    Regel TR.4: Wenn die Aufgabe "TREND_RADAR" enthält UND Visionäre Alternative "JA" ist UND Autorentext "NEIN" ist -> wähle "writer". (Trend-Report schreiben!)

    // 🔬 ROUTE 0: F&E / INNOVATION (R&D-Track)
    Regel 0.1: Wenn die Aufgabe das Wort "INNOVATION_RADAR" enthält UND Scraping-Daten "NEIN" sind -> wähle "scraper". (Zuerst News suchen!)
    Regel 0.2: Wenn die Aufgabe das Wort "INNOVATION_RADAR" enthält UND Scraping-Daten "JA" sind UND Autorentext "NEIN" ist -> wähle "architect". (Dann Blueprint aus den News erstellen!)

    // 📣 ROUTE 0.3: SOCIAL MEDIA / WACHSTUM (Twitter, LinkedIn, Instagram, YouTube, TikTok, Email Track)
    Regel 0.3: Wenn die Aufgabe das Wort "TWITTER", "LINKEDIN", "INSTAGRAM", "YOUTUBE", "TIKTOK" oder "EMAIL_CAMPAIGN" enthält UND Scraping-Daten "NEIN" sind -> wähle "scraper". (Erst aktuelle Daten für Social-Media-Inhalte sammeln!)
    Regel 0.4: Wenn die Aufgabe das Wort "TWITTER", "LINKEDIN", "INSTAGRAM", "YOUTUBE", "TIKTOK" oder "EMAIL_CAMPAIGN" enthält UND Scraping-Daten "JA" sind UND Autorentext "NEIN" ist -> wähle "writer". (Direkt zum Writer! Kein Analyzer für Social-Media-Content nötig.)
    
    // 🎯 ROUTE 1: SOFTWARE & CODING (CTO-Track)
    Regel 1: WENN in der Aufgabe Wörter wie "Code", "Dashboard", "Software", "App", "Blueprint" oder "Next.js" vorkommen UND der Autorentext (Final Content) "NEIN" ist UND es KEIN "INNOVATION_RADAR" ist -> WÄHLEN SIE ZWINGEND "architect".
    
    // 📊 ROUTE 2: RECHERCHE & BERICHTE (Research-Track)
    Regel 2: Wenn es KEIN Software-Projekt ist UND Scraping-Daten "NEIN" sind -> wählen Sie "scraper".
    Regel 3: Wenn Scraping-Daten "JA" sind, aber Analysebericht "NEIN" ist -> wählen Sie "analyzer".
    Regel 3.5: Wenn Analysebericht "JA" ist UND Visionäre Alternative "NEIN" ist UND Autorentext "NEIN" ist -> wählen Sie "innovator". (Der Visionary muss IMMER nach dem Analyzer kommen!)
    Regel 4: Wenn Analysebericht "JA" ist UND Visionäre Alternative "JA" ist UND Autorentext "NEIN" ist -> wählen Sie "writer".
    
    // 🛑 GEMEINSAME REGELN (Eskalation, Speichern, Richter)
    Regel 5: Wenn Autorentext "JA" ist, Revisions-Zähler >= 3 und Datei gespeichert "NEIN" -> wählen Sie "fileSaver".
    Regel 6: Wenn Autorentext "JA" ist, Revisions-Zähler < 3, Kritiker-Status "NOCH_NICHT_GEPRÜFT" und Datei gespeichert "NEIN" -> wählen Sie "critic".
    Regel 7: Wenn Autorentext "JA" ist, Revisions-Zähler < 3, Kritiker-Status "ABGELEHNT_MIT_FEEDBACK" und Datei gespeichert "NEIN" -> wählen Sie "writer".
    Regel 8: Wenn Autorentext "JA" ist, Kritiker-Status "FREIGEGEBEN" und Datei gespeichert "NEIN" -> wählen Sie "fileSaver".
    Regel 9: Wenn Datei gespeichert "JA" und Richter-Status "NOCH_NICHT_GEPRÜFT" -> wählen Sie "human_approval".
    Regel 10: Wenn Datei gespeichert "JA" und Richter-Status "ABGELEHNT_MIT_FEEDBACK" -> wählen Sie "writer".
    Regel 11: Wenn Datei gespeichert "JA", Richter-Status "FREIGEGEBEN" und An Kanal gesendet "NEIN" -> wählen Sie "publisher".
    Regel 12: NUR WENN An Kanal gesendet "JA" ist -> wählen Sie "END".`;

    const response = await llmWithStructuredOutput.invoke(prompt);

    // 💰 CFO'ya maliyeti bildir
    trackLLMCostFromStrings(prompt, JSON.stringify(response), "ORCHESTRATOR", state.threadId || "SYSTEM", config?.configurable?.tenantConfig?.clientId || "default").catch(() => { });

    console.log(`   -> Şefin Kararı: ${response.nextAgent}`);
    if (response.reason) console.log(`   -> Gerekçe: ${response.reason}\n`);

    // 🛡️ POST-LLM PLAN DOĞRULAMASI (İkinci savunma hattı)
    // LLM talimatları görmezden gelerek yetkisiz bir ajan seçtiyse burada engelle.
    if (response.nextAgent !== "END" && !planRules.allowedAgents.includes(response.nextAgent)) {
        console.log(`   -> ⚠️ POST-LLM PLAN İHLALİ: LLM '${response.nextAgent}' seçti ama '${clientPlan}' planında yasak. fileSaver'a yönlendiriliyor.`);
        return { nextAgent: "fileSaver" };
    }

    return { nextAgent: response.nextAgent };
}