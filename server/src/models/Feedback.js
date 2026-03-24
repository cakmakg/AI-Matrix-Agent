import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema(
    {
        threadId:  { type: String, required: true, index: true },
        clientId:  { type: String, default: "default", index: true },
        vote:      { type: String, enum: ["up", "down"], required: true },
        reason:    { type: String, default: "" },
        agentName: { type: String, default: "WRITER" },
    },
    { timestamps: true }
);

// Fast lookup: last N negative feedbacks per tenant
FeedbackSchema.index({ clientId: 1, vote: 1, createdAt: -1 });

export default mongoose.model("Feedback", FeedbackSchema);
