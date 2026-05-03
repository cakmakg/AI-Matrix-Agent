"use client";

import React, { useState, useEffect } from "react";
import { useAgentStore } from "@/store/agent-store";
import { KeyRound, Building2, LogIn, UserPlus, Eye, EyeOff, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "login" | "register";

export const ApiKeyModal = () => {
    const { apiKey, setWorkspaceInfo } = useAgentStore();
    const [mounted, setMounted] = useState(false);
    const [tab, setTab] = useState<Tab>("login");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [loginForm, setLoginForm]   = useState({ email: "", password: "" });
    const [regForm,   setRegForm]     = useState({ name: "", email: "", password: "", sector: "" });

    useEffect(() => { setMounted(true); }, []);

    if (!mounted || apiKey) return null;

    const handleLogin = async (e: React.BaseSyntheticEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res  = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginForm),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Anmeldung fehlgeschlagen."); return; }
            setWorkspaceInfo({ name: data.client.name, slug: data.client.slug, email: data.client.email, apiKey: data.apiKey, plan: data.client.plan, product: data.client.product, isAdmin: data.client.isAdmin });
        } catch {
            setError("Server nicht erreichbar.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.BaseSyntheticEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res  = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(regForm),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Registrierung fehlgeschlagen."); return; }
            setWorkspaceInfo({ name: data.client.name, slug: data.client.slug, email: data.client.email, apiKey: data.apiKey, plan: data.client.plan });
        } catch {
            setError("Server nicht erreichbar.");
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        setWorkspaceInfo({ name: "Default Tenant", slug: "default", email: "", apiKey: "default" });
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#070c14]/90 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="w-full max-w-md bg-[#090e1a] border border-[#00f0ff]/20 rounded-xl shadow-[0_0_40px_rgba(0,240,255,0.08)] overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-white/5">
                        <div className="flex justify-center mb-3">
                            <div className="w-11 h-11 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/20 flex items-center justify-center text-[#00f0ff]">
                                <Building2 size={20} />
                            </div>
                        </div>
                        <h2 className="text-center font-mono text-sm font-bold text-white tracking-[0.15em] mb-1">
                            AI ORCHESTRA
                        </h2>
                        <p className="text-center font-mono text-[10px] text-white/35 tracking-widest uppercase">
                            Multi-Tenant Command Center
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-white/5">
                        {([ ["login", "Anmelden"], ["register", "Registrieren"] ] as [Tab, string][]).map(([id, label]) => (
                            <button
                                key={id}
                                onClick={() => { setTab(id); setError(""); }}
                                className={`flex-1 py-3 flex items-center justify-center gap-2 font-mono text-[11px] tracking-wider transition-all border-b-2 ${
                                    tab === id
                                        ? "text-[#00f0ff] border-[#00f0ff] bg-[#00f0ff]/5"
                                        : "text-white/30 border-transparent hover:text-white/60"
                                }`}
                            >
                                {id === "login" ? <LogIn size={12} /> : <UserPlus size={12} />}
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Forms */}
                    <div className="p-6">
                        <AnimatePresence mode="wait">
                            {tab === "login" ? (
                                <motion.form
                                    key="login"
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 8 }}
                                    onSubmit={handleLogin}
                                    className="space-y-3"
                                >
                                    <input
                                        type="email"
                                        value={loginForm.email}
                                        onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                                        placeholder="E-Mail-Adresse"
                                        required
                                        autoFocus
                                        className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2.5 font-mono text-[12px] text-white/80 placeholder:text-white/20 focus:border-[#00f0ff]/50 focus:outline-none transition-colors"
                                    />
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={loginForm.password}
                                            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                                            placeholder="Passwort"
                                            required
                                            className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2.5 pr-9 font-mono text-[12px] text-white/80 placeholder:text-white/20 focus:border-[#00f0ff]/50 focus:outline-none transition-colors"
                                        />
                                        <button type="button" onClick={() => setShowPassword(v => !v)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
                                            {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                                        </button>
                                    </div>

                                    {error && <p className="font-mono text-[10px] text-red-400/80 bg-red-500/5 border border-red-500/15 rounded px-2.5 py-1.5">{error}</p>}

                                    <button type="submit" disabled={loading || !loginForm.email || !loginForm.password}
                                        className="w-full py-2.5 flex items-center justify-center gap-2 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 rounded-lg font-mono text-[11px] font-bold tracking-wider transition-all disabled:opacity-40">
                                        {loading ? "WIRD ANGEMELDET..." : <><LogIn size={13} /> ZUM WORKSPACE</>}
                                    </button>
                                </motion.form>
                            ) : (
                                <motion.form
                                    key="register"
                                    initial={{ opacity: 0, x: 8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -8 }}
                                    onSubmit={handleRegister}
                                    className="space-y-3"
                                >
                                    <input
                                        type="text"
                                        value={regForm.name}
                                        onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                                        placeholder="Firmen-/Organisationsname"
                                        required
                                        autoFocus
                                        className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2.5 font-mono text-[12px] text-white/80 placeholder:text-white/20 focus:border-[#39ff14]/50 focus:outline-none transition-colors"
                                    />
                                    <input
                                        type="email"
                                        value={regForm.email}
                                        onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                                        placeholder="E-Mail-Adresse"
                                        required
                                        className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2.5 font-mono text-[12px] text-white/80 placeholder:text-white/20 focus:border-[#39ff14]/50 focus:outline-none transition-colors"
                                    />
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={regForm.password}
                                            onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                                            placeholder="Passwort (mind. 6 Zeichen)"
                                            required minLength={6}
                                            className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2.5 pr-9 font-mono text-[12px] text-white/80 placeholder:text-white/20 focus:border-[#39ff14]/50 focus:outline-none transition-colors"
                                        />
                                        <button type="button" onClick={() => setShowPassword(v => !v)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
                                            {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                                        </button>
                                    </div>
                                    <select value={regForm.sector} onChange={e => setRegForm({ ...regForm, sector: e.target.value })}
                                        className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2.5 font-mono text-[12px] text-white/50 focus:border-[#39ff14]/50 focus:outline-none transition-colors">
                                        <option value="">Branche wählen (optional)</option>
                                        <option value="fintech">Fintech / Bankwesen</option>
                                        <option value="healthcare">Gesundheit / Healthcare</option>
                                        <option value="security">Cybersicherheit / MSSP</option>
                                        <option value="ecommerce">E-Commerce</option>
                                        <option value="saas">SaaS / Technologie</option>
                                        <option value="general">Sonstige</option>
                                    </select>

                                    {error && <p className="font-mono text-[10px] text-red-400/80 bg-red-500/5 border border-red-500/15 rounded px-2.5 py-1.5">{error}</p>}

                                    <button type="submit" disabled={loading || !regForm.name || !regForm.email || !regForm.password}
                                        className="w-full py-2.5 flex items-center justify-center gap-2 bg-[#39ff14]/10 hover:bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/30 rounded-lg font-mono text-[11px] font-bold tracking-wider transition-all disabled:opacity-40">
                                        {loading ? "WIRD REGISTRIERT..." : <><UserPlus size={13} /> WORKSPACE ERSTELLEN <ChevronRight size={12} /></>}
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Dev mode skip — only visible in non-production builds */}
                    {process.env.NODE_ENV !== "production" && (
                        <div className="px-6 pb-5 border-t border-white/4 pt-3">
                            <button onClick={handleSkip}
                                className="w-full py-2 flex items-center justify-center gap-1.5 font-mono text-[10px] text-white/20 hover:text-white/45 transition-colors tracking-wider">
                                <KeyRound size={10} />
                                DEV MODE — Default Tenant olarak devam et
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
