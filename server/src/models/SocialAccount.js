import mongoose from "mongoose";

const SocialAccountSchema = new mongoose.Schema(
    {
        platform: {
            type: String,
            enum: ["twitter", "instagram", "linkedin", "facebook", "google_ads"],
            required: true,
        },
        label: {
            type: String,
            default: "",
        },
        username: {
            type: String,
            default: "",
        },
        accountId: {
            type: String,
            default: "",
        },
        pageId: {
            type: String,
            default: "",
        },
        accessToken: {
            type: String,
            required: true,
        },
        accessTokenSecret: {
            type: String,
            default: "",
        },
        refreshToken: {
            type: String,
            default: "",
        },
        customerId: {
            type: String,
            default: "",
        },
        isConnected: {
            type: Boolean,
            default: true,
        },
        followerCount: {
            type: Number,
            default: 0,
        },
        profileImageUrl: {
            type: String,
            default: "",
        },
        lastSynced: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

export const SocialAccount = mongoose.model("SocialAccount", SocialAccountSchema);
