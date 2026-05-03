import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";

import { tenantMiddleware } from "./middleware/tenant.js";
import { globalLimiter, workflowLimiter, approveLimiter, socialLimiter, knowledgeLimiter, bannedIPMiddleware } from "./middleware/rateLimiter.js";
import routes from "./routes/index.js";
import authRoutes from "./routes/authRoutes.js";
import { startCronJobs } from "./services/cronService.js";
import { startTelegramBot } from "./services/telegramBotService.js";
import { startActionWorker } from "./services/actionWorkerService.js";
import { loadBannedIPCache } from "./controllers/adminController.js";

const server = express();
server.use(helmet());
server.use(cors());
server.use(express.json({ limit: "2mb" }));  // 🛡️ MOAT: request body boyut sınırı

// 🛡️ MOAT Katman 3: Banned IP → Rate Limiting → Tenant Auth
server.use("/api", bannedIPMiddleware);
server.use("/api", globalLimiter);

// Auth endpoint'leri tenantMiddleware'den ÖNCE — API key gerektirmez
server.use("/api/auth", authRoutes);

server.use(tenantMiddleware);

// Hassas endpoint'lere özel limitler
server.use("/api/analyze", workflowLimiter);
server.use("/api/rnd",     workflowLimiter);
server.use("/api/approve", approveLimiter);
server.use("/api/social",  socialLimiter);
server.use("/api/knowledge", knowledgeLimiter);

server.use("/api", routes);

// Global error handler — prevents Express from returning plain-text "Internal Server Error"
server.use((err, req, res, next) => {
    console.error("❌ Unhandled Express error:", err.message);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ error: err.message || "Sunucu hatası." });
});

const PORT = process.env.PORT || 3000;

async function start() {
    try {
        await mongoose.connect(process.env.MONGODB);
        console.log("📦 MongoDB Atlas Bağlantısı Başarılı!");
        await loadBannedIPCache();
    } catch (err) {
        console.error("❌ MongoDB Hatası:", err.message);
        process.exit(1);
    }

    server.listen(PORT, () => {
        console.log(`\n🌐 AI Orkestra Sunucusu Çalışıyor!`);
        console.log(`📡 Port: http://localhost:${PORT}`);
    }).on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.error(`❌ Port ${PORT} zaten kullanımda. Önce çalışan süreci durdurun.`);
        } else {
            console.error("❌ Server hatası:", err.message);
        }
        process.exit(1);
    });

    startCronJobs();
    startTelegramBot();
    startActionWorker(); // 🛡️ MOAT Katman 4: Ajan izolasyon worker'ı
}

start();