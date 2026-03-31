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

        // Per-Tenant-Integrationspunkte (Schritt 3: n8n + Benachrichtigungs-Routing)
        integrations: {
            n8nWebhookUrl:    { type: String, default: "" },
            n8nWebhookSecret: { type: String, default: "" },
            telegramBotToken: { type: String, default: "" },
            telegramChatId:   { type: String, default: "" },
            discordWebhookUrl:{ type: String, default: "" },
        },

        // Autonomer Social-Media-Scheduler (Multi-Mandant, branchenagnostisch)
        socialAuto: {
            isActive:      { type: Boolean, default: false },
            // Zielplattformen — jede Branche kann unterschiedliche Plattformen nutzen
            platforms:     { type: [String], enum: ["twitter", "linkedin", "instagram"], default: ["twitter"] },
            // Inhaltsthemen — branchenabhängig (Immobilien, Finanzen, Gesundheit usw.)
            topics:        { type: [String], default: [] },
            // Markenstimme — "Wer du bist, deine Perspektive"
            persona:       { type: String, default: "" },
            // Schreibton — "authentisch, professionell, provokativ usw."
            voice:         { type: String, default: "" },
            // Sprache — de / en / tr / mixed
            lang:          { type: String, default: "de" },
            // Tägliche Auslöseuhrzeit (0–23 Uhr)
            postHour:      { type: Number, default: 7, min: 0, max: 23 },
            // Anzahl Beiträge pro Thema
            postsPerTopic: { type: Number, default: 3, min: 1, max: 10 },
            // Maximale Hashtag-Anzahl
            maxHashtags:   { type: Number, default: 1, min: 0, max: 5 },
            // HITL-Genehmigungsgate — true: AWAITING_APPROVAL (Mensch prüft), false: PENDING (Automatische Veröffentlichung)
            requireHITL:   { type: Boolean, default: true },
        },
    },
    { timestamps: true }
);

export const TenantConfig = mongoose.model("TenantConfig", TenantConfigSchema);
