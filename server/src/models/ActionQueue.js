import mongoose from "mongoose";

/**
 * 🛡️ MOAT Katman 4: Ajan İzolasyon Tamponu
 *
 * Ajanlar doğrudan dış API'lere erişmez.
 * Ajan → ActionQueue (sadece yazma) → ActionWorker (okuma + doğrulama + yürütme)
 *
 * Ajanın "elleri" bu model üzerinden zincirlenmiştir.
 */
const ActionQueueSchema = new mongoose.Schema({
    // Kimin tetiklediği
    threadId:   { type: String, required: true, index: true },
    agentId:    { type: String, required: true },           // "publisher", "cmo", vb.
    clientId:   { type: String, default: "default", index: true },

    // Ne yapılacak — sadece whitelist değerler geçer
    actionType: {
        type: String,
        required: true,
        enum: ["WEBHOOK_N8N", "TELEGRAM", "DISCORD", "TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "GOOGLE_ADS"],
    },

    // Yürütülecek yük (worker tarafından şema doğrulamasına tabi tutulur)
    payload: { type: mongoose.Schema.Types.Mixed, required: true },

    // Durum makinesi
    status: {
        type: String,
        enum: ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REJECTED"],
        default: "PENDING",
        index: true,
    },

    // Sonuç & hata
    result:       { type: String, default: "" },
    errorMessage: { type: String, default: "" },
    attempts:     { type: Number, default: 0 },

    // Zaman damgaları
    createdAt:   { type: Date, default: Date.now, index: true },
    processedAt: { type: Date },
}, { timestamps: false });

// Worker sorgusu için bileşik indeks
ActionQueueSchema.index({ status: 1, createdAt: 1 });

export const ActionQueue = mongoose.model("ActionQueue", ActionQueueSchema);
