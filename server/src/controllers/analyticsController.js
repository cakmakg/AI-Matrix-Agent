import Transaction from "../models/Transaction.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { ScheduledPost } from "../models/ScheduledPost.js";
import { Report } from "../models/Report.js";

/**
 * GET /api/analytics/finance
 * CFO Dashboard — monthly revenue vs expenses, agent cost breakdown
 */
export const getFinanceAnalytics = async (req, res) => {
    try {
        const clientId = req.clientId;
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const [monthlyAgg, agentAgg] = await Promise.all([
            Transaction.aggregate([
                {
                    $match: {
                        clientId,
                        createdAt: { $gte: sixMonthsAgo },
                    },
                },
                {
                    $group: {
                        _id: {
                            month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                            type: "$type",
                        },
                        total: { $sum: "$amount" },
                    },
                },
                { $sort: { "_id.month": 1 } },
            ]),
            Transaction.aggregate([
                {
                    $match: {
                        clientId,
                        type: "EXPENSE",
                        createdAt: { $gte: sixMonthsAgo },
                    },
                },
                {
                    $group: {
                        _id: "$agentName",
                        cost: { $sum: "$amount" },
                        calls: { $sum: 1 },
                    },
                },
                { $sort: { cost: -1 } },
            ]),
        ]);

        // Pivot monthly aggregation into { month, revenue, expenses, net }
        const monthMap = {};
        for (const row of monthlyAgg) {
            const month = row._id.month;
            if (!monthMap[month]) {
                monthMap[month] = { month, revenue: 0, expenses: 0, net: 0 };
            }
            if (row._id.type === "REVENUE") {
                monthMap[month].revenue = row.total;
            } else {
                monthMap[month].expenses = row.total;
            }
        }
        const monthlyTrend = Object.values(monthMap).map((m) => ({
            ...m,
            net: m.revenue - m.expenses,
        }));

        const agentBreakdown = agentAgg.map((a) => ({
            name: a._id,
            cost: a.cost,
            calls: a.calls,
        }));

        res.json({ success: true, data: { monthlyTrend, agentBreakdown } });
    } catch (err) {
        console.error("analyticsController.getFinanceAnalytics error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/analytics/support
 * CX Dashboard — platform distribution, weekly trend, category breakdown
 */
export const getSupportAnalytics = async (req, res) => {
    try {
        const clientId = req.clientId;
        const now = new Date();
        const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

        const [platformAgg, weeklyAgg, categoryAgg] = await Promise.all([
            SupportTicket.aggregate([
                { $match: { clientId } },
                { $group: { _id: "$platform", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            SupportTicket.aggregate([
                { $match: { clientId, createdAt: { $gte: fourWeeksAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            SupportTicket.aggregate([
                { $match: { clientId } },
                { $group: { _id: "$category", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
        ]);

        const platformDist = platformAgg.map((p) => ({
            platform: p._id,
            count: p.count,
        }));
        const weeklyTrend = weeklyAgg.map((w) => ({
            date: w._id,
            count: w.count,
        }));
        const categoryDist = categoryAgg.map((c) => ({
            category: c._id,
            count: c.count,
        }));

        res.json({ success: true, data: { platformDist, weeklyTrend, categoryDist } });
    } catch (err) {
        console.error("analyticsController.getSupportAnalytics error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/analytics/social
 * Growth Dashboard — daily post count (30 days), platform success/fail
 */
export const getSocialAnalytics = async (req, res) => {
    try {
        const clientId = req.clientId;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [dailyAgg, platformAgg] = await Promise.all([
            ScheduledPost.aggregate([
                { $match: { clientId, createdAt: { $gte: thirtyDaysAgo } } },
                { $unwind: "$platforms" },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                            platform: "$platforms",
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { "_id.date": 1 } },
            ]),
            ScheduledPost.aggregate([
                { $match: { clientId } },
                { $unwind: "$platforms" },
                {
                    $group: {
                        _id: "$platforms",
                        published: {
                            $sum: { $cond: [{ $eq: ["$status", "PUBLISHED"] }, 1, 0] },
                        },
                        failed: {
                            $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] },
                        },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        const dailyTrend = dailyAgg.map((d) => ({
            date: d._id.date,
            count: d.count,
            platform: d._id.platform,
        }));
        const platformPerformance = platformAgg.map((p) => ({
            platform: p._id,
            published: p.published,
            failed: p.failed,
        }));

        res.json({ success: true, data: { dailyTrend, platformPerformance } });
    } catch (err) {
        console.error("analyticsController.getSocialAnalytics error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/analytics/strategy
 * Strategy Dashboard — reports by type prefix, weekly production trend
 */
export const getStrategyAnalytics = async (req, res) => {
    try {
        const clientId = req.clientId;
        const prefixes = ["INNOVATION_RADAR", "TREND_RADAR", "BUSINESS_STRESS_TEST"];

        const prefixRegex = new RegExp(`^(${prefixes.join("|")})`);

        const [reportsByType, weeklyAgg] = await Promise.all([
            Report.aggregate([
                { $match: { clientId, task: { $regex: prefixRegex } } },
                {
                    $addFields: {
                        taskType: {
                            $switch: {
                                branches: prefixes.map((p) => ({
                                    case: {
                                        $regexMatch: { input: "$task", regex: new RegExp(`^${p}`) },
                                    },
                                    then: p,
                                })),
                                default: "OTHER",
                            },
                        },
                    },
                },
                { $group: { _id: "$taskType", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            Report.aggregate([
                { $match: { clientId, task: { $regex: prefixRegex } } },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-W%V", date: "$createdAt" },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        res.json({
            success: true,
            data: {
                reportsByType: reportsByType.map((r) => ({ type: r._id, count: r.count })),
                weeklyTrend: weeklyAgg.map((w) => ({ week: w._id, count: w.count })),
            },
        });
    } catch (err) {
        console.error("analyticsController.getStrategyAnalytics error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/analytics/supply
 * Supply Chain Dashboard — urgency distribution, weekly alert trend
 */
export const getSupplyAnalytics = async (req, res) => {
    try {
        const clientId = req.clientId;
        const stockPrefix = /^STOCK_CHECK/;

        const [urgencyAgg, weeklyAgg] = await Promise.all([
            Report.aggregate([
                { $match: { clientId, task: { $regex: stockPrefix } } },
                {
                    $addFields: {
                        urgencyLevel: {
                            $switch: {
                                branches: [
                                    {
                                        case: { $gte: ["$confidenceScore", 0.8] },
                                        then: "critical",
                                    },
                                    {
                                        case: { $gte: ["$confidenceScore", 0.5] },
                                        then: "warning",
                                    },
                                ],
                                default: "normal",
                            },
                        },
                    },
                },
                { $group: { _id: "$urgencyLevel", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            Report.aggregate([
                { $match: { clientId, task: { $regex: stockPrefix } } },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                        },
                        alerts: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        res.json({
            success: true,
            data: {
                urgencyDist: urgencyAgg.map((u) => ({ level: u._id, count: u.count })),
                weeklyTrend: weeklyAgg.map((w) => ({ date: w._id, alerts: w.alerts })),
            },
        });
    } catch (err) {
        console.error("analyticsController.getSupplyAnalytics error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/analytics/engineering
 * Engineering Dashboard — hourly token burn, agent call counts, weekly blueprints
 */
export const getEngineeringAnalytics = async (req, res) => {
    try {
        const clientId = req.clientId;
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [hourlyBurnAgg, agentCallsAgg, weeklyBlueprintsAgg] = await Promise.all([
            Transaction.aggregate([
                {
                    $match: {
                        clientId,
                        type: "EXPENSE",
                        createdAt: { $gte: twentyFourHoursAgo },
                    },
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%dT%H:00", date: "$createdAt" } },
                        tokens: {
                            $sum: {
                                $add: [
                                    { $ifNull: ["$metadata.inputTokens", 0] },
                                    { $ifNull: ["$metadata.outputTokens", 0] },
                                ],
                            },
                        },
                        cost: { $sum: "$amount" },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            Transaction.aggregate([
                {
                    $match: {
                        clientId,
                        type: "EXPENSE",
                        createdAt: { $gte: twentyFourHoursAgo },
                    },
                },
                {
                    $group: {
                        _id: "$agentName",
                        calls: { $sum: 1 },
                    },
                },
                { $sort: { calls: -1 } },
            ]),
            Report.aggregate([
                {
                    $match: {
                        clientId,
                        task: { $not: { $regex: /^(INNOVATION_RADAR|TREND_RADAR|BUSINESS_STRESS_TEST|STOCK_CHECK|INVOICE_PROCESSING|TWITTER:|LINKEDIN:|COLD_OUTREACH|RFP_RESPONSE)/ } },
                    },
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-W%V", date: "$createdAt" },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        res.json({
            success: true,
            data: {
                hourlyBurn: hourlyBurnAgg.map((h) => ({
                    hour: h._id,
                    tokens: h.tokens,
                    cost: h.cost,
                })),
                agentCalls: agentCallsAgg.map((a) => ({
                    agent: a._id,
                    calls: a.calls,
                })),
                weeklyBlueprints: weeklyBlueprintsAgg.map((w) => ({
                    week: w._id,
                    count: w.count,
                })),
            },
        });
    } catch (err) {
        console.error("analyticsController.getEngineeringAnalytics error:", err.message);
        res.status(500).json({ error: err.message });
    }
};
