import mongoose from "mongoose";

/**
 * ⚙️ Zaman Makinesi (Time Machine) — Per-node workflow state snapshots
 *
 * Her ajan düğümü çalıştıktan sonra o düğümün çıktısı (delta) burada saklanır.
 * Bu sayede admin panelinde her workflow adımı geri oynatılabilir / incelenebilir.
 *
 * TTL: 7 gün — eski snapshot'lar otomatik temizlenir.
 */
const workflowSnapshotSchema = new mongoose.Schema(
    {
        threadId: { type: String, required: true, index: true },
        step:     { type: Number, required: true },

        // Hangi ajan düğümü çalıştı?
        nodeName: { type: String, required: true },

        // Tenant bilgisi
        clientId:   { type: String, default: "default" },
        tenantSlug: { type: String, default: "" },

        // Düğümün döndürdüğü delta (state değişikliği) — büyük string'ler kırpılmış
        output: { type: mongoose.Schema.Types.Mixed, default: {} },

        // O anki kritik state alanları (snapshot)
        keyState: {
            nextAgent:      { type: String, default: "" },
            revisionCount:  { type: Number, default: 0 },
            confidenceScore:{ type: Number, default: 0 },
            threatScore:    { type: Number, default: 0 },
            fileSaved:      { type: Boolean, default: false },
        },
    },
    { timestamps: true }
);

// TTL: 7 gün
workflowSnapshotSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });
// Unique per step
workflowSnapshotSchema.index({ threadId: 1, step: 1 }, { unique: true });

export const WorkflowSnapshot = mongoose.model("WorkflowSnapshot", workflowSnapshotSchema);
