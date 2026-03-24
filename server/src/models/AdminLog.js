import mongoose from "mongoose";

/**
 * Admin Audit Log — God Mode'da yapılan tüm aksiyonların kaydı.
 * TTL: 90 gün sonra otomatik temizlenir.
 */
const AdminLogSchema = new mongoose.Schema(
    {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true,
        },
        action: {
            type: String,
            required: true,
            enum: [
                "TENANT_HALTED",
                "TENANT_RESUMED",
                "TENANT_CREATED",
                "TENANT_DELETED",
                "PLAN_CHANGED",
                "TENANT_THROTTLED",
                "IP_BANNED",
                "IP_UNBANNED",
                "WORKFLOW_RETRIED",
                "WORKFLOW_CANCELLED",
                "CONFIG_CHANGED",
                "ADMIN_PROMOTED",
                "ADMIN_DEMOTED",
            ],
        },
        target: {
            type: {
                type: String,
                enum: ["tenant", "ip", "workflow", "config"],
            },
            id: String, // slug, IP adresi veya threadId
        },
        details: { type: mongoose.Schema.Types.Mixed },
    },
    { timestamps: true }
);

// 90 gün sonra otomatik temizle
AdminLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
// Admin bazlı sorgulama
AdminLogSchema.index({ adminId: 1, createdAt: -1 });

export const AdminLog = mongoose.model("AdminLog", AdminLogSchema);
