/**
 * 🛡️ In-memory Banned IP Cache — TTL-aware
 * rateLimiter ve adminController tarafından paylaşılır.
 * Circular dependency'den kaçınmak için ayrı modül.
 *
 * Map<ip, expiresAtMs | null>
 *   null  → kalıcı ban
 *   number → Unix ms; bu süre geçtikten sonra otomatik serbest
 */

const _cache = new Map(); // ip → number (ms) | null

export const bannedIPCache = {
    /**
     * IP'yi cache'e ekle.
     * @param {string} ip
     * @param {Date|number|null} expiresAt  — null = kalıcı ban
     */
    add(ip, expiresAt = null) {
        const exp = expiresAt
            ? (expiresAt instanceof Date ? expiresAt.getTime() : Number(expiresAt))
            : null;
        _cache.set(ip, exp);
    },

    /**
     * IP banlı mı? Süresi dolmuşsa otomatik siler ve false döner.
     * @param {string} ip
     * @returns {boolean}
     */
    has(ip) {
        if (!_cache.has(ip)) return false;
        const exp = _cache.get(ip);
        if (exp !== null && Date.now() > exp) {
            _cache.delete(ip);
            return false;
        }
        return true;
    },

    /** Ban'ı kaldır. */
    delete(ip) {
        _cache.delete(ip);
    },

    /** Aktif (süresi dolmamış) ban sayısı. Yan etki: süresi dolan girişleri temizler. */
    get size() {
        let count = 0;
        for (const [ip, exp] of _cache) {
            if (exp === null || Date.now() <= exp) {
                count++;
            } else {
                _cache.delete(ip);
            }
        }
        return count;
    },
};
