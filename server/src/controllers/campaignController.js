import { CampaignDraft } from "../models/CampaignDraft.js";
import { publishCampaign } from "../agents/cmoAgent.js";

export const getPendingCampaigns = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const campaigns = await CampaignDraft
            .find({ status: "AWAITING_APPROVAL", clientId })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        res.json({ campaigns });
    } catch (err) {
        console.error("❌ /api/campaign/pending hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const getCampaignDetails = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const campaign = await CampaignDraft.findOne({ _id: req.params.id, clientId }).lean();
        if (!campaign) return res.status(404).json({ error: "Campaign not found" });
        res.json(campaign);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const approveCampaign = async (req, res) => {
    try {
        const { isApproved, feedback } = req.body;
        const clientId = req.clientId || "default";
        const campaign = await CampaignDraft.findOne({ _id: req.params.id, clientId });
        if (!campaign) return res.status(404).json({ error: "Campaign not found" });

        if (isApproved) {
            publishCampaign(campaign).catch(err =>
                console.error("❌ publishCampaign hatasi:", err.message)
            );
            await CampaignDraft.findByIdAndUpdate(req.params.id, {
                status: "PUBLISHED",
                humanFeedback: feedback || "",
                publishedAt: new Date(),
            });
            console.log(`   📣 Kampanya PUBLISHED — ${campaign.reportTitle}`);
            return res.json({ success: true, status: "PUBLISHED" });
        } else {
            await CampaignDraft.findByIdAndUpdate(req.params.id, {
                status: "REJECTED",
                humanFeedback: feedback || "",
            });
            return res.json({ success: true, status: "REJECTED" });
        }
    } catch (err) {
        console.error("❌ /api/campaign approve hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};
