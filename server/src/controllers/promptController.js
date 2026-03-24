import { DEFAULT_PROMPTS, getPrompt, savePrompt, deletePrompt } from "../services/promptRepository.js";

const ALLOWED_AGENTS = ["ANALYZER", "CRITIC", "WRITER"];

export const getAllPrompts = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const result = {};
        await Promise.all(
            ALLOWED_AGENTS.map(async (agent) => {
                const custom = await getPrompt(agent, clientId);
                result[agent] = {
                    current:    custom || DEFAULT_PROMPTS[agent],
                    isCustom:   !!custom,
                    default:    DEFAULT_PROMPTS[agent],
                };
            })
        );
        res.json({ success: true, prompts: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updatePrompt = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const agentName = req.params.agent?.toUpperCase();
        if (!ALLOWED_AGENTS.includes(agentName)) {
            return res.status(400).json({ error: `Unknown agent. Use: ${ALLOWED_AGENTS.join(", ")}` });
        }
        const { promptText } = req.body;
        if (!promptText?.trim()) {
            return res.status(400).json({ error: "promptText is required" });
        }
        await savePrompt(agentName, promptText.trim(), clientId);
        console.log(`✏️ Prompt güncellendi: ${agentName} (client: ${clientId})`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const resetPrompt = async (req, res) => {
    try {
        const clientId = req.clientId || "default";
        const agentName = req.params.agent?.toUpperCase();
        if (!ALLOWED_AGENTS.includes(agentName)) {
            return res.status(400).json({ error: `Unknown agent. Use: ${ALLOWED_AGENTS.join(", ")}` });
        }
        await deletePrompt(agentName, clientId);
        console.log(`🔄 Prompt sıfırlandı: ${agentName} (client: ${clientId})`);
        res.json({ success: true, default: DEFAULT_PROMPTS[agentName] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
