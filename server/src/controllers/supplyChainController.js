import { SupplyChainEvent } from "../models/SupplyChainEvent.js";

/**
 * GET /api/supply/summary
 * Tedarik zinciri özeti
 */
export const getSupplySummary = async (req, res) => {
    try {
        const clientId = req.clientId || "default";

        const [urgencyCounts, statusCounts, recentAlerts] = await Promise.all([
            // Aciliyet seviyesine göre sayım
            SupplyChainEvent.aggregate([
                { $match: { clientId, status: { $in: ["ALERT", "AWAITING_APPROVAL"] } } },
                { $group: { _id: "$urgencyLevel", count: { $sum: 1 } } },
            ]),
            // Duruma göre sayım
            SupplyChainEvent.aggregate([
                { $match: { clientId } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            // En kritik 5 uyarı
            SupplyChainEvent.find({ clientId, status: { $in: ["ALERT", "AWAITING_APPROVAL"] } })
                .sort({ urgencyLevel: -1, daysUntilStockout: 1 })
                .limit(5)
                .select("sku productName currentStock daysUntilStockout urgencyLevel status createdAt"),
        ]);

        const criticalCount = await SupplyChainEvent.countDocuments({ clientId, urgencyLevel: "CRITICAL", status: { $in: ["ALERT", "AWAITING_APPROVAL"] } });
        const awaitingCount = await SupplyChainEvent.countDocuments({ clientId, status: "AWAITING_APPROVAL" });

        res.json({
            criticalAlerts: criticalCount,
            awaitingApproval: awaitingCount,
            urgencyBreakdown: urgencyCounts,
            statusBreakdown: statusCounts,
            topAlerts: recentAlerts,
        });
    } catch (err) {
        console.error("getSupplySummary hatası:", err);
        res.status(500).json({ error: "Özet alınamadı." });
    }
};

/**
 * GET /api/supply/alerts?limit=20&urgency=CRITICAL
 * Stok uyarıları listesi
 */
export const getSupplyAlerts = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const limit = parseInt(req.query.limit) || 20;
        const urgency = req.query.urgency;
        const status = req.query.status;

        const filter = { clientId };
        if (urgency) filter.urgencyLevel = urgency;
        if (status) filter.status = status;

        const alerts = await SupplyChainEvent.find(filter)
            .sort({ urgencyLevel: -1, daysUntilStockout: 1, createdAt: -1 })
            .limit(limit)
            .select("threadId sku productName currentStock reorderPoint daysUntilStockout urgencyLevel supplierName status createdAt");

        res.json({ alerts });
    } catch (err) {
        console.error("getSupplyAlerts hatası:", err);
        res.status(500).json({ error: "Uyarılar alınamadı." });
    }
};

/**
 * GET /api/supply/:threadId
 * Tek bir tedarik zinciri olayı detayı
 */
export const getSupplyDetail = async (req, res) => {
    try {
        const { threadId } = req.params;
        const record = await SupplyChainEvent.findOne({ threadId });

        if (!record) return res.status(404).json({ error: "Kayıt bulunamadı." });
        res.json(record);
    } catch (err) {
        console.error("getSupplyDetail hatası:", err);
        res.status(500).json({ error: "Detay alınamadı." });
    }
};

/**
 * POST /api/supply/approve/:threadId
 * Sipariş e-postası onay / ret
 */
export const approveOrder = async (req, res) => {
    try {
        const { threadId } = req.params;
        const { isApproved, feedback } = req.body;

        const newStatus = isApproved ? "ORDER_SENT" : "ACKNOWLEDGED";

        const record = await SupplyChainEvent.findOneAndUpdate(
            { threadId },
            {
                $set: {
                    status: newStatus,
                    humanFeedback: feedback || "",
                    ...(isApproved && { orderSentAt: new Date() }),
                },
            },
            { returnDocument: "after" }
        );

        if (!record) return res.status(404).json({ error: "Tedarik kaydı bulunamadı." });

        console.log(`📦 Sipariş ${threadId}: ${newStatus} — İnsan kararı uygulandı.`);
        res.json({ success: true, status: newStatus });
    } catch (err) {
        console.error("approveOrder hatası:", err);
        res.status(500).json({ error: "Onay işlemi başarısız." });
    }
};
