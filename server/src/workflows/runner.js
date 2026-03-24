import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { app } from "./graph.js";
import { Report } from "../models/Report.js";
import { CampaignDraft } from "../models/CampaignDraft.js";
import { generateCampaign } from "../agents/cmoAgent.js";

// 📡 SSE Event Bus — her threadId için agent geçişlerini yayar
export const agentEventBus = new EventEmitter();
agentEventBus.setMaxListeners(50);

// 🛰️ System Event Bus — Admin God Mode: tüm tenant event'lerini global yayınlar
export const systemEventBus = new EventEmitter();
systemEventBus.setMaxListeners(30);

// 🗄️ Event Buffer — SSE bağlantısı kurulmadan önce gelen eventleri saklar
export const eventBuffers = new Map(); // threadId → event[]

// 🗄️ Aktif workflow takibi — Admin Fleet Radar için
export const activeWorkflows = new Map(); // threadId → { clientId, tenantSlug, startedAt, lastAgent }

export function emitToThread(threadId, event) {
    if (agentEventBus.listenerCount(threadId) === 0) {
        if (!eventBuffers.has(threadId)) eventBuffers.set(threadId, []);
        eventBuffers.get(threadId).push(event);
    } else {
        agentEventBus.emit(threadId, event);
    }
    setTimeout(() => eventBuffers.delete(threadId), 5 * 60 * 1000);

    // 🛰️ Admin God Mode: Global event yayını
    const workflow = activeWorkflows.get(threadId);
    systemEventBus.emit("global", {
        threadId,
        clientId: workflow?.clientId || event.clientId || "unknown",
        tenantSlug: workflow?.tenantSlug || event.tenantSlug || "unknown",
        type: event.type,
        agent: event.agent,
        timestamp: Date.now(),
    });
}

// Backend node adı → Frontend agent ID eşlemesi
export const AGENT_UI_MAP = {
    orchestrator: "ceo",
    scraper: "scraper",
    analyzer: "analyst",
    innovator: "innovator",
    writer: "writer",
    critic: "qa",
    fileSaver: null, // UI'da gösterilmez
    human_approval: "hitl",
    publisher: "publisher",
    architect: "cto",
    __interrupt__: "hitl",   // LangGraph interrupt → HITL
};

// 🔄 HOT_LEAD workflow'unu arka planda çalıştır ve SSE ile olayları yay
export async function runHotLeadWorkflow(threadId, task, tenantConfig, clientId = "default", plan = "free") {
    const config = { configurable: { thread_id: threadId, tenantConfig: tenantConfig, clientId, plan }, recursionLimit: 100 };
    let interruptDetected = false;

    // 🛰️ Admin Fleet Radar: workflow başlangıcını kaydet
    activeWorkflows.set(threadId, {
        clientId,
        tenantSlug: tenantConfig?.clientSlug || clientId,
        startedAt: Date.now(),
        lastAgent: null,
    });

    try {
        for await (const chunk of await app.stream({ task }, config)) {
            const nodeName = Object.keys(chunk)[0];
            const agentId = AGENT_UI_MAP[nodeName];
            console.log(`   📡 SSE → node: ${nodeName}, agentId: ${agentId ?? "none"}`);
            if (agentId) {
                emitToThread(threadId, { type: "agent_active", agent: agentId });
                // 🛰️ Fleet Radar: son aktif ajanı güncelle
                const wf = activeWorkflows.get(threadId);
                if (wf) wf.lastAgent = agentId;
            }
            if (nodeName === "__interrupt__") {
                console.log(`   🛑 INTERRUPT detected — breaking stream loop`);
                interruptDetected = true;
                break;
            }
        }

        const currentState = await app.getState(config);
        console.log(`   🔍 getState → next: [${currentState.next.join(", ")}], tasks: ${currentState.tasks?.length ?? 0}`);

        const awaitingHITL =
            interruptDetected ||
            currentState.next.includes("human_approval") ||
            currentState.next.length === 0 ||
            currentState.tasks?.some(t => t.interrupts?.length > 0);

        console.log(`   🔍 awaitingHITL = ${awaitingHITL}`);

        if (awaitingHITL) {
            let pendingContent = currentState.values?.finalContent || "";

            if (!pendingContent) {
                try {
                    const report = await Report.findOne({ threadId }).sort({ createdAt: -1 });
                    if (report?.content) {
                        pendingContent = report.content;
                        console.log(`   📦 pendingContent MongoDB'den alındı (${pendingContent.length} chars)`);
                    }
                } catch (dbErr) {
                    console.warn("   ⚠️ MongoDB fallback başarısız:", dbErr.message);
                }
            }

            if (!pendingContent) {
                pendingContent =
                    currentState.values?.blueprintContent ||
                    currentState.values?.blueprint ||
                    currentState.values?.draftReport ||
                    "*(Rapor hazır — 'Pull Latest Intel' butonuna tıklayın)*";
            }

            try {
                await Report.findOneAndUpdate(
                    { threadId },
                    {
                        threadId,
                        clientId,
                        task: currentState.values?.task || task,
                        content: pendingContent,
                        status: "AWAITING_APPROVAL",
                    },
                    { upsert: true, new: true }
                );
                console.log(`   💾 MongoDB upsert OK — threadId: ${threadId}, clientId: ${clientId}`);
            } catch (dbErr) {
                console.warn("   ⚠️ MongoDB upsert başarısız:", dbErr.message);
            }

            emitToThread(threadId, {
                type: "workflow_complete",
                status: "AWAITING_HUMAN_APPROVAL",
                pendingContent,
            });
            console.log(`   ✅ workflow_complete emitted (${pendingContent.length} chars)`);
        } else {
            console.log(`   ℹ️ Workflow tamamlandı (HITL değil)`);
            activeWorkflows.delete(threadId);
        }
    } catch (err) {
        console.error("❌ runHotLeadWorkflow hatası:", err.message);
        emitToThread(threadId, { type: "error", message: err.message });
        activeWorkflows.delete(threadId);
    }
}

