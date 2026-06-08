/**
 * 💸 BUDGET AUTO-TRIP — Cost explosion guard
 * Aylık LLM gideri plan tavanını aşınca tenant'ın otomatik throttle edildiğini doğrular.
 * GERÇEK checkBudgetAndMaybeThrottle çalışır; sadece Mongoose modelleri mock'lanır.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Model mock'ları (costTracker'ın import ettiği şekliyle) ──────────────
const aggregateMock = vi.fn();
const findByIdMock = vi.fn();
const tenantUpdateMock = vi.fn().mockResolvedValue({});

vi.mock("../src/models/Transaction.js", () => ({
    default: { create: vi.fn().mockResolvedValue({}), aggregate: (...a) => aggregateMock(...a) },
}));
vi.mock("../src/models/Client.js", () => ({
    Client: { findById: (...a) => findByIdMock(...a) },
}));
vi.mock("../src/models/TenantConfig.js", () => ({
    TenantConfig: { findOneAndUpdate: (...a) => tenantUpdateMock(...a) },
}));

const { checkBudgetAndMaybeThrottle } = await import("../src/services/costTracker.js");

describe("Budget auto-trip kill-switch", () => {
    beforeEach(() => {
        aggregateMock.mockReset();
        findByIdMock.mockReset();
        tenantUpdateMock.mockClear();
    });

    it("should THROTTLE when monthly spend exceeds plan budget (pro = $30)", async () => {
        aggregateMock.mockResolvedValue([{ total: 29 }]); // seed: bu ay $29 harcanmış
        findByIdMock.mockResolvedValue({ plan: "pro" });

        await checkBudgetAndMaybeThrottle("tenant-over-budget", 2); // 29 + 2 = 31 ≥ 30

        expect(tenantUpdateMock).toHaveBeenCalledTimes(1);
        const [filter, update] = tenantUpdateMock.mock.calls[0];
        expect(filter).toEqual({ clientId: "tenant-over-budget" });
        expect(update.$set["configObject.throttled"]).toBe(true);
        expect(update.$set["configObject.throttleReason"]).toBe("BUDGET_EXCEEDED");
    });

    it("should NOT throttle when spend is under budget", async () => {
        aggregateMock.mockResolvedValue([{ total: 1 }]);
        findByIdMock.mockResolvedValue({ plan: "pro" });

        await checkBudgetAndMaybeThrottle("tenant-under-budget", 1); // 2 < 30

        expect(tenantUpdateMock).not.toHaveBeenCalled();
    });

    it("should NOT throttle holding plan (budgetUsd = 0 → unlimited)", async () => {
        aggregateMock.mockResolvedValue([{ total: 9999 }]);
        findByIdMock.mockResolvedValue({ plan: "holding" });

        await checkBudgetAndMaybeThrottle("tenant-holding", 500);

        expect(tenantUpdateMock).not.toHaveBeenCalled();
    });

    it("should skip the 'default' tenant entirely (no DB calls)", async () => {
        await checkBudgetAndMaybeThrottle("default", 100);
        expect(aggregateMock).not.toHaveBeenCalled();
        expect(tenantUpdateMock).not.toHaveBeenCalled();
    });

    it("should trip only once per tenant per month (no duplicate writes)", async () => {
        aggregateMock.mockResolvedValue([{ total: 40 }]); // zaten tavanın üstünde
        findByIdMock.mockResolvedValue({ plan: "pro" });

        await checkBudgetAndMaybeThrottle("tenant-once", 1); // trip
        await checkBudgetAndMaybeThrottle("tenant-once", 1); // ikinci çağrı → tekrar yazma yok

        expect(tenantUpdateMock).toHaveBeenCalledTimes(1);
    });
});
