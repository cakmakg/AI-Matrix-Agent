/**
 * Admin kullanıcısı oluştur / mevcut kullanıcıyı admin yap
 * Kullanım: node scripts/create-admin.js
 */

import mongoose from "mongoose";
import { scryptSync, randomBytes } from "crypto";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const ClientSchema = new mongoose.Schema({
    name:         { type: String, required: true },
    slug:         { type: String, required: true, unique: true },
    apiKey:       { type: String, required: true, unique: true },
    plan:         { type: String, default: "holding" },
    product:      { type: String, default: "holding" },
    isAdmin:      { type: Boolean, default: false },
    status:       { type: String, default: "active" },
    email:        { type: String, unique: true, sparse: true },
    passwordHash: { type: String, default: "" },
}, { timestamps: true });

const Client = mongoose.model("Client", ClientSchema);

function hashPassword(password, salt) {
    return scryptSync(password, salt, 64).toString("hex");
}

async function main() {
    await mongoose.connect(process.env.MONGODB);
    console.log("✅ MongoDB bağlandı\n");

    const EMAIL    = "admin@agentmatrix.io";
    const PASSWORD = "Admin1234!";
    const NAME     = "God Mode Admin";
    const SLUG     = "admin";

    const salt     = randomBytes(16).toString("hex");
    const hash     = hashPassword(PASSWORD, salt);
    const apiKey   = `sk-admin-${randomBytes(8).toString("hex")}`;

    const existing = await Client.findOne({ $or: [{ email: EMAIL }, { slug: SLUG }] });

    if (existing) {
        // Mevcut hesabı admin yap
        existing.isAdmin      = true;
        existing.plan         = "holding";
        existing.status       = "active";
        existing.passwordHash = `${salt}:${hash}`;
        await existing.save();
        console.log("🔄 Mevcut hesap admin olarak güncellendi:");
        console.log(`   E-posta : ${existing.email}`);
        console.log(`   Slug    : ${existing.slug}`);
        console.log(`   API Key : ${existing.apiKey}`);
        console.log(`   Şifre   : ${PASSWORD}  (değiştirildi)\n`);
    } else {
        // Yeni admin hesabı oluştur
        const client = await Client.create({
            name:         NAME,
            slug:         SLUG,
            apiKey,
            plan:         "holding",
            product:      "holding",
            isAdmin:      true,
            status:       "active",
            email:        EMAIL,
            passwordHash: `${salt}:${hash}`,
        });
        console.log("✨ Yeni admin hesabı oluşturuldu:");
        console.log(`   E-posta : ${client.email}`);
        console.log(`   Slug    : ${client.slug}`);
        console.log(`   API Key : ${client.apiKey}`);
        console.log(`   Şifre   : ${PASSWORD}\n`);
    }

    console.log("📌 Frontend'de bu e-posta + şifre ile giriş yap.");
    console.log("   Sidebar'da kırmızı 'GOD MODE' butonu görünecek.\n");

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error("❌ Hata:", err.message);
    process.exit(1);
});