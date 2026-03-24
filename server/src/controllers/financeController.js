import Transaction from "../models/Transaction.js";

export const getFinanceSummary = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [expensesByAgent, revenueAgg, allTimeExpenses] = await Promise.all([
            Transaction.aggregate([
                { $match: { type: "EXPENSE", createdAt: { $gte: startOfMonth } } },
                { $group: { _id: "$agentName", total: { $sum: "$amount" }, calls: { $sum: 1 } } },
                { $sort: { total: -1 } },
            ]),
            Transaction.aggregate([
                { $match: { type: "REVENUE", createdAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
            ]),
            Transaction.aggregate([
                { $match: { type: "EXPENSE" } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
        ]);

        const totalExpenses = expensesByAgent.reduce((s, e) => s + e.total, 0);
        const totalRevenue = revenueAgg[0]?.total || 0;

        const periodLabel = startOfMonth.toLocaleString("de-DE", { month: "long", year: "numeric" });
        const allTimeCost = allTimeExpenses[0]?.total || 0;

        res.json({
            // Field names match the frontend FinanceSummary interface
            periodLabel,
            totalExpenses,
            totalRevenue,
            netPnl: totalRevenue - totalExpenses,
            allTimeExpenses: allTimeCost,
            agentBreakdown: expensesByAgent.map(e => ({
                agentName: e._id,
                totalCost: e.total,
                callCount: e.calls,
            })),
        });
    } catch (err) {
        console.error("❌ /api/finance/summary hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const handleStripeWebhook = async (req, res) => {
    try {
        const event = req.body;
        const allowedTypes = ["checkout.session.completed", "payment_intent.succeeded"];
        if (!allowedTypes.includes(event.type)) {
            return res.json({ received: true, ignored: true });
        }

        const obj = event.data?.object || {};
        const amountRaw = obj.amount_total ?? obj.amount ?? 0;
        const amount = amountRaw / 100;
        const currency = (obj.currency || "eur").toUpperCase();
        const customerId = obj.customer || "anonymous";

        await Transaction.create({
            type: "REVENUE",
            category: "STRIPE_PAYMENT",
            agentName: "STRIPE",
            threadId: "REVENUE",
            amount,
            currency,
            metadata: {
                description: `Stripe ${event.type}: ${amount} ${currency} — Müşteri: ${customerId}`,
            },
        });

        console.log(`💵 CFO: Yeni gelir kaydedildi — ${amount} ${currency} (${event.type})`);
        res.json({ received: true });
    } catch (err) {
        console.error("❌ /api/finance/stripe-webhook hatasi:", err.message);
        res.status(400).json({ error: err.message });
    }
};
