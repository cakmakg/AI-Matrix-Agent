import { v4 as uuidv4 } from "uuid";
import { app } from "../workflows/graph.js";
import { agentEventBus, eventBuffers, runHotLeadWorkflow } from "../workflows/runner.js";
import { getPlanRules } from "../config/plans.js";

export const streamEvents = (req, res) => {
    const { threadId } = req.params;
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    });
    res.write("\n");

    const buffered = eventBuffers.get(threadId) || [];
    eventBuffers.delete(threadId);
    for (const event of buffered) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        if (event.type === "workflow_complete" || event.type === "error") {
            res.end();
            return;
        }
    }

    const listener = (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        if (event.type === "workflow_complete" || event.type === "error") {
            agentEventBus.removeListener(threadId, listener);
            res.end();
        }
    };

    agentEventBus.on(threadId, listener);
    req.on("close", () => agentEventBus.removeListener(threadId, listener));
};

export const analyzeTask = async (req, res) => {
    try {
        if (!req.body.task) return res.status(400).json({ error: "Lütfen 'task' belirtin." });

        // 🛡️ PLAN GUARD: Analiz akışı free (Support Desk) planında kapalıdır.
        const clientPlan = req.tenant?.client?.plan || "free";
        if (clientPlan === "free") {
            const planRules = getPlanRules("free");
            return res.status(403).json({
                error: `Bu özellik [${planRules.label}] paketinde kullanılamaz.`,
                requiredPlan: "pro",
                currentPlan: clientPlan,
            });
        }

        const clientId = req.clientId || "default";
        const finalState = await app.invoke(
            { task: req.body.task },
            { configurable: { tenantConfig: req.tenant?.config, clientId, plan: clientPlan } }
        );
        res.json({ success: true, fileSaved: finalState.fileSaved, finalReport: finalState.finalContent });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const runRndTask = (req, res) => {
    // 🛡️ PLAN GUARD: R&D / INNOVATION_RADAR yalnızca Enterprise planına açıktır.
    const clientPlan = req.tenant?.client?.plan || "free";
    if (clientPlan !== "enterprise") {
        const planRules = getPlanRules(clientPlan);
        return res.status(403).json({
            error: `R&D Radar özelliği [${planRules.label}] paketinde kullanılamaz.`,
            requiredPlan: "enterprise",
            currentPlan: clientPlan,
        });
    }

    const threadId = "RND-" + uuidv4();
    const clientId = req.clientId || "default";
    const rndTask = "INNOVATION_RADAR: Recherchiere die allerneuesten Updates von Anthropic (Claude) und OpenAI für Entwickler von heute. Erstelle basierend auf diesen neuen Technologien einen Master Blueprint (.md), der erklärt, wie wir diese neuen KI-Features in unsere bestehende Architektur integrieren können.";
    runHotLeadWorkflow(threadId, rndTask, req.tenant?.config, clientId, clientPlan).catch((err) =>
        console.error("❌ R&D API Hatası:", err.message)
    );
    return res.json({ success: true, status: "PROCESSING", threadId, source: "RND_TRIGGER" });
};
