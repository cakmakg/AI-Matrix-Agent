import { Report } from "../models/Report.js";

export const listMissions = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || "1") || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50") || 50));
        const status = req.query.status;

        const clientId = req.clientId || "default";
        const filter = { clientId };
        if (status) filter.status = status;

        const reports = await Report
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select("threadId task status createdAt humanFeedback content");

        const missions = reports.map(r => ({
            threadId: r.threadId,
            task: r.task,
            status: r.status,
            humanFeedback: r.humanFeedback,
            createdAt: r.createdAt,
            contentPreview: (r.content || "").slice(0, 220),
        }));

        const total = await Report.countDocuments(filter);
        res.json({ missions, total, page, limit });
    } catch (err) {
        console.error("❌ /api/missions hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const getMissionDetails = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const report = await Report.findOne({ threadId: req.params.threadId, clientId });
        if (!report) return res.status(404).json({ error: "Mission not found or access denied" });
        res.json({
            threadId: report.threadId,
            task: report.task,
            status: report.status,
            humanFeedback: report.humanFeedback,
            createdAt: report.createdAt,
            content: report.content,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
