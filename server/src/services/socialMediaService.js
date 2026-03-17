/**
 * Social Media Service
 * Handles API calls to: Twitter/X v2, LinkedIn, Instagram Graph, Facebook Pages, Google Ads
 * Uses direct REST calls via axios — no extra SDKs required.
 */

import axios from "axios";
import { SocialAccount } from "../models/SocialAccount.js";

// ─── Twitter / X v2 ────────────────────────────────────────────────────────

/**
 * Post a tweet or thread.
 * For a thread, split content by "---" separator.
 * Uses OAuth 2.0 Bearer token (user auth).
 */
export async function postToTwitter(content, accountDoc) {
    const { accessToken, accessTokenSecret } = accountDoc;
    const tweets = content.split("\n---\n").map((t) => t.trim()).filter(Boolean);

    let lastTweetId = null;
    const results = [];

    for (const tweetText of tweets) {
        const body = { text: tweetText.slice(0, 280) };
        if (lastTweetId) body.reply = { in_reply_to_tweet_id: lastTweetId };

        // Twitter v2: OAuth 1.0a user context
        const res = await axios.post(
            "https://api.twitter.com/2/tweets",
            body,
            {
                headers: {
                    Authorization: `OAuth oauth_consumer_key="${process.env.TWITTER_API_KEY}",oauth_token="${accessToken}",oauth_signature_method="HMAC-SHA1",oauth_timestamp="${Math.floor(Date.now() / 1000)}",oauth_nonce="${Math.random().toString(36).slice(2)}",oauth_version="1.0",oauth_signature="${accessTokenSecret}"`,
                    "Content-Type": "application/json",
                },
            }
        );

        lastTweetId = res.data?.data?.id;
        results.push(res.data);
    }

    return { platform: "twitter", tweetIds: results.map((r) => r.data?.id), count: results.length };
}

/**
 * Verify Twitter credentials and return account info.
 */
export async function verifyTwitterCredentials(accessToken, accessTokenSecret) {
    // Use Twitter v2 /users/me
    const res = await axios.get("https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url", {
        headers: {
            Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        },
    });
    return {
        accountId: res.data?.data?.id,
        username: res.data?.data?.username,
        followerCount: res.data?.data?.public_metrics?.followers_count ?? 0,
        profileImageUrl: res.data?.data?.profile_image_url ?? "",
    };
}

/**
 * Get recent tweets and basic analytics for a Twitter account.
 */
export async function getTwitterAnalytics(accountDoc) {
    const { accountId } = accountDoc;
    if (!accountId) return { posts: [], platform: "twitter" };

    const res = await axios.get(
        `https://api.twitter.com/2/users/${accountId}/tweets?max_results=10&tweet.fields=public_metrics,created_at`,
        { headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` } }
    );

    const posts = (res.data?.data ?? []).map((t) => ({
        id: t.id,
        content: t.text,
        createdAt: t.created_at,
        likes: t.public_metrics?.like_count ?? 0,
        retweets: t.public_metrics?.retweet_count ?? 0,
        replies: t.public_metrics?.reply_count ?? 0,
        impressions: t.public_metrics?.impression_count ?? 0,
    }));

    return { platform: "twitter", posts };
}

// ─── LinkedIn ────────────────────────────────────────────────────────────────

/**
 * Post a LinkedIn UGC post (text post with optional image).
 * Uses LinkedIn Marketing API v2.
 */
export async function postToLinkedIn(content, accountDoc) {
    const { accessToken, accountId } = accountDoc;

    const body = {
        author: `urn:li:person:${accountId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
            "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: content.slice(0, 3000) },
                shareMediaCategory: "NONE",
            },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const res = await axios.post("https://api.linkedin.com/v2/ugcPosts", body, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        },
    });

    return { platform: "linkedin", postId: res.headers["x-restli-id"] ?? res.data?.id };
}

/**
 * Verify LinkedIn token and return profile info.
 */
