import { InvoiceAudit } from "../models/InvoiceAudit.js";

/**
 * GET /api/auditor/summary
 * Cari ay için fatura denetim özeti
 */
export const getAuditSummary = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [statusCounts, anomalyCounts, totalAmounts] = await Promise.all([
            // Duruma göre sayım
            InvoiceAudit.aggregate([
                { $match: { clientId, createdAt: { $gte: startOfMonth } } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            // Anomali tipine göre sayım
            InvoiceAudit.aggregate([
                { $match: { clientId, anomalyDetected: true, createdAt: { $gte: startOfMonth } } },
                { $group: { _id: "$anomalyType", count: { $sum: 1 } } },
            ]),
            // Toplam fatura tutarları
            InvoiceAudit.aggregate([
                { $match: { clientId, createdAt: { $gte: startOfMonth } } },
                {
                    $group: {
                        _id: null,
                        totalInvoiced: { $sum: "$invoiceAmount" },
                        totalAgreed: { $sum: "$agreedAmount" },
                        invoiceCount: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const totals = totalAmounts[0] || { totalInvoiced: 0, totalAgreed: 0, invoiceCount: 0 };
        const anomalyCount = await InvoiceAudit.countDocuments({ clientId, anomalyDetected: true, createdAt: { $gte: startOfMonth } });
        const awaitingCount = await InvoiceAudit.countDocuments({ clientId, status: "AWAITING_APPROVAL" });

        res.json({
            period: startOfMonth.toISOString().slice(0, 7),
            invoiceCount: totals.invoiceCount,
            totalInvoiced: totals.totalInvoiced,
            totalAgreed: totals.totalAgreed,
            variance: totals.totalInvoiced - totals.totalAgreed,
            anomalyCount,
            awaitingApproval: awaitingCount,
            statusBreakdown: statusCounts,
            anomalyBreakdown: anomalyCounts,
        });
    } catch (err) {
        console.error("getAuditSummary hatası:", err);
        res.status(500).json({ error: "Özet alınamadı." });
    }
};

/**
 * GET /api/auditor/findings?limit=20&status=AWAITING_APPROVAL
 * Fatura denetim kayıtları listesi
 */
export const getAuditFindings = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;

        const filter = { clientId };
        if (status) filter.status = status;

        const findings = await InvoiceAudit.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("threadId vendorName invoiceAmount agreedAmount anomalyDetected anomalyType status confidenceScore createdAt");

        res.json({ findings });
    } catch (err) {
        console.error("getAuditFindings hatası:", err);
        res.status(500).json({ error: "Kayıtlar alınamadı." });
    }
};

/**
 * GET /api/auditor/:threadId
 * Tek bir fatura denetim detayı
 */
export const getAuditDetail = async (req, res) => {
    try {
        const { threadId } = req.params;
        const record = await InvoiceAudit.findOne({ threadId });

        if (!record) return res.status(404).json({ error: "Kayıt bulunamadı." });
        res.json(record);
    } catch (err) {
        console.error("getAuditDetail hatası:", err);
        res.status(500).json({ error: "Detay alınamadı." });
    }
};

/**
 * POST /api/auditor/approve/:threadId
 * Fatura onay / ret
 */
export const approveInvoice = async (req, res) => {
    try {
        const { threadId } = req.params;
        const { isApproved, feedback } = req.body;

        const newStatus = isApproved ? "APPROVED" : "REJECTED";

        const record = await InvoiceAudit.findOneAndUpdate(
            { threadId },
            { $set: { status: newStatus, humanFeedback: feedback || "" } },
            { returnDocument: "after" }
        );

        if (!record) return res.status(404).json({ error: "Fatura kaydı bulunamadı." });

        console.log(`🧾 Fatura ${threadId}: ${newStatus} — İnsan kararı uygulandı.`);
        res.json({ success: true, status: newStatus });
    } catch (err) {
        console.error("approveInvoice hatası:", err);
        res.status(500).json({ error: "Onay işlemi başarısız." });
    }
};
