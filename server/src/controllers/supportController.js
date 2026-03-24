import { v4 as uuidv4 } from "uuid";
import { SupportTicket } from "../models/SupportTicket.js";
import { runHotLeadWorkflow } from "../workflows/runner.js";

// ── n8n'e platform bazlı yanıt gönder ──
async function sendReplyViaN8n(ticket, replyBody) {
    const webhookUrl = process.env.N8N_REPLY_WEBHOOK;
    if (!webhookUrl) {
        console.warn("⚠️ N8N_REPLY_WEBHOOK env eksik — yanıt simüle edildi.");
        console.log(`   [SIMULATED] To: ${ticket.from} | ${replyBody.slice(0, 120)}`);
        return;
    }

    const payload = {
        platform:    ticket.platform || "gmail",
        platform_id: ticket.platform_id || ticket.gmailThreadId,
        to:          ticket.from,
        subject:     ticket.subject,
        reply_text:  replyBody,
        ticketId:    String(ticket._id),
    };

    const res = await fetch(webhookUrl, {
        method:  "POST",
        headers: {
            "Content-Type":    "application/json",
            "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET || "",
            "X-Source":        "ai-orchestra",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
        console.log(`   ✅ n8n reply webhook tetiklendi → ${ticket.platform}/${ticket.from}`);
    } else {
        const errText = await res.text();
        throw new Error(`n8n reply webhook hatası (${res.status}): ${errText}`);
    }
}

export const getPendingTickets = async (req, res) => {
    try {
        const tickets = await SupportTicket
            .find({ status: "AWAITING_APPROVAL", clientId: req.clientId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        res.json({ tickets });
    } catch (err) {
        console.error("❌ /api/support/pending hatasi:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const approveTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { isApproved, feedback } = req.body;

        const ticket = await SupportTicket.findOne({ _id: ticketId, clientId: req.clientId });
        if (!ticket) return res.status(404).json({ error: "Ticket bulunamadi veya yetkiniz yok." });

        if (isApproved) {
            const replyBody = feedback || ticket.draftResponse;
            if (!replyBody) return res.status(400).json({ error: "Gönderilecek yanıt içeriği boş." });

            await sendReplyViaN8n(ticket, replyBody);

            await SupportTicket.findByIdAndUpdate(ticketId, {
                status: "SENT",
                humanFeedback: feedback || "",
            });
            return res.json({ success: true, status: "SENT" });

        } else {
            // Hata bildirimi → HOT_LEAD olarak eskalasyon
            if (ticket.category === "SUPPORT_BUG") {
                const bugThreadId = uuidv4();
                const bugTask = `BUG_REPORT [${ticket.platform}]: Gönderen: ${ticket.from}. Konu: ${ticket.subject}. Detay: ${ticket.body.slice(0, 500)}`;
                runHotLeadWorkflow(bugThreadId, bugTask, req.tenant?.config, req.clientId || "default", req.tenant?.client?.plan || "enterprise").catch(err =>
                    console.error("Bug escalation hatası:", err.message)
                );
                await SupportTicket.findByIdAndUpdate(ticketId, {
                    status: "ESCALATED",
                    humanFeedback: feedback || "CTO'ya iletildi.",
                });
                return res.json({ success: true, status: "ESCALATED", bugThreadId });
            }

            await SupportTicket.findByIdAndUpdate(ticketId, {
                status: "REJECTED",
                humanFeedback: feedback || "",
            });
            return res.json({ success: true, status: "REJECTED" });
        }
    } catch (err) {
        console.error("❌ /api/support approve hatası:", err.message);
        res.status(500).json({ error: err.message });
    }
};
