import mongoose from "mongoose";

const CampaignDraftSchema = new mongoose.Schema(
    {
        threadId: {
            type: String,
            required: true,
            index: true,
        },
        reportTitle: {
            type: String,
            default: "AI Blueprint",
        },
        campaignContent: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["AWAITING_APPROVAL", "PUBLISHED", "REJECTED"],
            default: "AWAITING_APPROVAL",
        },
        humanFeedback: {
            type: String,
            default: "",
        },
        publishedAt: {
            type: Date,
            default: null,
        },
        clientId: {
            type: String,
            default: "default",
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

export const CampaignDraft = mongoose.model("CampaignDraft", CampaignDraftSchema);
