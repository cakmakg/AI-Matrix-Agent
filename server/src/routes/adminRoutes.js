import { Router } from "express";
import { requireAdmin } from "../middleware/admin.js";
import {
    listTenants,
    getTenantDetail,
    haltTenant,
    resumeTenant,
    changePlan,
    getGlobalSecurity,
    getGlobalFinance,
    getPerTenantFinance,
    getFinanceAlerts,
    getAdminLogs,
    globalEventStream,
    ghostModeStream,
    getActiveWorkflows,
    listBannedIPs,
    banIP,
    unbanIP,
    financeLiveStream,
    throttleTenant,
    getRecentWorkflows,
    getWorkflowSnapshots,
} from "../controllers/adminController.js";

const router = Router();

// 🛡️ Tüm /api/admin/* rotaları admin yetkisi gerektirir
router.use(requireAdmin);

// ── Panel 1: Global Fleet Radar ──
router.get("/tenants",                listTenants);
router.get("/tenants/:slug",         getTenantDetail);
router.get("/tenants/:slug/live",    ghostModeStream);       // SSE — Ghost Mode
router.get("/events/global",         globalEventStream);      // SSE — Tüm tenant'lar
router.get("/workflows/active",      getActiveWorkflows);

// ── Panel 3: Zaman Makinesi (Time Machine) ──
// ÖNEMLI: /recent sabit path olduğu için /:threadId'den ÖNCE gelmelidir
router.get("/workflows/recent",                    getRecentWorkflows);
router.get("/workflows/:threadId/snapshots",       getWorkflowSnapshots);

// ── Panel 2: SOC (Security Operations Center) ──
router.post("/tenants/:slug/halt",   haltTenant);
router.post("/tenants/:slug/resume", resumeTenant);
router.patch("/tenants/:slug/plan",  changePlan);
router.get("/security/global",       getGlobalSecurity);
router.get("/security/banned-ips",   listBannedIPs);
router.post("/security/ban-ip",      banIP);
router.post("/security/unban-ip",    unbanIP);

// ── Panel 4: FinOps ──
router.get("/finance/global",        getGlobalFinance);
router.get("/finance/per-tenant",    getPerTenantFinance);
router.get("/finance/alerts",        getFinanceAlerts);
router.get("/finance/live",          financeLiveStream);   // SSE — Burn Rate
router.post("/tenants/:slug/throttle", throttleTenant);

// ── Admin Audit Log ──
router.get("/logs",                  getAdminLogs);

export default router;
