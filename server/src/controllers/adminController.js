import { Client } from "../models/Client.js";
import { TenantConfig } from "../models/TenantConfig.js";
import { AdminLog } from "../models/AdminLog.js";
import { SecurityEvent } from "../models/SecurityEvent.js";
import Transaction from "../models/Transaction.js";
import { Report } from "../models/Report.js";
import { PLAN_LIMITS } from "../config/plans.js";
import { BannedIP } from "../models/BannedIP.js";
import { WorkflowSnapshot } from "../models/WorkflowSnapshot.js";
import { bannedIPCache } from "../services/bannedIPCacheService.js";
import { costEventBus } from "../services/costEventBus.js";
import { systemEventBus, agentEventBus, eventBuffers, activeWorkflows } from "../workflows/runner.js";

// ─────────────────────────────────────────────────────
// Yardımcı: Admin audit log kaydı
// ─────────────────────────────────────────────────────
async function logAdminAction(adminId, action, target, details) {
    try {
        await AdminLog.create({ adminId, action, target, details });
    } catch (err) {
        console.error("⚠️ AdminLog yazılamadı:", err.message);
    }
}

// ═════════════════════════════════════════════════════
// PANEL 1 — Global Fleet Radar
// ═════════════════════════════════════════════════════

/**
 * GET /api/admin/tenants
 * Tüm tenant'lar + plan + durum + aktif workflow sayısı
 */
