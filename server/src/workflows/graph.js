import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { StateAnnotation } from "../state/graphState.js";

// Ajanları İçeri Aktarıyoruz
import { guardrailNode } from "../agents/guardrailAgent.js";
import { orchestratorNode } from "../agents/orchestrator.js";
import { scraperNode } from "../agents/scraperAgent.js";
import { analyzerNode } from "../agents/analyzerAgent.js";
import { innovatorNode } from "../agents/innovatorAgent.js";
import { writerNode } from "../agents/writerAgent.js";
import { criticNode } from "../agents/criticAgent.js";
import { fileNode } from "../agents/fileAgent.js";
import { publisherNode } from "../agents/publisherAgent.js";
import { architectNode } from "../agents/architectAgent.js";
import { salesRepNode } from "../agents/salesAgent.js";
import { auditorNode } from "../agents/auditorAgent.js";
import { supplyChainNode } from "../agents/supplyChainAgent.js";

// 🎯 Yargıç Gölge Düğümü
export const humanNode = () => {
    console.log("👨‍⚖️ Yargıç kararı bekleniyor... Sistem uykuya geçiyor.");
    return {};
};

// 1. LANGGRAPH İŞ AKIŞI VE HAFIZA KURULUMU
const workflow = new StateGraph(StateAnnotation)
    // 🛡️ MOAT Katman 1: Her şeyden önce guardrail
    .addNode("guardrail", guardrailNode)
    .addNode("orchestrator", orchestratorNode)
    .addNode("scraper", scraperNode)
    .addNode("analyzer", analyzerNode)
    .addNode("innovator", innovatorNode)
    .addNode("writer", writerNode)
    .addNode("critic", criticNode)
    .addNode("fileSaver", fileNode)
    .addNode("publisher", publisherNode)
    .addNode("human_approval", humanNode)
    .addNode("architect", architectNode)
    .addNode("salesRep", salesRepNode)
    .addNode("auditor", auditorNode)
    .addNode("supplyChain", supplyChainNode)
    // Guardrail: giriş noktası — tehdit varsa END, yoksa orchestrator
    .addEdge(START, "guardrail")
    .addConditionalEdges("guardrail", (state) => state.nextAgent === "END" ? END : "orchestrator")
    .addEdge("scraper", "orchestrator")
    .addEdge("analyzer", "orchestrator")
    .addEdge("innovator", "orchestrator")
    .addEdge("writer", "orchestrator")
    .addEdge("critic", "orchestrator")
    .addEdge("fileSaver", "orchestrator")
    .addEdge("publisher", "orchestrator")
    .addEdge("human_approval", "orchestrator")
    .addEdge("architect", "orchestrator")
    .addEdge("salesRep", "orchestrator")
    .addEdge("auditor", "orchestrator")
    .addEdge("supplyChain", "orchestrator")
    .addConditionalEdges("orchestrator", (state) => state.nextAgent === "END" ? END : state.nextAgent);

const checkpointer = new MemorySaver();
export const app = workflow.compile({
    checkpointer,
    interruptBefore: ["human_approval"]
});
