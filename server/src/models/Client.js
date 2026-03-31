import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        apiKey: { type: String, required: true, unique: true },
        sector: { type: String },
        language: { type: String, default: "tr" },
        plan: { type: String, enum: ["free", "pro", "enterprise", "holding"], default: "free" },
        product: {
            type: String,
            enum: ["cx", "growth", "strategy", "backoffice", "engineering", "holding"],
            default: "cx",
        },
        // Admin & Durum
        isAdmin: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ["active", "suspended", "deleted"],
            default: "active",
        },
        suspendedAt:     { type: Date },
        suspendedBy:     { type: String },   // admin clientId
        suspendReason:   { type: String },

        // Auth alanları (Adım 4)
        email:        { type: String, unique: true, sparse: true },
        passwordHash: { type: String, default: "" },
    },
    { timestamps: true }
);

export const Client = mongoose.model("Client", ClientSchema);
