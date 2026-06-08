import { addKnowledgeToDB, addPdfToKnowledge, addUrlToKnowledge, searchKnowledge, listKnowledge, deleteKnowledge } from "../services/ragService.js";

// Tenant isolation guard: route :clientId must match the authenticated tenant.
function assertOwnTenant(req, res) {
    const authClientId = req.tenant?.client?._id?.toString();
    if (!authClientId) {
        res.status(401).json({ error: "Tenant context fehlt." });
        return null;
    }
    const requested = req.params.clientId;
    if (requested && requested !== authClientId) {
        console.warn(`🚫 Cross-tenant Knowledge access blocked: ${req.tenant.client.slug} tried to read ${requested}`);
        res.status(403).json({ error: "Zugriff auf fremden Tenant verweigert." });
        return null;
    }
    return authClientId;
}

export const listClientKnowledge = async (req, res) => {
    try {
        const clientId = assertOwnTenant(req, res);
        if (!clientId) return;
        const docs = await listKnowledge(clientId);
        res.json({ docs });
    } catch (err) {
        console.error("❌ /api/knowledge GET hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const createKnowledge = async (req, res) => {
    try {
        const clientId = req.tenant?.client?._id?.toString();
        if (!clientId) {
            return res.status(401).json({ error: "Tenant context fehlt." });
        }
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: "title und content sind erforderlich." });
        }
        const result = await addKnowledgeToDB(clientId, title, content);
        res.json({ success: true, saved: result?.saved ?? 0, title });
    } catch (err) {
        console.error("❌ /api/knowledge POST hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const deleteClientKnowledge = async (req, res) => {
    try {
        const clientId = assertOwnTenant(req, res);
        if (!clientId) return;
        await deleteKnowledge(req.params.id, clientId);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ /api/knowledge DELETE hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const searchClientKnowledge = async (req, res) => {
    try {
        const clientId = req.tenant?.client?._id?.toString();
        if (!clientId) return res.status(401).json({ error: "Tenant context fehlt." });
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "query erforderlich." });
        const { context, sources } = await searchKnowledge(clientId, query);
        res.json({ success: true, context, sources });
    } catch (err) {
        console.error("❌ /api/knowledge/search hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const uploadPdfKnowledge = async (req, res) => {
    try {
        const clientId = req.tenant?.client?._id?.toString();
        if (!clientId) return res.status(401).json({ error: "Tenant context fehlt." });
        if (!req.file) return res.status(400).json({ error: "Es werden nur PDF-Dateien unterstützt." });

        const result = await addPdfToKnowledge(clientId, req.file.originalname, req.file.buffer);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("❌ /api/knowledge/upload hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const addUrlKnowledge = async (req, res) => {
    try {
        const clientId = req.tenant?.client?._id?.toString();
        if (!clientId) return res.status(401).json({ error: "Tenant context fehlt." });
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "url erforderlich." });

        new URL(url);

        const result = await addUrlToKnowledge(clientId, url);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("❌ /api/knowledge/url hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};
