import mongoose from "mongoose";

const TenantConfigSchema = new mongoose.Schema(
    {
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true,
            unique: true,
        },
        agentPersona: { type: String, default: "You are a professional AI assistant." },
        tone: { type: String, default: "Kibar, profesyonel, güven verici" },
        companyContext: { type: String, default: "" },
        supportInstructions: { type: String, default: "" },
        enabledSkills: { type: [String], default: [] },
        skillConfigs: { type: Object, default: {} },

        // Per-tenant integration endpoints (Adım 3: n8n + bildirim yönlendirmesi)
        integrations: {
            n8nWebhookUrl:    { type: String, default: "" },
            n8nWebhookSecret: { type: String, default: "" },
            telegramBotToken: { type: String, default: "" },
            telegramChatId:   { type: String, default: "" },
            discordWebhookUrl:{ type: String, default: "" },
        },
    },
    { timestamps: true }
);

export const TenantConfig = mongoose.model("TenantConfig", TenantConfigSchema);