export async function verifyLinkedInCredentials(accessToken) {
    const res = await axios.get("https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    const firstName = res.data?.firstName?.localized?.en_US ?? "";
    const lastName = res.data?.lastName?.localized?.en_US ?? "";

    return {
        accountId: res.data?.id,
        username: `${firstName} ${lastName}`.trim(),
        followerCount: 0,
        profileImageUrl: "",
    };
}

/**
 * Get LinkedIn recent posts (shares) and basic engagement.
 */
export async function getLinkedInAnalytics(accountDoc) {
    const { accessToken, accountId } = accountDoc;
    if (!accessToken) return { posts: [], platform: "linkedin" };

    try {
        const res = await axios.get(
            `https://api.linkedin.com/v2/shares?q=owners&owners=urn:li:person:${accountId}&count=10`,
            { headers: { Authorization: `Bearer ${accessToken}`, "X-Restli-Protocol-Version": "2.0.0" } }
        );

        const posts = (res.data?.elements ?? []).map((p) => ({
            id: p.id,
            content: p.text?.text ?? "",
            createdAt: new Date(p.created?.time ?? Date.now()).toISOString(),
            likes: 0,
            comments: 0,
            shares: 0,
        }));

        return { platform: "linkedin", posts };
    } catch {
        return { platform: "linkedin", posts: [] };
    }
}

// ─── Instagram (Meta Graph API) ──────────────────────────────────────────────

/**
 * Post an image + caption to Instagram Business Account.
 * Requires: access_token, instagram_business_account_id (pageId), and imageUrl.
 * Two-step: create container → publish.
 */
export async function postToInstagram(content, imageUrl, accountDoc) {
    const { accessToken, pageId } = accountDoc;

    if (!pageId) throw new Error("Instagram pageId (Business Account ID) gerekli.");
    if (!imageUrl) throw new Error("Instagram için imageUrl gerekli.");

    // Step 1: Create media container
    const containerRes = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/media`,
        { image_url: imageUrl, caption: content.slice(0, 2200), access_token: accessToken }
    );
    const containerId = containerRes.data?.id;
    if (!containerId) throw new Error("Instagram container oluşturulamadı.");

    // Step 2: Publish container
    const publishRes = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/media_publish`,
        { creation_id: containerId, access_token: accessToken }
    );

    return { platform: "instagram", postId: publishRes.data?.id };
}

/**
 * Verify Instagram credentials: return connected business account info.
 */
export async function verifyInstagramCredentials(accessToken, pageId) {
    const res = await axios.get(
        `https://graph.facebook.com/v19.0/${pageId}?fields=id,username,followers_count,profile_picture_url&access_token=${accessToken}`
    );
    return {
        accountId: res.data?.id,
        username: res.data?.username ?? "",
        followerCount: res.data?.followers_count ?? 0,
        profileImageUrl: res.data?.profile_picture_url ?? "",
    };
}

/**
 * Get recent Instagram posts and basic metrics.
 */
export async function getInstagramAnalytics(accountDoc) {
    const { accessToken, pageId } = accountDoc;
    if (!pageId) return { posts: [], platform: "instagram" };

    try {
        const res = await axios.get(
            `https://graph.facebook.com/v19.0/${pageId}/media?fields=id,caption,timestamp,like_count,comments_count&limit=10&access_token=${accessToken}`
        );

        const posts = (res.data?.data ?? []).map((p) => ({
            id: p.id,
            content: p.caption ?? "",
            createdAt: p.timestamp,
            likes: p.like_count ?? 0,
            comments: p.comments_count ?? 0,
        }));

        return { platform: "instagram", posts };
    } catch {
        return { platform: "instagram", posts: [] };
    }
}

// ─── Facebook Page (Meta Graph API) ─────────────────────────────────────────

/**
 * Post to a Facebook Page.
 */
export async function postToFacebook(content, accountDoc) {
    const { accessToken, pageId } = accountDoc;
    if (!pageId) throw new Error("Facebook pageId gerekli.");

    const res = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/feed`,
        { message: content.slice(0, 63206), access_token: accessToken }
    );

    return { platform: "facebook", postId: res.data?.id };
}

/**
 * Verify Facebook page credentials.
 */
export async function verifyFacebookCredentials(accessToken, pageId) {
    const res = await axios.get(
        `https://graph.facebook.com/v19.0/${pageId}?fields=id,name,fan_count,picture&access_token=${accessToken}`
    );
    return {
        accountId: res.data?.id,
        username: res.data?.name ?? "",
        followerCount: res.data?.fan_count ?? 0,
        profileImageUrl: res.data?.picture?.data?.url ?? "",
    };
}

