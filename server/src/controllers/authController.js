/**
 * Auth Controller — Register & Login
 * Şifre hashing: Node.js built-in crypto.scryptSync (bcrypt gerekmez)
 */

import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { Client } from "../models/Client.js";
import { TenantConfig } from "../models/TenantConfig.js";

// ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────────

function slugify(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
}

function hashPassword(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString("hex");
}

function generateApiKey(slug) {
    return `sk-${slug}-${uuidv4().replace(/-/g, "").slice(0, 16)}`;
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

export const register = async (req, res) => {
    try {
        const { name, email, password, sector } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "name, email ve password zorunludur." });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Şifre en az 6 karakter olmalıdır." });
        }

        const existingEmail = await Client.findOne({ email: email.toLowerCase().trim() });
        if (existingEmail) {
            return res.status(409).json({ error: "Bu e-posta adresi zaten kayıtlı." });
        }

        // Benzersiz slug üret
        let baseSlug = slugify(name);
        let slug = baseSlug;
        let counter = 1;
        while (await Client.findOne({ slug })) {
            slug = `${baseSlug}-${counter++}`;
        }

        const salt = crypto.randomBytes(16).toString("hex");
        const passwordHash = `${salt}:${hashPassword(password, salt)}`;
        const apiKey = generateApiKey(slug);

        const client = await Client.create({
            name,
            slug,
            apiKey,
            email: email.toLowerCase().trim(),
            passwordHash,
            sector: sector || "general",
        });

        // Varsayılan TenantConfig oluştur
        await TenantConfig.create({
            clientId: client._id,
            agentPersona: "You are a professional AI assistant.",
            tone: "Formal, professionell, vertrauenswürdig",
            enabledSkills: [],
        });

        return res.status(201).json({
            success: true,
            apiKey,
            client: { name: client.name, slug: client.slug, email: client.email, plan: client.plan, product: client.product },
        });

    } catch (err) {
        console.error("❌ Register hatası:", err.message);
        res.status(500).json({ error: "Kayıt işlemi başarısız." });
    }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "email ve password zorunludur." });
        }

        const client = await Client.findOne({ email: email.toLowerCase().trim() });
        if (!client || !client.passwordHash) {
            return res.status(401).json({ error: "E-posta veya şifre hatalı." });
        }

        const [salt, storedHash] = client.passwordHash.split(":");
        const inputHash = hashPassword(password, salt);
        if (inputHash !== storedHash) {
            return res.status(401).json({ error: "E-posta veya şifre hatalı." });
        }

        return res.json({
            success: true,
            apiKey: client.apiKey,
            client: { name: client.name, slug: client.slug, email: client.email, plan: client.plan, product: client.product },
        });

    } catch (err) {
        console.error("❌ Login hatası:", err.message);
        res.status(500).json({ error: "Giriş işlemi başarısız." });
    }
};
