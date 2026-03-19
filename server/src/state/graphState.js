import { Annotation } from "@langchain/langgraph";

export const StateAnnotation = Annotation.Root({
    task: Annotation({ reducer: (x, y) => y ?? x, default: () => "" }),
    nextAgent: Annotation({ reducer: (x, y) => y ?? x, default: () => "orchestrator" }),
    
    // Veriler (null yerine boş string ile başlatıyoruz)
    scrapedData: Annotation({ reducer: (x, y) => y !== "" ? y : x, default: () => "" }),
    analysisReport: Annotation({ reducer: (x, y) => y !== "" ? y : x, default: () => "" }),
    innovatorInsight: Annotation({ reducer: (x, y) => y !== "" ? y : x, default: () => "" }),
    finalContent: Annotation({ reducer: (x, y) => y !== "" ? y : x, default: () => "" }),
    
    // Döngü ve Güvenlik
    criticFeedback: Annotation({ reducer: (x, y) => y ?? x, default: () => "" }),
    isApproved: Annotation({ reducer: (x, y) => y ?? x, default: () => false }),
    revisionCount: Annotation({ reducer: (x, y) => y !== undefined ? x + y : x, default: () => 0 }),
    
    // Yargıç ve Dosya
    fileSaved: Annotation({ reducer: (x, y) => y ?? x, default: () => false }),
    humanApproval: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => null }),
    humanFeedback: Annotation({ reducer: (x, y) => y ?? x, default: () => "" }),
    isPublished: Annotation({ reducer: (x, y) => y ?? x, default: () => false }),

    // 🛡️ MOAT Güvenlik Alanları
    threatScore: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => 0 }),
    blockedReason: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => "" }),
});