/**
 * Get recent Facebook page posts.
 */
export async function getFacebookAnalytics(accountDoc) {
    const { accessToken, pageId } = accountDoc;
    if (!pageId) return { posts: [], platform: "facebook" };

    try {
        const res = await axios.get(
            `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true)&limit=10&access_token=${accessToken}`
        );

        const posts = (res.data?.data ?? []).map((p) => ({
            id: p.id,
            content: p.message ?? "",
            createdAt: p.created_time,
            likes: p.likes?.summary?.total_count ?? 0,
            comments: p.comments?.summary?.total_count ?? 0,
        }));

        return { platform: "facebook", posts };
    } catch {
        return { platform: "facebook", posts: [] };
    }
}

// ─── Google Ads ───────────────────────────────────────────────────────────────

/**
 * Create a responsive search ad in Google Ads.
 * Uses Google Ads REST API (v16).
 * Requires: customer_id, developer_token, access_token.
 */
export async function createGoogleAd(adData, accountDoc) {
    const { accessToken, customerId } = accountDoc;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

    if (!customerId || !developerToken) {
        throw new Error("Google Ads customerId ve GOOGLE_ADS_DEVELOPER_TOKEN gerekli.");
    }

    // adData: { campaignResourceName, adGroupResourceName, headlines[], descriptions[], finalUrls[] }
    const ad = {
        adGroupAd: {
            ad: {
                responsiveSearchAd: {
                    headlines: (adData.headlines ?? []).slice(0, 15).map((h) => ({
                        text: h.slice(0, 30),
                    })),
                    descriptions: (adData.descriptions ?? []).slice(0, 4).map((d) => ({
                        text: d.slice(0, 90),
                    })),
                    finalUrls: adData.finalUrls ?? [],
                },
            },
            status: "PAUSED", // Starts paused — user activates manually
            adGroup: adData.adGroupResourceName,
        },
    };

    const res = await axios.post(
        `https://googleads.googleapis.com/v16/customers/${customerId}/adGroupAds:mutate`,
        { operations: [{ create: ad.adGroupAd }] },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "developer-token": developerToken,
                ...(loginCustomerId ? { "login-customer-id": loginCustomerId } : {}),
                "Content-Type": "application/json",
            },
        }
    );

    return { platform: "google_ads", resourceName: res.data?.results?.[0]?.resourceName };
}

/**
 * Verify Google Ads credentials — list accessible customer accounts.
 */
export async function verifyGoogleAdsCredentials(accessToken) {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const res = await axios.get(
        "https://googleads.googleapis.com/v16/customers:listAccessibleCustomers",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "developer-token": developerToken,
            },
        }
    );
    const resourceNames = res.data?.resourceNames ?? [];
    const customerId = resourceNames[0]?.split("/")[1] ?? "";
    return {
        accountId: customerId,
        username: `Google Ads #${customerId}`,
        followerCount: 0,
        profileImageUrl: "",
    };
}

/**
 * Get Google Ads campaign performance summary.
 */
export async function getGoogleAdsAnalytics(accountDoc) {
    const { accessToken, customerId } = accountDoc;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    if (!customerId) return { platform: "google_ads", campaigns: [] };

    try {
        const query = `SELECT campaign.id, campaign.name, campaign.status, metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.impressions DESC LIMIT 10`;
        const res = await axios.post(
            `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`,
            { query },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "developer-token": developerToken,
                    "Content-Type": "application/json",
                },
            }
        );

        const campaigns = (res.data ?? []).flatMap((batch) =>
            (batch.results ?? []).map((row) => ({
                id: row.campaign?.id,
                name: row.campaign?.name,
                status: row.campaign?.status,
                impressions: row.metrics?.impressions ?? 0,
                clicks: row.metrics?.clicks ?? 0,
                costMicros: row.metrics?.costMicros ?? 0,
            }))
        );

        return { platform: "google_ads", campaigns };
    } catch {
        return { platform: "google_ads", campaigns: [] };
    }
}

