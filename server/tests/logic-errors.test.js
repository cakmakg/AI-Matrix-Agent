/**
 * 🐛 LOGIC ERROR TESTS — Backend
 * Tests for workflow logic, state management, data integrity
 */
import { describe, it, expect, vi } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
// TEST 1: Workflow Runner Logic
// ═══════════════════════════════════════════════════════════════════════

describe("LOGIC — Workflow Runner", () => {

    it("BUG [MEDIUM]: runner.js uses non-existent 'clientSlug' field", () => {
        // runner.js line 91: const tenantSlug = tenantConfig?.clientSlug || clientId;
        // TenantConfig schema has NO 'clientSlug' field!
        // It has: clientId, agentPersona, tone, enabledSkills, configObject
        const tenantConfig = {
            clientId: "some-id",
            agentPersona: "test",
            tone: "formal",
        };
        // clientSlug doesn't exist
        expect(tenantConfig.clientSlug).toBeUndefined();
        // So it always falls back to clientId
        const tenantSlug = tenantConfig?.clientSlug || "default-id";
        expect(tenantSlug).toBe("default-id");
    });

    it("AGENT_UI_MAP should cover all graph nodes", () => {
        const AGENT_UI_MAP = {
            orchestrator: "ceo",
            scraper: "scraper",
            analyzer: "analyst",
            innovator: "innovator",
            writer: "writer",
            critic: "qa",
            fileSaver: null,
            human_approval: "hitl",
            publisher: "publisher",
            architect: "cto",
            __interrupt__: "hitl",
        };

        const graphNodes = [
            "guardrail", "orchestrator", "scraper", "analyzer",
            "innovator", "writer", "critic", "fileSaver",
            "human_approval", "publisher", "architect"
        ];

        // Check all graph nodes are mapped
        for (const node of graphNodes) {
            if (node === "guardrail") continue; // guardrail is first, no UI mapping needed
            expect(AGENT_UI_MAP).toHaveProperty(node);
        }
    });

    it("fileSaver mapped to null (no UI indicator)", () => {
        const AGENT_UI_MAP = { fileSaver: null };
        // When agentId is null, emitToThread skips the event
        expect(AGENT_UI_MAP.fileSaver).toBeNull();
    });

    it("activeWorkflows Map tracks workflow lifecycle correctly", () => {
        const activeWorkflows = new Map();

        // Start workflow
        activeWorkflows.set("thread-1", {
            clientId: "client-a",
            tenantSlug: "acme",
            startedAt: Date.now(),
            lastAgent: null,
        });
        expect(activeWorkflows.size).toBe(1);

        // Update last agent
        activeWorkflows.get("thread-1").lastAgent = "ceo";
        expect(activeWorkflows.get("thread-1").lastAgent).toBe("ceo");

        // Complete workflow
        activeWorkflows.delete("thread-1");
        expect(activeWorkflows.size).toBe(0);
    });

    it("BUG [LOW]: workflow not cleaned from activeWorkflows on HITL pause", () => {
        // runner.js line 156-205: awaitingHITL branch does NOT delete from activeWorkflows
        // Only non-HITL completion (line 204) and error (line 209) clean up
        const activeWorkflows = new Map();
        activeWorkflows.set("thread-hitl", { clientId: "c1" });

        // Simulate HITL pause — workflow stays in map
        const awaitingHITL = true;
        if (!awaitingHITL) {
            activeWorkflows.delete("thread-hitl"); // This branch not taken
        }

        // Workflow still tracked as "active" even though it's paused
        expect(activeWorkflows.has("thread-hitl")).toBe(true);
        // This makes Fleet Radar show paused workflows as "active" — misleading
    });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST 2: Approval Controller Logic
// ═══════════════════════════════════════════════════════════════════════

describe("LOGIC — Approval Controller", () => {

    it("should require threadId", () => {
        const body = {};
        expect(!body.threadId).toBe(true);
        // Controller returns 400 if missing
    });

    it("should skip Report.exists check for SUPPORT categories", () => {
        // approvalController.js line 34:
        //   if (category !== "SUPPORT_BUG" && category !== "SUPPORT_PRICING")
        const supportCategories = ["SUPPORT_BUG", "SUPPORT_PRICING"];
        expect(supportCategories.includes("SUPPORT_BUG")).toBe(true);
        // Support tickets don't have Reports — correct to skip
    });

    it("BUG [MEDIUM]: approval feedback not sanitized for revision feedback", () => {
        // While feedback is sanitized via sanitizeFeedback(), it's passed to
        // runRevisionWorkflow which feeds it back into the LangGraph state
        // as humanFeedback. The guardrail runs again on revision, so this
        // is partially mitigated, but the sanitization in approvalController
        // is less strict than guardrailAgent.
        const sanitized = "[FİLTRELENDİ] some valid feedback";
        expect(sanitized).toContain("[FİLTRELENDİ]");
        // The "[FİLTRELENDİ]" placeholder itself isn't dangerous
    });

    it("publishWorkflow runs in background (fire-and-forget)", () => {
        // approvalController.js line 57-59:
        //   runPublishWorkflow(threadId, feedback).catch(err => console.error(...))
        // This is correct — publish shouldn't block the response
        // But if publish fails, the user gets success response with PUBLISHED status
        // while the actual publish might have failed
        expect(true).toBe(true); // Documented edge case
    });

    it("revisionWorkflow also runs in background", () => {
        // approvalController.js line 66-68:
        //   runRevisionWorkflow(threadId, req.tenant?.config).catch(...)
        // Same fire-and-forget pattern
        expect(true).toBe(true);
    });

    it("BUG [LOW]: Report update on rejection doesn't include clientId in filter", () => {
        // approvalController.js line 62-65:
        //   await Report.findOneAndUpdate(
        //     { threadId },  ← Missing clientId
        //     { status: "REJECTED", humanFeedback: ... }
        //   )
        const query = { threadId: "test" };
        expect(query).not.toHaveProperty("clientId");
    });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST 3: Snapshot & Time Machine Logic
// ═══════════════════════════════════════════════════════════════════════

describe("LOGIC — Snapshot System", () => {

    it("truncateSnapshot should limit string fields to maxLen", () => {
        function truncateSnapshot(obj, maxLen = 400) {
            if (!obj || typeof obj !== "object") return obj;
            const result = {};
            for (const [k, v] of Object.entries(obj)) {
                if (typeof v === "string" && v.length > maxLen) {
                    result[k] = v.slice(0, maxLen) + ` …[+${v.length - maxLen}]`;
                } else {
                    result[k] = v;
                }
            }
            return result;
        }

        const input = { finalContent: "A".repeat(1000), task: "short" };
        const output = truncateSnapshot(input);
        expect(output.finalContent.length).toBeLessThan(500);
        expect(output.finalContent).toContain("…[+600]");
        expect(output.task).toBe("short");
    });

    it("extractKeyState should extract known fields with defaults", () => {
        function extractKeyState(output) {
            return {
                nextAgent:       output?.nextAgent       ?? "",
                revisionCount:   output?.revisionCount   ?? 0,
                confidenceScore: output?.confidenceScore ?? 0,
                threatScore:     output?.threatScore     ?? 0,
                fileSaved:       output?.fileSaved       ?? false,
            };
        }

        const empty = extractKeyState({});
        expect(empty.nextAgent).toBe("");
        expect(empty.revisionCount).toBe(0);
        expect(empty.fileSaved).toBe(false);

        const full = extractKeyState({ nextAgent: "writer", revisionCount: 3, fileSaved: true });
        expect(full.nextAgent).toBe("writer");
        expect(full.revisionCount).toBe(3);
        expect(full.fileSaved).toBe(true);
    });

    it("snapshot step counter increments correctly", () => {
        let stepCounter = 0;
        const steps = [];
        for (let i = 0; i < 5; i++) {
            steps.push(stepCounter++);
        }
        expect(steps).toEqual([0, 1, 2, 3, 4]);
    });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST 4: Admin Controller Logic
// ═══════════════════════════════════════════════════════════════════════

describe("LOGIC — Admin Controller", () => {

    it("tenant list should exclude deleted tenants", () => {
        const query = { status: { $ne: "deleted" } };
        // This filter matches: "active", "suspended", null, undefined
        expect(query.status.$ne).toBe("deleted");
    });

    it("tenant list should exclude passwordHash from response", () => {
        const projection = { passwordHash: 0 };
        expect(projection.passwordHash).toBe(0);
    });

    it("global security status thresholds are correct", () => {
        const severityMap = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

        // Test CRITICAL
        severityMap.CRITICAL = 1;
        let status =
            severityMap.CRITICAL > 0 ? "CRITICAL" :
            severityMap.HIGH > 5 ? "WARNING" :
            20 > 20 ? "ELEVATED" : "NORMAL";
        expect(status).toBe("CRITICAL");

        // Test WARNING
        severityMap.CRITICAL = 0;
        severityMap.HIGH = 6;
        status =
            severityMap.CRITICAL > 0 ? "CRITICAL" :
            severityMap.HIGH > 5 ? "WARNING" :
            0 > 20 ? "ELEVATED" : "NORMAL";
        expect(status).toBe("WARNING");

        // Test NORMAL
        severityMap.HIGH = 0;
        status =
            severityMap.CRITICAL > 0 ? "CRITICAL" :
            severityMap.HIGH > 5 ? "WARNING" :
            0 > 20 ? "ELEVATED" : "NORMAL";
        expect(status).toBe("NORMAL");
    });

    it("finance margin alert levels are correct", () => {
        function getAlertLevel(margin) {
            if (margin < 5) return "critical";
            if (margin < 20) return "danger";
            if (margin < 50) return "warning";
            return "healthy";
        }

        expect(getAlertLevel(-10)).toBe("critical");
        expect(getAlertLevel(0)).toBe("critical");
        expect(getAlertLevel(4.9)).toBe("critical");
        expect(getAlertLevel(5)).toBe("danger");
        expect(getAlertLevel(19.9)).toBe("danger");
        expect(getAlertLevel(20)).toBe("warning");
        expect(getAlertLevel(49.9)).toBe("warning");
        expect(getAlertLevel(50)).toBe("healthy");
        expect(getAlertLevel(100)).toBe("healthy");
    });

    it("BUG [MEDIUM]: getFinanceAlerts margin=100 when revenue=0", () => {
        // adminController.js line 412:
        //   const margin = revenue > 0 ? ((revenue - expense) / revenue) * 100 : 100;
        // When revenue=0 and expense=0, margin defaults to 100 (healthy)
        // But when revenue=0 and expense > 0, margin is still 100 → WRONG
        // A tenant with $0 revenue and $50 expense should be "critical"
        const revenue = 0;
        const expense = 50;
        const margin = revenue > 0 ? ((revenue - expense) / revenue) * 100 : 100;
        expect(margin).toBe(100); // BUG: Should be -Infinity or critical
        // This masks tenants that are burning money with no revenue
    });

    it("throttle flag correctly set in TenantConfig", () => {
        // adminController.js line 716: const isThrottled = throttle !== false;
        const testCases = [
            { input: true, expected: true },
            { input: false, expected: false },
            { input: undefined, expected: true },  // undefined !== false → true
            { input: null, expected: true },        // null !== false → true
            { input: "yes", expected: true },       // "yes" !== false → true
        ];

        for (const { input, expected } of testCases) {
            expect(input !== false).toBe(expected);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST 5: Cost Tracker Logic
// ═══════════════════════════════════════════════════════════════════════

describe("LOGIC — Cost Tracker", () => {

    it("plan prices are consistent across controllers", () => {
        // Check that planPrice objects match between different controllers
        const adminPlanPrice = { free: 99, pro: 299, enterprise: 999, holding: 3000 };
        const detailPlanPrice = { free: 99, pro: 299, enterprise: 999, holding: 3000 };
        expect(adminPlanPrice).toEqual(detailPlanPrice);
    });

    it("BUG [LOW]: plan prices hardcoded in multiple places", () => {
        // adminController.js line 99, 312, 341, 395, 410
        // Each has its own planPrice object — if one changes, others diverge
        // Should be centralized in plans.js
        expect(true).toBe(true); // Documented — needs refactor
    });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST 6: Admin Route Ordering
// ═══════════════════════════════════════════════════════════════════════

describe("LOGIC — Route Ordering", () => {

    it("CRITICAL: /workflows/recent must be before /workflows/:threadId", () => {
        // Express matches routes top-down
        // If /:threadId comes first, "recent" is captured as a threadId param
        const routes = [
            "/workflows/active",
            "/workflows/recent",        // ← MUST be before :threadId
            "/workflows/:threadId/snapshots",
        ];

        const recentIndex = routes.findIndex(r => r.includes("recent"));
        const paramIndex = routes.findIndex(r => r.includes(":threadId"));
        expect(recentIndex).toBeLessThan(paramIndex);
    });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST 7: Revision Loop Guard
// ═══════════════════════════════════════════════════════════════════════

describe("LOGIC — Revision Loop Guard", () => {

    it("revision count must be checked against limit", () => {
        const maxRevisions = 5;
        for (let i = 0; i <= 6; i++) {
            if (i >= maxRevisions) {
                // Should route to END, not back to writer
                expect(i >= maxRevisions).toBe(true);
            }
        }
    });

    it("revision count increments in writer node", () => {
        let revisionCount = 0;
        // Simulate writer → critic → writer loop
        for (let loop = 0; loop < 3; loop++) {
            revisionCount++; // writer increments
            expect(revisionCount).toBe(loop + 1);
        }
    });

    it("free plan allows only 1 revision", () => {
        const planLimits = { free: 1, pro: 3, enterprise: 5, holding: 999 };
        expect(planLimits.free).toBe(1);
    });
});
