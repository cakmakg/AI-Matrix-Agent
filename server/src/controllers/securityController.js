import { SecurityEvent } from "../models/SecurityEvent.js";
import { ActionQueue } from "../models/ActionQueue.js";

export const getSecurityStatus = async (req, res) => {
    try {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Son 24 saatteki olaylar (paralel sorgular)
        const [events, queueStats, maxThreat] = await Promise.all([
            // Son 50 güvenlik olayı
            SecurityEvent.find({ createdAt: { $gte: since24h } })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean(),

            // ActionQueue durum sayımları (tüm zaman)
            ActionQueue.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),

            // Son 24h maksimum tehdit skoru
            SecurityEvent.findOne(
                { createdAt: { $gte: since24h }, eventType: { $in: ["THREAT_BLOCKED", "THREAT_SANITIZED"] } },
                { threatScore: 1 }
            ).sort({ threatScore: -1 }).lean(),
        ]);

        // Olay tipi sayımları
        const eventCounts = {
            THREAT_BLOCKED:   0,
            THREAT_SANITIZED: 0,
            ACTION_REJECTED:  0,
            RATE_LIMIT_HIT:   0,
            INVALID_API_KEY:  0,
        };
        for (const e of events) {
            if (eventCounts[e.eventType] !== undefined) eventCounts[e.eventType]++;
        }

        // Severity dağılımı
        const severityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
        for (const e of events) severityCounts[e.severity]++;

        // ActionQueue durum haritası
        const queue = { PENDING: 0, PROCESSING: 0, SUCCESS: 0, FAILED: 0, REJECTED: 0 };
        for (const s of queueStats) queue[s._id] = s.count;

        // Genel sistem güvenlik durumu
        const criticalCount = severityCounts.CRITICAL + severityCounts.HIGH;
        const systemStatus =
            severityCounts.CRITICAL > 0 ? "CRITICAL" :
            severityCounts.HIGH      > 2 ? "WARNING"  :
            criticalCount            > 0 ? "ELEVATED" : "NORMAL";

        res.json({
            systemStatus,                            // NORMAL | ELEVATED | WARNING | CRITICAL
            maxThreatScore: maxThreat?.threatScore ?? 0,
            eventCounts,
            severityCounts,
            queue,
            recentEvents: events.map(e => ({
                id:          e._id,
                eventType:   e.eventType,
                severity:    e.severity,
                threadId:    e.threadId,
                agentId:     e.agentId,
                threatScore: e.threatScore,
                details:     e.details,
                rawInput:    e.rawInput,
                createdAt:   e.createdAt,
            })),
        });
    } catch (err) {
        console.error("❌ /api/security/status hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};
