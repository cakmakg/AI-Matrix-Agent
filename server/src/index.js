import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";

import { tenantMiddleware } from "./middleware/tenant.js";
import { globalLimiter, workflowLimiter, approveLimiter, socialLimiter, knowledgeLimiter } from "./middleware/rateLimiter.js";
import routes from "./routes/index.js";
import { startCronJobs } from "./services/cronService.js";
import { startTelegramBot } from "./services/telegramBotService.js";
import { startActionWorker } from "./services/actionWorkerService.js";

const server = express();
server.use(helmet());
server.use(cors());
server.use(express.json({ limit: "2mb" }));  // 🛡️ MOAT: request body boyut sınırı

// 🛡️ MOAT Katman 3: Rate Limiting — global önce, sonra tenant auth
server.use("/api", globalLimiter);
server.use(tenantMiddleware);

// Hassas endpoint'lere özel limitler
server.use("/api/analyze", workflowLimiter);
server.use("/api/rnd",     workflowLimiter);
server.use("/api/approve", approveLimiter);
server.use("/api/social",  socialLimiter);
server.use("/api/knowledge", knowledgeLimiter);

mongoose.connect(process.env.MONGODB)
    .then(() => console.log("📦 MongoDB Atlas Bağlantısı Başarılı!"))
    .catch(err => console.error("❌ MongoDB Hatası:", err));

server.use("/api", routes);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`\n🌐 AI Orkestra Sunucusu Çalışıyor!`);
    console.log(`📡 Port: http://localhost:${PORT}`);
});

startCronJobs();
startTelegramBot();
startActionWorker(); // 🛡️ MOAT Katman 4: Ajan izolasyon worker'ı