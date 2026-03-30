import mongoose from "mongoose";

const bannedIPSchema = new mongoose.Schema(
    {
        ip: {
            type: String,
            required: true,
            index: true,
        },
        reason: {
            type: String,
            required: true,
        },
        // Hangi tehdit nedeniyle banlandı
        source: {
            type: String,
            enum: ["MANUAL", "AUTO_PROMPT_INJECTION", "AUTO_DDOS", "AUTO_ABUSE"],
            default: "MANUAL",
        },
        // Opsiyonel: sadece belirli bir tenant için mi?
        clientId: {
            type: String,
            default: null,
        },
        // Ban süresi (null = kalıcı)
        expiresAt: {
            type: Date,
            default: null,
        },
        bannedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Compound index: hızlı aktif ban sorgusu
bannedIPSchema.index({ ip: 1, isActive: 1 });
// TTL index: süreli banları otomatik temizle
bannedIPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $ne: null } } });

export const BannedIP = mongoose.model("BannedIP", bannedIPSchema);
