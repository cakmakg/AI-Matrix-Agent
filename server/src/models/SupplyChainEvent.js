import mongoose from "mongoose";

const SupplyChainEventSchema = new mongoose.Schema(
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
        // Ürün bilgileri
        sku: {
            type: String,
            required: true,
        },
        productName: {
            type: String,
            default: "",
        },
        // Stok seviyeleri
        currentStock: {
            type: Number,
            default: 0,
        },
        reorderPoint: {
            type: Number,
            default: 0,
        },
        // Aciliyet tahmini
        daysUntilStockout: {
            type: Number,
            default: 0,
        },
        urgencyLevel: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            default: "MEDIUM",
        },
        // Planlama ajanı analizi (Ajan 14 çıktısı)
        plannerAnalysis: {
            type: String,
            default: "",
        },
        // Tedarikçi sipariş e-postası taslağı (Writer tarafından oluşturulur)
        draftOrderEmail: {
            type: String,
            default: "",
        },
        recommendedOrderQuantity: {
            type: Number,
            default: 0,
        },
        // Tedarikçi bilgileri
        supplierName: {
            type: String,
            default: "",
        },
        supplierEmail: {
            type: String,
            default: "",
        },
        // Olay tipi
        eventType: {
            type: String,
            enum: ["INVENTORY_LOW", "STOCKOUT_IMMINENT", "REORDER_TRIGGERED", "DELIVERY_DELAYED", "VENDOR_ISSUE"],
            default: "INVENTORY_LOW",
        },
        // Kaynak sistem (Shopify, SAP, Akınsoft vb.)
        sourceSystem: {
            type: String,
            default: "manual",
        },
        // HITL onay akışı
        status: {
            type: String,
            enum: ["ALERT", "AWAITING_APPROVAL", "ORDER_SENT", "ACKNOWLEDGED", "RESOLVED"],
            default: "ALERT",
        },
        humanFeedback: {
            type: String,
            default: "",
        },
        // Sipariş gönderim kaydı
        orderSentAt: {
            type: Date,
            default: null,
        },
        externalOrderId: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

// Hızlı sorgular için bileşik indeks
SupplyChainEventSchema.index({ clientId: 1, status: 1, createdAt: -1 });
SupplyChainEventSchema.index({ clientId: 1, urgencyLevel: 1 });
SupplyChainEventSchema.index({ clientId: 1, sku: 1 });

export const SupplyChainEvent = mongoose.model("SupplyChainEvent", SupplyChainEventSchema);