export const listTenants = async (req, res) => {
    try {
        const clients = await Client.find(
            { status: { $ne: "deleted" } },
            { passwordHash: 0 }
        )
            .sort({ createdAt: -1 })
            .lean();

        // Her tenant'ın bu ayki workflow sayısı
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const workflowCounts = await Report.aggregate([
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $group: { _id: "$clientId", count: { $sum: 1 } } },
        ]);
        const countMap = Object.fromEntries(
            workflowCounts.map((w) => [String(w._id), w.count])
        );

        const tenants = clients.map((c) => ({
            _id: c._id,
            name: c.name,
            slug: c.slug,
            plan: c.plan,
            product: c.product,
            status: c.status || "active",
            isAdmin: c.isAdmin || false,
            email: c.email,
            sector: c.sector,
            language: c.language,
            workflowsThisMonth: countMap[c.slug] || countMap[String(c._id)] || 0,
            createdAt: c.createdAt,
        }));

        res.json(tenants);
    } catch (err) {
        console.error("❌ admin/tenants hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admin/tenants/:slug
 * Tek tenant detayı + config + istatistikler
 */
export const getTenantDetail = async (req, res) => {
    try {
        const client = await Client.findOne(
            { slug: req.params.slug },
            { passwordHash: 0 }
        ).lean();
        if (!client) return res.status(404).json({ error: "Tenant bulunamadı." });

        const config = await TenantConfig.findOne({ clientId: client._id }).lean();

        // Bu ayki LLM maliyeti
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const [expenseAgg, workflowCount, securityCount] = await Promise.all([
            Transaction.aggregate([
                { $match: { clientId: client.slug, type: "EXPENSE", createdAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
            Report.countDocuments({ clientId: client.slug }),
            SecurityEvent.countDocuments({ clientId: client.slug, createdAt: { $gte: startOfMonth } }),
        ]);

        const planPrice = { free: 99, pro: 299, enterprise: 999, holding: 3000 };
        const expense = expenseAgg[0]?.total || 0;
        const revenue = planPrice[client.plan] || 0;

        res.json({
            client,
            config,
            stats: {
                expense,
                revenue,
                pnl: revenue - expense,
                margin: revenue > 0 ? ((revenue - expense) / revenue * 100).toFixed(1) : 0,
                totalWorkflows: workflowCount,
                securityEventsThisMonth: securityCount,
            },
        });
    } catch (err) {
        console.error("❌ admin/tenants/:slug hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ═════════════════════════════════════════════════════
// PANEL 2 — SOC (Security Operations Center)
// ═════════════════════════════════════════════════════

/**
 * POST /api/admin/tenants/:slug/halt
 * Kill Switch — Tenant'ı askıya al
 */
export const haltTenant = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: "Askıya alma nedeni zorunludur." });

        const client = await Client.findOne({ slug: req.params.slug });
        if (!client) return res.status(404).json({ error: "Tenant bulunamadı." });
        if (client.isAdmin) return res.status(403).json({ error: "Admin tenant askıya alınamaz." });
        if (client.status === "suspended") return res.status(409).json({ error: "Tenant zaten askıda." });

        client.status = "suspended";
        client.suspendedAt = new Date();
        client.suspendedBy = req.clientId;
        client.suspendReason = reason;
        await client.save();

        await logAdminAction(req.tenant.client._id, "TENANT_HALTED", {
            type: "tenant",
            id: client.slug,
        }, { reason });

        console.log(`🛑 KILL SWITCH: ${client.name} (${client.slug}) askıya alındı — Neden: ${reason}`);
        res.json({ success: true, message: `${client.name} askıya alındı.`, status: "suspended" });
    } catch (err) {
        console.error("❌ admin/halt hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/admin/tenants/:slug/resume
 * Askıya alınmış tenant'ı yeniden aktifle
 */
export const resumeTenant = async (req, res) => {
    try {
        const client = await Client.findOne({ slug: req.params.slug });
        if (!client) return res.status(404).json({ error: "Tenant bulunamadı." });
        if (client.status !== "suspended") return res.status(409).json({ error: "Tenant askıda değil." });

        client.status = "active";
        client.suspendedAt = undefined;
        client.suspendedBy = undefined;
        client.suspendReason = undefined;
        await client.save();

        await logAdminAction(req.tenant.client._id, "TENANT_RESUMED", {
            type: "tenant",
            id: client.slug,
        }, {});

        console.log(`✅ RESUME: ${client.name} (${client.slug}) yeniden aktifleştirildi.`);
        res.json({ success: true, message: `${client.name} yeniden aktif.`, status: "active" });
    } catch (err) {
        console.error("❌ admin/resume hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * PATCH /api/admin/tenants/:slug/plan
 * Tenant'ın planını değiştir
 */
export const changePlan = async (req, res) => {
    try {
        const { plan } = req.body;
        if (!PLAN_LIMITS[plan]) return res.status(400).json({ error: `Geçersiz plan: ${plan}` });

        const client = await Client.findOne({ slug: req.params.slug });
        if (!client) return res.status(404).json({ error: "Tenant bulunamadı." });

        const oldPlan = client.plan;
        client.plan = plan;
        await client.save();

        await logAdminAction(req.tenant.client._id, "PLAN_CHANGED", {
            type: "tenant",
            id: client.slug,
        }, { oldPlan, newPlan: plan });

        console.log(`📋 PLAN DEĞİŞTİ: ${client.slug} — ${oldPlan} → ${plan}`);
        res.json({ success: true, oldPlan, newPlan: plan });
    } catch (err) {
        console.error("❌ admin/changePlan hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admin/security/global
 * Cross-tenant güvenlik özeti (son 24 saat)
 */
export const getGlobalSecurity = async (req, res) => {
    try {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [events, byTenant, bySeverity] = await Promise.all([
            SecurityEvent.find({ createdAt: { $gte: since24h } })
                .sort({ createdAt: -1 })
                .limit(100)
                .lean(),
            SecurityEvent.aggregate([
                { $match: { createdAt: { $gte: since24h } } },
                { $group: { _id: "$clientId", count: { $sum: 1 }, maxThreat: { $max: "$threatScore" } } },
                { $sort: { maxThreat: -1 } },
            ]),
            SecurityEvent.aggregate([
                { $match: { createdAt: { $gte: since24h } } },
                { $group: { _id: "$severity", count: { $sum: 1 } } },
            ]),
        ]);

        const severityMap = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
        for (const s of bySeverity) severityMap[s._id] = s.count;

        const totalThreats = events.length;
        const globalStatus =
            severityMap.CRITICAL > 0 ? "CRITICAL" :
            severityMap.HIGH > 5 ? "WARNING" :
            totalThreats > 20 ? "ELEVATED" : "NORMAL";

        res.json({
            globalStatus,
            totalThreats,
            severityCounts: severityMap,
            byTenant,
            recentEvents: events.slice(0, 50).map((e) => ({
                id: e._id,
                eventType: e.eventType,
                severity: e.severity,
                clientId: e.clientId,
                threadId: e.threadId,
                threatScore: e.threatScore,
                details: e.details,
                createdAt: e.createdAt,
            })),
        });
    } catch (err) {
        console.error("❌ admin/security/global hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ═════════════════════════════════════════════════════
// PANEL 4 — FinOps & Token Burn Rate
// ═════════════════════════════════════════════════════

/**
 * GET /api/admin/finance/global
 * Tüm sistem: toplam gelir, gider, net P&L
 */
export const getGlobalFinance = async (req, res) => {
    try {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const [expenseAgg, revenueAgg, byAgent, byTenant] = await Promise.all([
            Transaction.aggregate([
                { $match: { type: "EXPENSE", createdAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
            ]),
            Transaction.aggregate([
                { $match: { type: "REVENUE", createdAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
            ]),
            Transaction.aggregate([
                { $match: { type: "EXPENSE", createdAt: { $gte: startOfMonth } } },
                { $group: { _id: "$agentName", total: { $sum: "$amount" }, calls: { $sum: 1 } } },
                { $sort: { total: -1 } },
            ]),
            Transaction.aggregate([
                { $match: { type: "EXPENSE", createdAt: { $gte: startOfMonth } } },
                { $group: { _id: "$clientId", total: { $sum: "$amount" }, calls: { $sum: 1 } } },
                { $sort: { total: -1 } },
            ]),
        ]);

        const totalExpense = expenseAgg[0]?.total || 0;
        const totalRevenue = revenueAgg[0]?.total || 0;

        // Tüm aktif tenant'ların plan gelirleri
        const activeClients = await Client.find(
            { status: { $ne: "deleted" } },
            { plan: 1, slug: 1 }
        ).lean();
        const planPrice = { free: 99, pro: 299, enterprise: 999, holding: 3000 };
        const projectedRevenue = activeClients.reduce(
            (sum, c) => sum + (planPrice[c.plan] || 0), 0
        );

        res.json({
            periodLabel: startOfMonth.toLocaleString("de-DE", { month: "long", year: "numeric" }),
            totalExpense,
            totalRevenue,
            projectedRevenue,
            netPnl: projectedRevenue - totalExpense,
            totalLLMCalls: expenseAgg[0]?.count || 0,
            stripePayments: revenueAgg[0]?.count || 0,
            byAgent: byAgent.map((a) => ({ agent: a._id, cost: a.total, calls: a.calls })),
            byTenant: byTenant.map((t) => ({ clientId: t._id, cost: t.total, calls: t.calls })),
        });
    } catch (err) {
        console.error("❌ admin/finance/global hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admin/finance/per-tenant
 * Tenant bazlı kâr/zarar tablosu
 */
export const getPerTenantFinance = async (req, res) => {
    try {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const planPrice = { free: 99, pro: 299, enterprise: 999, holding: 3000 };

        const clients = await Client.find(
            { status: { $ne: "deleted" } },
            { name: 1, slug: 1, plan: 1 }
        ).lean();

        const expenses = await Transaction.aggregate([
            { $match: { type: "EXPENSE", createdAt: { $gte: startOfMonth } } },
            { $group: { _id: "$clientId", total: { $sum: "$amount" }, calls: { $sum: 1 } } },
        ]);
        const expenseMap = Object.fromEntries(
            expenses.map((e) => [e._id, { total: e.total, calls: e.calls }])
        );

        const result = clients.map((c) => {
            const revenue = planPrice[c.plan] || 0;
            const expense = expenseMap[c.slug]?.total || 0;
            const pnl = revenue - expense;
            const margin = revenue > 0 ? (pnl / revenue) * 100 : 0;
            let alertLevel = "healthy";
            if (margin < 5) alertLevel = "critical";
            else if (margin < 20) alertLevel = "danger";
            else if (margin < 50) alertLevel = "warning";

            return {
                name: c.name,
                slug: c.slug,
                plan: c.plan,
                revenue,
                expense: +expense.toFixed(4),
                pnl: +pnl.toFixed(4),
                margin: +margin.toFixed(1),
                llmCalls: expenseMap[c.slug]?.calls || 0,
                alertLevel,
            };
        });

        // En kötü marjdan başla
        result.sort((a, b) => a.margin - b.margin);
        res.json({ tenants: result });
    } catch (err) {
        console.error("❌ admin/finance/per-tenant hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admin/finance/alerts
 * Marj < %20 olan tenant'lar
 */
export const getFinanceAlerts = async (req, res) => {
    try {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const planPrice = { free: 99, pro: 299, enterprise: 999, holding: 3000 };

        const clients = await Client.find(
            { status: { $ne: "deleted" } },
            { name: 1, slug: 1, plan: 1 }
        ).lean();

        const expenses = await Transaction.aggregate([
            { $match: { type: "EXPENSE", createdAt: { $gte: startOfMonth } } },
            { $group: { _id: "$clientId", total: { $sum: "$amount" } } },
        ]);
        const expenseMap = Object.fromEntries(expenses.map((e) => [e._id, e.total]));

        const alerts = [];
        for (const c of clients) {
            const revenue = planPrice[c.plan] || 0;
            const expense = expenseMap[c.slug] || 0;
            const margin = revenue > 0
                ? ((revenue - expense) / revenue) * 100
                : expense > 0 ? -100 : 100;

            if (margin < 20) {
                let severity = "warning";
                if (margin < 0) severity = "loss";
                else if (margin < 5) severity = "critical";

                alerts.push({
                    slug: c.slug,
                    name: c.name,
                    plan: c.plan,
                    revenue,
                    expense: +expense.toFixed(4),
                    margin: +margin.toFixed(1),
                    severity,
                });
            }
        }

        alerts.sort((a, b) => a.margin - b.margin);
        res.json({ alerts, count: alerts.length });
    } catch (err) {
        console.error("❌ admin/finance/alerts hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ═════════════════════════════════════════════════════
// ADMIN LOG
// ═════════════════════════════════════════════════════

/**
 * GET /api/admin/logs
 * Admin audit log geçmişi
 */
export const getAdminLogs = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const logs = await AdminLog.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("adminId", "name slug")
            .lean();

        res.json({ logs });
    } catch (err) {
        console.error("❌ admin/logs hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ═════════════════════════════════════════════════════
// SSE ENDPOINTS — Real-time Admin Streams
// ═════════════════════════════════════════════════════

/**
 * GET /api/admin/events/global
 * SSE — Tüm tenant'ların birleşik event akışı (Fleet Radar)
 */
export const globalEventStream = (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });
    res.write("data: {\"type\":\"connected\",\"message\":\"God Mode SSE active\"}\n\n");

    // Aktif workflow snapshot'ını hemen gönder
    const snapshot = [];
    for (const [threadId, wf] of activeWorkflows.entries()) {
        snapshot.push({ threadId, ...wf });
    }
    if (snapshot.length > 0) {
        res.write(`data: ${JSON.stringify({ type: "active_workflows", workflows: snapshot })}\n\n`);
    }

    const handler = (event) => {
        try {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch { /* client disconnected */ }
    };

    systemEventBus.on("global", handler);

    // Heartbeat — her 15 saniyede bağlantıyı canlı tut
    const heartbeat = setInterval(() => {
        try { res.write(": heartbeat\n\n"); } catch { clearInterval(heartbeat); }
    }, 15000);

    req.on("close", () => {
        systemEventBus.off("global", handler);
        clearInterval(heartbeat);
    });
};

/**
 * GET /api/admin/tenants/:slug/live
 * SSE — Ghost Mode: Tek tenant'ın canlı ajan akışını izle (read-only)
 */
export const ghostModeStream = async (req, res) => {
    const { slug } = req.params;

    // Tenant'ı doğrula
    const client = await Client.findOne({ slug }, { _id: 1, name: 1, slug: 1 }).lean();
    if (!client) return res.status(404).json({ error: "Tenant bulunamadı." });

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });
    res.write(`data: ${JSON.stringify({ type: "ghost_connected", tenant: client.name, slug })}\n\n`);

    // Global event bus'tan sadece bu tenant'a ait event'leri filtrele
    const handler = (event) => {
        if (event.tenantSlug === slug || event.clientId === slug) {
            try {
                res.write(`data: ${JSON.stringify(event)}\n\n`);
            } catch { /* client disconnected */ }
        }
    };

    systemEventBus.on("global", handler);

    const heartbeat = setInterval(() => {
        try { res.write(": heartbeat\n\n"); } catch { clearInterval(heartbeat); }
    }, 15000);

    req.on("close", () => {
        systemEventBus.off("global", handler);
        clearInterval(heartbeat);
    });
};

/**
 * GET /api/admin/workflows/active
 * Tüm aktif workflow'ların anlık durumu
 */
export const getActiveWorkflows = (req, res) => {
    const workflows = [];
    for (const [threadId, wf] of activeWorkflows.entries()) {
        workflows.push({ threadId, ...wf });
    }
    res.json({ workflows, count: workflows.length });
};

// ═════════════════════════════════════════════════════
// IP BAN YÖNETİMİ
// ═════════════════════════════════════════════════════

/**
 * GET /api/admin/security/banned-ips
 * Aktif banlı IP listesi
 */
export const listBannedIPs = async (req, res) => {
    try {
        const ips = await BannedIP.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        res.json({ ips, count: ips.length });
    } catch (err) {
        console.error("❌ admin/banned-ips hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/admin/security/ban-ip
 * IP adresini banla
 * Body: { ip, reason, source?, clientId?, durationHours? }
 */
export const banIP = async (req, res) => {
    try {
        const { ip, reason, source, clientId, durationHours } = req.body;
        if (!ip || !reason) return res.status(400).json({ error: "IP ve neden zorunludur." });

        // IP format doğrulaması (basit)
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
        if (!ipRegex.test(ip)) return res.status(400).json({ error: "Geçersiz IP formatı." });

        // Zaten banlı mı?
        const existing = await BannedIP.findOne({ ip, isActive: true });
        if (existing) return res.status(409).json({ error: "IP zaten banlı.", bannedAt: existing.createdAt });

        const expiresAt = durationHours ? new Date(Date.now() + durationHours * 60 * 60 * 1000) : null;

        const banned = await BannedIP.create({
            ip,
            reason,
            source: source || "MANUAL",
            clientId: clientId || null,
            expiresAt,
            bannedBy: req.tenant?.client?._id,
        });

        // In-memory cache'e ekle (rateLimiter'ın hızlı erişimi için)
        bannedIPCache.add(ip, expiresAt);

        await logAdminAction(req.tenant?.client?._id, "IP_BANNED", {
            type: "ip",
            id: ip,
        }, { reason, source: source || "MANUAL", durationHours: durationHours || "permanent" });

        console.log(`🚫 IP BANNED: ${ip} — Neden: ${reason}`);
        res.json({ success: true, banned });
    } catch (err) {
        console.error("❌ admin/ban-ip hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/admin/security/unban-ip
 * IP banını kaldır
 * Body: { ip }
 */
export const unbanIP = async (req, res) => {
    try {
        const { ip } = req.body;
        if (!ip) return res.status(400).json({ error: "IP zorunludur." });

        const result = await BannedIP.updateMany(
            { ip, isActive: true },
            { isActive: false }
        );

        if (result.modifiedCount === 0) return res.status(404).json({ error: "Aktif ban bulunamadı." });

        // In-memory cache'den çıkar
        bannedIPCache.delete(ip);

        await logAdminAction(req.tenant?.client?._id, "IP_UNBANNED", {
            type: "ip",
            id: ip,
        }, {});

        console.log(`✅ IP UNBANNED: ${ip}`);
        res.json({ success: true, unbannedCount: result.modifiedCount });
    } catch (err) {
        console.error("❌ admin/unban-ip hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Sunucu başlangıcında çağrılır — aktif banları in-memory cache'e yükler
 */
export async function loadBannedIPCache() {
    try {
        const bans = await BannedIP.find({ isActive: true }, { ip: 1, expiresAt: 1 }).lean();
        for (const b of bans) bannedIPCache.add(b.ip, b.expiresAt || null);
        console.log(`🛡️ BannedIP cache yüklendi: ${bannedIPCache.size} aktif ban`);
    } catch (err) {
        console.error("⚠️ BannedIP cache yükleme hatası:", err.message);
    }
}

// ═════════════════════════════════════════════════════
// FAZ 4 — FinOps: Burn Rate SSE + Throttle
// ═════════════════════════════════════════════════════

/**
 * GET /api/admin/finance/live
 * SSE — Gerçek zamanlı LLM maliyet akışı (Burn Rate)
 * Her token işleminde cost_tick event'i yayınlar
 */
export const financeLiveStream = (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });
    res.write(`data: ${JSON.stringify({ type: "connected", message: "Finance SSE active" })}\n\n`);

    const handler = (event) => {
        try {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch { /* client disconnected */ }
    };

    costEventBus.on("cost", handler);

    const heartbeat = setInterval(() => {
        try { res.write(": heartbeat\n\n"); } catch { clearInterval(heartbeat); }
    }, 15000);

    req.on("close", () => {
        costEventBus.off("cost", handler);
        clearInterval(heartbeat);
    });
};

/**
 * POST /api/admin/tenants/:slug/throttle
 * Tenant'ı throttle et — TenantConfig'e flag yazar
 * Body: { throttle: boolean }
 */
export const throttleTenant = async (req, res) => {
    try {
        const { throttle } = req.body;
        const isThrottled = throttle !== false;

        const client = await Client.findOne({ slug: req.params.slug });
        if (!client) return res.status(404).json({ error: "Tenant bulunamadı." });
        if (client.isAdmin) return res.status(403).json({ error: "Admin throttle edilemez." });

        await TenantConfig.findOneAndUpdate(
            { clientId: client._id },
            { $set: { "configObject.throttled": isThrottled } },
            { upsert: true, returnDocument: "after" }
        );

        await logAdminAction(req.tenant.client._id,
            isThrottled ? "TENANT_THROTTLED" : "TENANT_UNTHROTTLED",
            { type: "tenant", id: client.slug },
            {}
        );

        console.log(`⚡ THROTTLE: ${client.slug} — ${isThrottled ? "kısıtlandı" : "kaldırıldı"}`);
        res.json({ success: true, throttled: isThrottled });
    } catch (err) {
        console.error("❌ admin/throttle hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ═════════════════════════════════════════════════════
// FAZ 5 — Zaman Makinesi (Time Machine)
// ═════════════════════════════════════════════════════

/**
 * GET /api/admin/workflows/recent
 * Son N workflow'un özeti (threadId, tenant, adım sayısı, son ajan)
 */
export const getRecentWorkflows = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);

        // MongoDB'den tamamlanmış workflow snapshot grupları
        const dbWorkflows = await WorkflowSnapshot.aggregate([
            {
                $group: {
                    _id: "$threadId",
                    clientId:     { $first: "$clientId" },
                    tenantSlug:   { $first: "$tenantSlug" },
                    stepCount:    { $sum: 1 },
                    lastNode:     { $last: "$nodeName" },
                    startedAt:    { $min: "$createdAt" },
                    lastActivity: { $max: "$createdAt" },
                },
            },
            { $sort: { lastActivity: -1 } },
            { $limit: limit },
        ]);

        // In-memory aktif workflow'ları ile birleştir
        const activeList = [];
        for (const [threadId, wf] of activeWorkflows.entries()) {
            activeList.push({
                threadId,
                clientId: wf.clientId,
                tenantSlug: wf.tenantSlug,
                stepCount: null, // henüz tamamlanmadı
                lastNode: wf.lastAgent,
                startedAt: new Date(wf.startedAt),
                lastActivity: new Date(wf.startedAt),
                isActive: true,
            });
        }

        const dbList = dbWorkflows.map((w) => ({
            threadId: w._id,
            clientId: w.clientId,
            tenantSlug: w.tenantSlug,
            stepCount: w.stepCount,
            lastNode: w.lastNode,
            startedAt: w.startedAt,
            lastActivity: w.lastActivity,
            isActive: activeWorkflows.has(w._id),
        }));

        // Aktif olanları önce, DB listesiyle birleştir (tekrarları önle)
        const activeThreadIds = new Set(activeList.map((w) => w.threadId));
        const combined = [
            ...activeList,
            ...dbList.filter((w) => !activeThreadIds.has(w.threadId)),
        ].slice(0, limit);

        res.json(combined);
    } catch (err) {
        console.error("❌ admin/workflows/recent hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admin/workflows/:threadId/snapshots
 * Bir workflow'un tüm adım snapshot'larını döndür
 */
export const getWorkflowSnapshots = async (req, res) => {
    try {
        const snapshots = await WorkflowSnapshot.find(
            { threadId: req.params.threadId },
            { __v: 0 }
        )
            .sort({ step: 1 })
            .lean();

        res.json(snapshots);
    } catch (err) {
        console.error("❌ admin/workflows/:threadId/snapshots hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};
