/**
 * 💰 Real-time Cost Event Bus
 * costTracker.js ve adminController.js tarafından paylaşılır.
 * Circular dependency'den kaçınmak için ayrı modül.
 *
 * Emit edilen event yapısı:
 * {
 *   type: "cost_tick",
 *   clientId: string,
 *   agentName: string,
 *   threadId: string,
 *   cost: number,       // USD
 *   inputTokens: number,
 *   outputTokens: number,
 *   model: string,
 *   timestamp: number,
 * }
 */

import { EventEmitter } from "events";

export const costEventBus = new EventEmitter();
costEventBus.setMaxListeners(20);
