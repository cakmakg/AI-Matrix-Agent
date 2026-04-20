import { addKnowledgeToDB, addPdfToKnowledge, addUrlToKnowledge, searchKnowledge, listKnowledge, deleteKnowledge } from "../services/ragService.js";

export const listClientKnowledge = async (req, res) => {
    try {
        const docs = await listKnowledge(req.params.clientId);
        res.json({ docs });
    } catch (err) {
        console.error("❌ /api/knowledge GET hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const createKnowledge = async (req, res) => {
    try {
        const { clientId, title, content } = req.body;
        if (!clientId || !title || !content) {
            return res.status(400).json({ error: "clientId, title ve content zorunludur." });
        }
        const doc = await addKnowledgeToDB(clientId, title, content);
        res.json({ success: true, doc: { _id: doc._id, title: doc.title, createdAt: doc.createdAt } });
    } catch (err) {
        console.error("❌ /api/knowledge POST hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const deleteClientKnowledge = async (req, res) => {
    try {
        await deleteKnowledge(req.params.id, req.params.clientId);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ /api/knowledge DELETE hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const searchClientKnowledge = async (req, res) => {
    try {
        const { clientId, query, topK } = req.body;
        if (!clientId || !query) {
            return res.status(400).json({ error: "clientId ve query zorunludur." });
        }
        const { context, sources } = await searchKnowledge(clientId, query);
        res.json({ success: true, context, sources });
    } catch (err) {
        console.error("❌ /api/knowledge/search hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const uploadPdfKnowledge = async (req, res) => {
    try {
        const clientId = req.body?.clientId;
        if (!clientId) return res.status(400).json({ error: "clientId zorunludur." });
        if (!req.file) return res.status(400).json({ error: "Sadece PDF dosyaları destekleniyor." });

        const result = await addPdfToKnowledge(clientId, req.file.originalname, req.file.buffer);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("❌ /api/knowledge/upload hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const addUrlKnowledge = async (req, res) => {
    try {
        const { clientId, url } = req.body;
        if (!clientId || !url) return res.status(400).json({ error: "clientId ve url zorunludur." });

        new URL(url);

        const result = await addUrlToKnowledge(clientId, url);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("❌ /api/knowledge/url hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};
