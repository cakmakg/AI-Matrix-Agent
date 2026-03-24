import mongoose from "mongoose";

const InvoiceAuditSchema = new mongoose.Schema(
    {
        threadId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        clientId: {
            type: String,
            default: "default",
            index: true,
        },
        // Tedarikçi bilgileri
        vendorName: {
            type: String,
            default: "",
        },
        vendorEmail: {
            type: String,
            default: "",
        },
        // Fatura tutarları
        invoiceAmount: {
            type: Number,
            default: 0,
        },
        agreedAmount: {
            type: Number,
            default: 0,
        },
        currency: {
            type: String,
            default: "TRY",
        },
        // Anomali tespiti
        anomalyDetected: {
            type: Boolean,
            default: false,
        },
        anomalyType: {
            type: String,
            enum: ["PRICE_MISMATCH", "DUPLICATE_INVOICE", "SUSPICIOUS_VENDOR", "AMOUNT_EXCEEDS_LIMIT", "NONE"],
            default: "NONE",
        },
        anomalyDetails: {
            type: String,
            default: "",
        },
        // Denetçi analizi (Ajan 13 çıktısı)
        auditAnalysis: {
            type: String,
            default: "",
        },
        recommendedAction: {
            type: String,
            enum: ["APPROVE", "REJECT", "ESCALATE", "PENDING"],
            default: "PENDING",
        },
        confidenceScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        // RAG eşleşme sonucu
        ragMatchFound: {
            type: Boolean,
            default: false,
        },
        ragMatchDetails: {
            type: String,
            default: "",
        },
        // Orijinal fatura ham metni (n8n'den gelir)
        rawInvoiceText: {
            type: String,
            default: "",
        },
        // HITL onay akışı
        status: {
            type: String,
            enum: ["AWAITING_APPROVAL", "APPROVED", "REJECTED", "ESCALATED", "POSTED"],
            default: "AWAITING_APPROVAL",
        },
        humanFeedback: {
            type: String,
            default: "",
        },
        // Muhasebe programı entegrasyonu (Xero / QuickBooks)
        externalPostingId: {
            type: String,
            default: "",
        },
        postedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Hızlı sorgular için bileşik indeks
InvoiceAuditSchema.index({ clientId: 1, status: 1, createdAt: -1 });
InvoiceAuditSchema.index({ clientId: 1, anomalyDetected: 1 });

export const InvoiceAudit = mongoose.model("InvoiceAudit", InvoiceAuditSchema);
