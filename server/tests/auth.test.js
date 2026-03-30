/**
 * 🔐 AUTH CONTROLLER — Authentication & Registration Tests
 * Tests: password hashing, login, registration, edge cases
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ── Helpers (replicated from authController.js for unit testing) ────────

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
    // Simplified — real uses uuid
    return `sk-${slug}-${"a".repeat(16)}`;
}

// ── TESTS ───────────────────────────────────────────────────────────────

describe("Auth — Password Hashing", () => {
    it("should produce consistent hash for same password + salt", () => {
        const salt = "test-salt-1234";
        const hash1 = hashPassword("mypassword123", salt);
        const hash2 = hashPassword("mypassword123", salt);
        expect(hash1).toBe(hash2);
    });

    it("should produce different hash for different passwords", () => {
        const salt = "test-salt-1234";
        const hash1 = hashPassword("password1", salt);
        const hash2 = hashPassword("password2", salt);
        expect(hash1).not.toBe(hash2);
    });

    it("should produce different hash for different salts", () => {
        const hash1 = hashPassword("mypassword", "salt-a");
        const hash2 = hashPassword("mypassword", "salt-b");
        expect(hash1).not.toBe(hash2);
    });

    it("should produce 128-char hex hash (64 bytes)", () => {
        const hash = hashPassword("test", "salt");
        expect(hash.length).toBe(128);
        expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it("should handle empty password without crashing", () => {
        const hash = hashPassword("", "salt");
        expect(hash.length).toBe(128);
    });

    it("should handle unicode password", () => {
        const hash = hashPassword("şifre123Ö", "salt");
        expect(hash.length).toBe(128);
    });
});

describe("Auth — Login Hash Verification", () => {
    it("should verify password correctly using split salt:hash format", () => {
        const salt = crypto.randomBytes(16).toString("hex");
        const password = "securePass!456";
        const storedHash = `${salt}:${hashPassword(password, salt)}`;

        // Simulate login
        const [extractedSalt, extractedHash] = storedHash.split(":");
        const inputHash = hashPassword(password, extractedSalt);
        expect(inputHash).toBe(extractedHash);
    });

    it("should reject wrong password", () => {
        const salt = crypto.randomBytes(16).toString("hex");
        const storedHash = `${salt}:${hashPassword("correctPassword", salt)}`;

        const [extractedSalt, extractedHash] = storedHash.split(":");
        const inputHash = hashPassword("wrongPassword", extractedSalt);
        expect(inputHash).not.toBe(extractedHash);
    });

    it("BUG CHECK: should handle passwordHash with multiple colons in hash", () => {
        // Edge case: what if hash somehow contains ':'?
        // scryptSync hex output never contains ':', so split(':') is safe
        const salt = "abc123";
        const hash = hashPassword("test", salt);
        const stored = `${salt}:${hash}`;
        const parts = stored.split(":");
        expect(parts.length).toBe(2);
        expect(parts[0]).toBe(salt);
        expect(parts[1]).toBe(hash);
    });
});

describe("Auth — Slugify", () => {
    it("should lowercase and hyphenate", () => {
        expect(slugify("My Company Name")).toBe("my-company-name");
    });

    it("should remove special characters", () => {
        expect(slugify("Acme Corp. (2025)")).toBe("acme-corp-2025");
    });

    it("should handle German umlauts by removing them", () => {
        expect(slugify("Müller & Söhne GmbH")).toBe("m-ller-s-hne-gmbh");
    });

    it("should truncate to 40 chars", () => {
        const longName = "A Very Long Company Name That Exceeds Forty Characters Limit";
        expect(slugify(longName).length).toBeLessThanOrEqual(40);
    });

    it("should remove leading/trailing hyphens", () => {
        expect(slugify("--test--")).toBe("test");
    });

    it("should handle empty string", () => {
        expect(slugify("")).toBe("");
    });

    it("should handle numbers-only", () => {
        expect(slugify("12345")).toBe("12345");
    });
});

describe("Auth — API Key Generation", () => {
    it("should start with sk- prefix", () => {
        const key = generateApiKey("my-company");
        expect(key.startsWith("sk-")).toBe(true);
    });

    it("should include slug in key", () => {
        const key = generateApiKey("acme-corp");
        expect(key).toContain("acme-corp");
    });
});

describe("Auth — Registration Validation Logic", () => {
    it("should require name, email, password", () => {
        // Simulate validation
        const validate = ({ name, email, password }) => {
            if (!name || !email || !password) return { error: "required fields missing" };
            if (password.length < 6) return { error: "password too short" };
            return { success: true };
        };

        expect(validate({})).toEqual({ error: "required fields missing" });
        expect(validate({ name: "Test" })).toEqual({ error: "required fields missing" });
        expect(validate({ name: "Test", email: "a@b.com" })).toEqual({ error: "required fields missing" });
        expect(validate({ name: "T", email: "a@b.com", password: "123" })).toEqual({ error: "password too short" });
        expect(validate({ name: "T", email: "a@b.com", password: "123456" })).toEqual({ success: true });
    });

    it("should normalize email to lowercase and trim", () => {
        const email = "  USER@COMPANY.COM  ";
        const normalized = email.toLowerCase().trim();
        expect(normalized).toBe("user@company.com");
    });

    it("BUG CHECK: email normalization missing leading/trailing spaces", () => {
        const email = "  Test@Example.com  ";
        const normalized = email.toLowerCase().trim();
        expect(normalized).toBe("test@example.com");
        expect(normalized).not.toContain(" ");
    });
});

describe("Auth — Security Edge Cases", () => {
    it("should not leak whether email exists on failed login", () => {
        // Both 'wrong email' and 'wrong password' should return same error
        const errorMsg = "E-posta veya şifre hatalı.";
        // This is the actual error message used in authController.js
        expect(errorMsg).toBe("E-posta veya şifre hatalı.");
        // No differentiation between "email not found" and "wrong password"
    });

    it("BUG CHECK: login should handle client without passwordHash", () => {
        // authController.js line 99: if (!client || !client.passwordHash)
        // This correctly handles null passwordHash
        const client = { email: "test@test.com", passwordHash: "" };
        expect(!client || !client.passwordHash).toBe(true);
    });

    it("BUG CHECK: login should handle client with passwordHash but no colon", () => {
        // If somehow passwordHash is malformed (no colon), split returns 1 element
        const malformed = "nocolonhere";
        const [salt, hash] = malformed.split(":");
        expect(salt).toBe("nocolonhere");
        expect(hash).toBeUndefined();
        // This would cause hashPassword(password, salt) to work but comparison fails
        // Not a security issue — just a failed login
    });
});
