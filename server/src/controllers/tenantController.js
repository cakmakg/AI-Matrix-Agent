import { TenantConfig } from "../models/TenantConfig.js";

// PUT /api/tenant/integrations — Mandantenspezifische Webhook-URLs aktualisieren (Schritt 3)
export const updateTenantIntegrations = async (req, res) => {
    try {
        if (!req.tenant?.client) return res.status(401).json({ error: "Unauthorized" });
        const { n8nWebhookUrl, n8nWebhookSecret, telegramBotToken, telegramChatId, discordWebhookUrl } = req.body;

        const updateObj = {};
        if (n8nWebhookUrl     !== undefined) updateObj["integrations.n8nWebhookUrl"]     = n8nWebhookUrl;
        if (n8nWebhookSecret  !== undefined) updateObj["integrations.n8nWebhookSecret"]  = n8nWebhookSecret;
        if (telegramBotToken  !== undefined) updateObj["integrations.telegramBotToken"]  = telegramBotToken;
        if (telegramChatId    !== undefined) updateObj["integrations.telegramChatId"]    = telegramChatId;
        if (discordWebhookUrl !== undefined) updateObj["integrations.discordWebhookUrl"] = discordWebhookUrl;

        const config = await TenantConfig.findOneAndUpdate(
            { clientId: req.tenant.client._id },
            { $set: updateObj },
            { new: true, upsert: true }
        );
        res.json({ success: true, integrations: config.integrations });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getTenantConfig = async (req, res) => {
    res.json({ success: true, client: req.tenant?.client, config: req.tenant?.config });
};

export const updateTenantConfig = async (req, res) => {
    try {
        if (!req.tenant?.client) return res.status(401).json({ error: "Unauthorized" });
        const { agentPersona, tone, companyContext, supportInstructions, enabledSkills, skillConfigs, socialAuto } = req.body;

        const updateObj = {};
        if (agentPersona         !== undefined) updateObj.agentPersona         = agentPersona;
        if (tone                 !== undefined) updateObj.tone                 = tone;
        if (companyContext       !== undefined) updateObj.companyContext       = companyContext;
        if (supportInstructions  !== undefined) updateObj.supportInstructions  = supportInstructions;
        if (enabledSkills        !== undefined) updateObj.enabledSkills        = enabledSkills;
        if (skillConfigs         !== undefined) updateObj.skillConfigs         = skillConfigs;
        // Autonomer Social-Media-Scheduler — vollständiges Objekt ersetzen
        if (socialAuto           !== undefined) updateObj.socialAuto           = socialAuto;

        const config = await TenantConfig.findOneAndUpdate(
            { clientId: req.tenant.client._id },
            { $set: updateObj },
            { new: true, upsert: true }
        );
        res.json({ success: true, config });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
