import mongoose from "mongoose";

const SystemPromptSchema = new mongoose.Schema(
    {
        agentName:  { type: String, required: true },   // "ANALYZER" | "CRITIC" | "WRITER"
        promptText: { type: String, required: true },
        clientId:   { type: String, default: "default" },
    },
    { timestamps: true }
);

// One prompt per agent per tenant
SystemPromptSchema.index({ agentName: 1, clientId: 1 }, { unique: true });

export default mongoose.model("SystemPrompt", SystemPromptSchema);