// ─── Universal Dispatcher ────────────────────────────────────────────────────

/**
 * Publish a ScheduledPost to all specified platforms.
 * Fetches account credentials from DB and dispatches per platform.
 */
export async function publishScheduledPost(scheduledPost) {
    const results = {};

    for (const platform of scheduledPost.platforms) {
        try {
            const account = await SocialAccount.findOne({ platform, isConnected: true }).lean();
            if (!account) {
                results[platform] = { success: false, error: "Hesap bağlı değil." };
                continue;
            }

            let result;
            if (platform === "twitter") {
                result = await postToTwitter(scheduledPost.content, account);
            } else if (platform === "linkedin") {
                result = await postToLinkedIn(scheduledPost.content, account);
            } else if (platform === "instagram") {
                const imageUrl = scheduledPost.mediaUrls?.[0] ?? null;
                if (!imageUrl) {
                    results[platform] = { success: false, error: "Instagram için resim URL gerekli." };
                    continue;
                }
                result = await postToInstagram(scheduledPost.content, imageUrl, account);
            } else if (platform === "facebook") {
                result = await postToFacebook(scheduledPost.content, account);
            } else if (platform === "google_ads") {
                // Google Ads requires structured ad data — use content as headline
                const adData = {
                    headlines: [scheduledPost.content.slice(0, 30)],
                    descriptions: [scheduledPost.content.slice(0, 90)],
                    finalUrls: [process.env.GOOGLE_ADS_DEFAULT_URL ?? "https://example.com"],
                    adGroupResourceName: process.env.GOOGLE_ADS_DEFAULT_AD_GROUP ?? "",
                };
                result = await createGoogleAd(adData, account);
            }

            results[platform] = { success: true, ...result };
            console.log(`✅ [SOCIAL] ${platform} → gönderildi:`, result);
        } catch (err) {
            results[platform] = { success: false, error: err.message };
            console.error(`❌ [SOCIAL] ${platform} hatası:`, err.message);
        }
    }

    return results;
}

/**
 * Sync account profile info from the platform.
 */
export async function syncAccountInfo(accountId) {
    const account = await SocialAccount.findById(accountId);
    if (!account) throw new Error("Hesap bulunamadı.");

    let info;
    try {
        if (account.platform === "twitter") {
            info = await verifyTwitterCredentials(account.accessToken, account.accessTokenSecret);
        } else if (account.platform === "linkedin") {
            info = await verifyLinkedInCredentials(account.accessToken);
        } else if (account.platform === "instagram") {
            info = await verifyInstagramCredentials(account.accessToken, account.pageId);
        } else if (account.platform === "facebook") {
            info = await verifyFacebookCredentials(account.accessToken, account.pageId);
        } else if (account.platform === "google_ads") {
            info = await verifyGoogleAdsCredentials(account.accessToken);
        }

        if (info) {
            account.username = info.username ?? account.username;
            account.followerCount = info.followerCount ?? account.followerCount;
            account.profileImageUrl = info.profileImageUrl ?? account.profileImageUrl;
            account.lastSynced = new Date();
            account.isConnected = true;
            await account.save();
        }
    } catch (err) {
        account.isConnected = false;
        await account.save();
        throw err;
    }

    return account;
}

/**
 * Get analytics for a specific account.
 */
export async function getAccountAnalytics(accountDoc) {
    const { platform } = accountDoc;
    if (platform === "twitter") return getTwitterAnalytics(accountDoc);
    if (platform === "linkedin") return getLinkedInAnalytics(accountDoc);
    if (platform === "instagram") return getInstagramAnalytics(accountDoc);
    if (platform === "facebook") return getFacebookAnalytics(accountDoc);
    if (platform === "google_ads") return getGoogleAdsAnalytics(accountDoc);
    return { platform, posts: [] };
}
