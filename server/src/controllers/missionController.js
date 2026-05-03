import { Report } from "../models/Report.js";

export const listMissions = async (req, res) => {
    try {
        const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit  || "50")  || 50));
        const offset = Math.max(0,              parseInt(req.query.offset || "0")   || 0);

        const clientId = req.clientId || "default";
        const filter   = { clientId };

        // Status filter — supports comma-separated values e.g. "APPROVED,PUBLISHED"
        if (req.query.status) {
            const statuses = req.query.status.split(",").map(s => s.trim()).filter(Boolean);
            filter.status  = statuses.length === 1 ? statuses[0] : { $in: statuses };
        }

        // Date range
        if (req.query.from || req.query.to) {
            filter.createdAt = {};
            if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
            if (req.query.to)   filter.createdAt.$lte = new Date(req.query.to);
        }

        // Track / task prefix filter (FREN routing)
        const TRACK_PREFIXES = {
            finance:  ["INVOICE_PROCESSING:"],
            supply:   ["STOCK_CHECK:"],
            social:   ["TWITTER:", "LINKEDIN:"],
            outreach: ["COLD_OUTREACH:"],
            rfp:      ["RFP_RESPONSE:"],
            strategy: ["INNOVATION_RADAR:", "TREND_RADAR:", "BUSINESS_STRESS_TEST:"],
        };
        if (req.query.track && TRACK_PREFIXES[req.query.track]) {
            const prefixes = TRACK_PREFIXES[req.query.track];
            filter.task = { $in: prefixes.map(p => new RegExp(`^${p}`, "i")) };
        }

        // Full-text search (MongoDB $text index on task + content)
        let useTextSearch = false;
        if (req.query.q && req.query.q.trim()) {
            useTextSearch = true;
            filter.$text = { $search: req.query.q.trim() };
        }

        const query = Report.find(filter);

        if (useTextSearch) {
            query.sort({ score: { $meta: "textScore" }, createdAt: -1 });
        } else {
            query.sort({ createdAt: -1 });
        }

        const [reports, total] = await Promise.all([
            query
                .skip(offset)
                .limit(limit)
                .select("threadId task status createdAt humanFeedback content confidenceScore"),
            Report.countDocuments(filter),
        ]);

        const missions = reports.map(r => ({
            threadId:       r.threadId,
            task:           r.task,
            status:         r.status,
            humanFeedback:  r.humanFeedback,
            createdAt:      r.createdAt,
            confidenceScore: r.confidenceScore,
            contentPreview: (r.content || "").slice(0, 220),
        }));

        res.json({ missions, total, limit, offset });
    } catch (err) {
        console.error("❌ /api/missions hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const getMissionDetails = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const report   = await Report.findOne({ threadId: req.params.threadId, clientId });
        if (!report) return res.status(404).json({ error: "Mission not found or access denied" });
        res.json({
            threadId:        report.threadId,
            task:            report.task,
            status:          report.status,
            humanFeedback:   report.humanFeedback,
            createdAt:       report.createdAt,
            content:         report.content,
            confidenceScore: report.confidenceScore,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
