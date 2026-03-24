import mongoose from "mongoose";

const ScheduledPostSchema = new mongoose.Schema(
    {
        platforms: {
            type: [String],
            enum: ["twitter", "instagram", "linkedin", "facebook", "google_ads"],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        mediaUrls: {
            type: [String],
            default: [],
        },
        scheduledAt: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "PUBLISHED", "FAILED", "CANCELLED"],
            default: "PENDING",
        },
        publishedAt: {
            type: Date,
            default: null,
        },
        errorMessage: {
            type: String,
            default: "",
        },
        // Links to campaign/report origin (optional)
        threadId: {
            type: String,
            default: null,
        },
        campaignId: {
            type: String,
            default: null,
        },
        // Platform-specific results after publishing
        results: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        // Is this a recurring post?
        recurringCron: {
            type: String,
            default: null,
        },
        title: {
            type: String,
            default: "",
        },
        clientId: {
            type: String,
            default: "default",
            index: true,
        },
    },
    { timestamps: true }
);

// Index for cron job: find PENDING posts due for publishing
ScheduledPostSchema.index({ status: 1, scheduledAt: 1 });

export const ScheduledPost = mongoose.model("ScheduledPost", ScheduledPostSchema);
