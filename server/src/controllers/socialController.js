import { SocialAccount } from "../models/SocialAccount.js";
import { ScheduledPost } from "../models/ScheduledPost.js";
import {
    syncAccountInfo,
    getAccountAnalytics,
    publishScheduledPost,
    verifyTwitterCredentials,
    verifyLinkedInCredentials,
    verifyInstagramCredentials,
    verifyFacebookCredentials,
    verifyGoogleAdsCredentials,
} from "../services/socialMediaService.js";

// ─── Accounts ────────────────────────────────────────────────────────────────

/**
 * GET /api/social/accounts
 * List all connected social accounts (tokens redacted).
 */
export async function getAccounts(req, res) {
    try {
        const clientId = req.clientId || "default";
        const accounts = await SocialAccount.find({ clientId }).lean();
        const safe = accounts.map(({ accessToken: _a, accessTokenSecret: _b, refreshToken: _c, ...rest }) => rest);
        res.json({ success: true, accounts: safe });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * POST /api/social/accounts/connect
 * Save (or update) social account credentials.
 * Body: { platform, label, accessToken, accessTokenSecret?, refreshToken?, pageId?, customerId? }
 */
export async function connectAccount(req, res) {
    try {
        const clientId = req.clientId || "default";
        const { platform, label, accessToken, accessTokenSecret, refreshToken, pageId, customerId } = req.body;
        if (!platform || !accessToken) {
            return res.status(400).json({ success: false, error: "platform ve accessToken gerekli." });
        }

        // Verify credentials and fetch profile info
        let info = { accountId: "", username: label || platform, followerCount: 0, profileImageUrl: "" };
        try {
            if (platform === "twitter") info = await verifyTwitterCredentials(accessToken, accessTokenSecret);
            else if (platform === "linkedin") info = await verifyLinkedInCredentials(accessToken);
            else if (platform === "instagram") info = await verifyInstagramCredentials(accessToken, pageId);
            else if (platform === "facebook") info = await verifyFacebookCredentials(accessToken, pageId);
            else if (platform === "google_ads") info = await verifyGoogleAdsCredentials(accessToken);
        } catch (verifyErr) {
            console.warn(`[SOCIAL] Credential verify failed (${platform}):`, verifyErr.message);
            // Continue — save with unverified status
        }

        // Upsert by clientId + platform (tenant-scoped)
        const doc = await SocialAccount.findOneAndUpdate(
            { clientId, platform },
            {
                clientId,
                platform,
                label: label || info.username || platform,
                accessToken,
                accessTokenSecret: accessTokenSecret || "",
                refreshToken: refreshToken || "",
                pageId: pageId || "",
                customerId: customerId || "",
                accountId: info.accountId || "",
                username: info.username || "",
                followerCount: info.followerCount || 0,
                profileImageUrl: info.profileImageUrl || "",
                isConnected: true,
                lastSynced: new Date(),
            },
            { upsert: true, returnDocument: "after" }
        );

        const { accessToken: _a, accessTokenSecret: _b, refreshToken: _c, ...safe } = doc.toObject();
        res.json({ success: true, account: safe });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * DELETE /api/social/accounts/:id
 * Disconnect (delete) a social account.
 */
export async function disconnectAccount(req, res) {
    try {
        const clientId = req.clientId || "default";
        const deleted = await SocialAccount.findOneAndDelete({ _id: req.params.id, clientId });
        if (!deleted) return res.status(404).json({ success: false, error: "Hesap bulunamadı." });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * POST /api/social/accounts/:id/sync
 * Refresh account profile info from platform.
 */
export async function syncAccount(req, res) {
    try {
        const clientId = req.clientId || "default";
        const existing = await SocialAccount.findOne({ _id: req.params.id, clientId });
        if (!existing) return res.status(404).json({ success: false, error: "Hesap bulunamadı." });
        const account = await syncAccountInfo(req.params.id);
        const { accessToken: _a, accessTokenSecret: _b, refreshToken: _c, ...safe } = account.toObject();
        res.json({ success: true, account: safe });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * GET /api/social/accounts/:id/analytics
 * Fetch recent posts + metrics for a specific account.
 */
export async function getAnalytics(req, res) {
    try {
        const clientId = req.clientId || "default";
        const account = await SocialAccount.findOne({ _id: req.params.id, clientId }).lean();
        if (!account) return res.status(404).json({ success: false, error: "Hesap bulunamadı." });
        const analytics = await getAccountAnalytics(account);
        res.json({ success: true, ...analytics });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// ─── Scheduled Posts ─────────────────────────────────────────────────────────

/**
 * GET /api/social/posts
 * List scheduled and recent posts.
 * Query: status (PENDING|PUBLISHED|FAILED|CANCELLED), limit
 */
export async function getPosts(req, res) {
    try {
        const clientId = req.clientId || "default";
        const { status, limit = 50 } = req.query;
        const filter = status
            ? { clientId, status }
            : { clientId, status: { $in: ["AWAITING_APPROVAL", "PENDING", "PUBLISHED", "FAILED"] } };
        const posts = await ScheduledPost.find(filter)
            .sort({ scheduledAt: -1 })
            .limit(Number(limit))
            .lean();
        res.json({ success: true, posts });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * POST /api/social/posts
 * Create a new scheduled post.
 * Body: { platforms[], content, scheduledAt, mediaUrls?, title?, threadId?, campaignId? }
 */
export async function createPost(req, res) {
    try {
        const clientId = req.clientId || "default";
        const { platforms, content, scheduledAt, mediaUrls, title, threadId, campaignId } = req.body;
        if (!platforms?.length || !content || !scheduledAt) {
            return res.status(400).json({ success: false, error: "platforms, content ve scheduledAt gerekli." });
        }

        const post = await ScheduledPost.create({
            clientId,
            platforms,
            content,
            mediaUrls: mediaUrls ?? [],
            scheduledAt: new Date(scheduledAt),
            title: title || "",
            threadId: threadId || null,
            campaignId: campaignId || null,
            status: "PENDING",
        });

        res.json({ success: true, post });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * DELETE /api/social/posts/:id
 * Cancel a pending scheduled post.
 */
export async function cancelPost(req, res) {
    try {
        const clientId = req.clientId || "default";
        const post = await ScheduledPost.findOne({ _id: req.params.id, clientId });
        if (!post) return res.status(404).json({ success: false, error: "Post bulunamadı." });
        if (post.status !== "PENDING" && post.status !== "AWAITING_APPROVAL") {
            return res.status(400).json({ success: false, error: "Sadece PENDING veya AWAITING_APPROVAL postlar iptal edilebilir." });
        }
        post.status = "CANCELLED";
        await post.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * POST /api/social/posts/:id/publish
 * Immediately publish a specific post (bypasses schedule).
 */
export async function publishNow(req, res) {
    try {
        const clientId = req.clientId || "default";
        const post = await ScheduledPost.findOne({ _id: req.params.id, clientId });
        if (!post) return res.status(404).json({ success: false, error: "Post bulunamadı." });
        if (post.status === "PUBLISHED") {
            return res.status(400).json({ success: false, error: "Post zaten yayınlandı." });
        }

        const results = await publishScheduledPost(post);
        const hasError = Object.values(results).some((r) => !r.success);

        post.status = hasError ? "FAILED" : "PUBLISHED";
        post.publishedAt = new Date();
        post.results = results;
        if (hasError) {
            post.errorMessage = Object.entries(results)
                .filter(([, v]) => !v.success)
                .map(([k, v]) => `${k}: ${v.error}`)
                .join("; ");
        }
        await post.save();

        res.json({ success: true, results, status: post.status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * POST /api/social/posts/:id/approve
 * Approve an AWAITING_APPROVAL post → moves it to PENDING for scheduled publishing.
 */
export async function approvePost(req, res) {
    try {
        const clientId = req.clientId || "default";
        const post = await ScheduledPost.findOne({ _id: req.params.id, clientId });
        if (!post) return res.status(404).json({ success: false, error: "Post bulunamadı." });
        if (post.status !== "AWAITING_APPROVAL") {
            return res.status(400).json({ success: false, error: "Sadece AWAITING_APPROVAL postlar onaylanabilir." });
        }
        post.status = "PENDING";
        await post.save();
        res.json({ success: true, status: post.status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * GET /api/social/summary
 * Quick stats: connected accounts count, pending posts count, published this week.
 */
export async function getSummary(req, res) {
    try {
        const clientId = req.clientId || "default";
        const [connectedCount, pendingCount, publishedThisWeek] = await Promise.all([
            SocialAccount.countDocuments({ clientId, isConnected: true }),
            ScheduledPost.countDocuments({ clientId, status: "PENDING" }),
            ScheduledPost.countDocuments({
                clientId,
                status: "PUBLISHED",
                publishedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            }),
        ]);
        res.json({ success: true, connectedCount, pendingCount, publishedThisWeek });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}
