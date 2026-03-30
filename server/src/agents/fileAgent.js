import { Report } from "../models/Report.js";

export async function fileNode(state, config) {
    const threadId = config?.configurable?.thread_id;
    const clientId = config?.configurable?.clientId || "default";
    console.log(`💾 Dosya Ajanı (Ajan 4) devrede. İçerik MongoDB'ye kaydediliyor... (threadId: ${threadId}, clientId: ${clientId})`);

    try {
        await Report.findOneAndUpdate(
            { threadId, clientId },
            {
                threadId,
                clientId,
                task: state.task,
                content: state.finalContent,
                status: "AWAITING_APPROVAL",
                confidenceScore: state.confidenceScore || 0,
            },
            { upsert: true, new: true }
        );

        console.log(`✅ Dosya Ajanı: İçerik MongoDB'ye kaydedildi (threadId: ${threadId})`);
        return { fileSaved: true };

    } catch (error) {
        console.error(`❌ Dosya Ajanı Hatası: MongoDB kaydı başarısız! Detay: ${error.message}`);
        return { fileSaved: false };
    }
}
