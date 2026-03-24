import Feedback from "../models/Feedback.js";

export const submitFeedback = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const { threadId, vote, reason, agentName } = req.body;

        if (!threadId || !vote) {
            return res.status(400).json({ error: "threadId and vote are required" });
        }
        if (!["up", "down"].includes(vote)) {
            return res.status(400).json({ error: "vote must be 'up' or 'down'" });
        }
        if (vote === "down" && !reason?.trim()) {
            return res.status(400).json({ error: "reason is required for negative feedback" });
        }

        await Feedback.create({
            threadId,
            clientId,
            vote,
            reason: reason?.trim() || "",
            agentName: agentName || "WRITER",
        });

        console.log(`📊 Feedback: ${vote === "up" ? "👍" : "👎"} — Thread: ${threadId.slice(0, 12)}...`);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ /api/feedback hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const getNegativeFeedbacks = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const limit = Math.min(parseInt(req.query.limit) || 3, 10);

        const feedbacks = await Feedback.find({ clientId, vote: "down" })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("reason agentName createdAt");

        res.json({ success: true, feedbacks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