// 📤 Publisher workflow’u — AUTHORIZE sonrası arka planda çalışır
export async function runPublishWorkflow(threadId, feedbackNote) {
    try {
        console.log(`   📤 Publisher başladı — threadId: ${threadId}`);

        const report = await Report.findOne({ threadId });
        const finalContent = report?.content || '';

        if (!finalContent) {
            console.warn(`   ⚠️ Publisher: MongoDB'de içerik yok (threadId: ${threadId}) — bildirim atlandı.`);
        } else {
            const { publisherNode } = await import('../agents/publisherAgent.js');
            await publisherNode({
                finalContent,
                task: report?.task || '',
                humanFeedback: feedbackNote || 'Onaylandı ✓',
            });
        }

        await Report.findOneAndUpdate(
            { threadId },
            { status: 'PUBLISHED', humanFeedback: feedbackNote || '' }
        );
        console.log(`   ✅ PUBLISHED — threadId: ${threadId}`);

        if (finalContent) {
            runCMOWorkflow(threadId, finalContent, report?.task || '', report?.clientId || "default").catch(err =>
                console.error('❌ CMO background hatası:', err.message)
            );
        }
    } catch (err) {
        console.error('❌ runPublishWorkflow hatası:', err.message);
        await Report.findOneAndUpdate({ threadId }, { status: 'PUBLISHED' }).catch(() => { });
    }
}

// 📣 CMO workflow — yayinlanan raporu kampanyaya donusturur
export async function runCMOWorkflow(threadId, reportContent, task, clientId = "default") {
    console.log(`\n📣 [CMO WORKFLOW] Basliyor — threadId: ${threadId}`);
    try {
        const campaignContent = await generateCampaign(reportContent, task, threadId, clientId);

        const titleMatch = reportContent.match(/^#\s+(.+)/m);
        const reportTitle = titleMatch ? titleMatch[1].trim().slice(0, 120) : task.slice(0, 120);

        await CampaignDraft.create({
            threadId,
            reportTitle,
            campaignContent,
            status: 'AWAITING_APPROVAL',
            clientId
        });

        console.log(`   ✅ CampaignDraft kaydedildi — "${reportTitle}"`);
    } catch (err) {
        console.error('❌ runCMOWorkflow hatası:', err.message);
    }
}

// ♻️ Revizyon workflow'u — OVERRIDE sonrası arka planda graph'ı devam ettirir
export async function runRevisionWorkflow(threadId, tenantConfig) {
    const config = { configurable: { thread_id: threadId, tenantConfig: tenantConfig }, recursionLimit: 100 };
    let interruptDetected = false;

    try {
        console.log(`   ♻️ Revizyon başladı — threadId: ${threadId}`);
        for await (const chunk of await app.stream(null, config)) {
            const nodeName = Object.keys(chunk)[0];
            const agentId = AGENT_UI_MAP[nodeName];
            console.log(`   📡 REV SSE → node: ${nodeName}, agentId: ${agentId ?? "none"}`);
            if (agentId) {
                emitToThread(threadId, { type: "agent_active", agent: agentId });
            }
            if (nodeName === "__interrupt__") {
                console.log(`   🛑 REV INTERRUPT — yeni revizyon hazır`);
                interruptDetected = true;
                break;
            }
        }

        const currentState = await app.getState(config);
        const awaitingHITL =
            interruptDetected ||
            currentState.next.includes("human_approval") ||
            currentState.tasks?.some(t => t.interrupts?.length > 0);

        if (awaitingHITL) {
            let pendingContent = currentState.values?.finalContent || "";
            if (!pendingContent) {
                const report = await Report.findOne({ threadId }).sort({ createdAt: -1 });
                if (report?.content) pendingContent = report.content;
            }
            if (!pendingContent) pendingContent = "*(Revizyon hazır — Pull Intel ile yükleyin)*";

            await Report.findOneAndUpdate(
                { threadId },
                { content: pendingContent, status: "AWAITING_APPROVAL" },
                { upsert: true, new: true }
            );

            emitToThread(threadId, {
                type: "workflow_complete",
                status: "AWAITING_HUMAN_APPROVAL",
                pendingContent,
            });
            console.log(`   ✅ REV workflow_complete emitted (${pendingContent.length} chars)`);
        }
    } catch (err) {
        console.error("❌ runRevisionWorkflow hatası:", err.message);
        emitToThread(threadId, { type: "error", message: "Revision failed: " + err.message });
    }
}
