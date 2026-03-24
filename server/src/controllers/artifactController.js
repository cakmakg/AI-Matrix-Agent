import { Report } from "../models/Report.js";
import Transaction from "../models/Transaction.js";

async function getThreadCost(threadId) {
    try {
        const result = await Transaction.aggregate([
            { $match: { threadId, type: "EXPENSE" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        return result[0]?.total || 0;
    } catch {
        return 0;
    }
}

export const getLatestArtifact = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const report = await Report.findOne({ status: "AWAITING_APPROVAL", clientId }).sort({ createdAt: -1 });
        if (!report) return res.status(404).json({ success: false, error: "No pending reports found." });
        const estimatedCostUsd = await getThreadCost(report.threadId);
        res.json({
            success: true,
            content: report.content,
            status: report.status,
            task: report.task,
            threadId: report.threadId,
            confidenceScore: report.confidenceScore || 0,
            estimatedCostUsd,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getArtifactByThreadId = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const report = await Report.findOne({ threadId: req.params.threadId, clientId });
        if (!report) return res.status(404).json({ error: "Report not found." });
        const estimatedCostUsd = await getThreadCost(report.threadId);
        res.json({
            success: true,
            content: report.content,
            status: report.status,
            task: report.task,
            threadId: report.threadId,
            confidenceScore: report.confidenceScore || 0,
            estimatedCostUsd,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
