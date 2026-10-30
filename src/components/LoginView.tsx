/**
 * NetRack DCIM - Login & Authentication Screen
 */
import React, { useState } from 'react';
import { useDCIM } from '../context/DCIMContext';
import {
  Server,
  Shield,
  Lock,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  Network,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, state } = useDCIM();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = login(username, password);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Credenziali non valide. Riprova.');
      }
    }, 200);
  };

  const handleQuickLogin = (quickUser: string, quickPass: string) => {
    setUsername(quickUser);
    setPassword(quickPass);
    setError(null);
    login(quickUser, quickPass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-xl shadow-cyan-600/20 mb-2">
            <Server className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>NetRack</span>
            <span className="text-cyan-400">DCIM</span>
          </h1>
          <p className="text-xs text-slate-400">
            Data Center Infrastructure Management &bull; Portale di Accesso
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Nome Utente / Username:</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin, m.rossi..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Password di Autenticazione:</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 transition-all cursor-pointer"
          >
            {loading ? (
              <span>Autenticazione in corso...</span>
            ) : (
              <>
                <span>Accedi a NetRack DCIM</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Accounts */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-cyan-400" />
              <span>Accesso Rapido Account Preconfigurati:</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
            >
              <div className="font-bold text-white flex items-center justify-between">
                <span>admin</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400">ADMIN</span>
              </div>
              <span className="text-slate-500 text-[10px] block truncate">Pass: admin123</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('m.rossi', 'cisco123')}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
            >
              <div className="font-bold text-white flex items-center justify-between">
                <span>m.rossi</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400">ENGINEER</span>
              </div>
              <span className="text-slate-500 text-[10px] block truncate">Pass: cisco123</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('l.bianchi', 'operator123')}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
            >
              <div className="font-bold text-white flex items-center justify-between">
                <span>l.bianchi</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400">OPERATOR</span>
              </div>
              <span className="text-slate-500 text-[10px] block truncate">Pass: operator123</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('s.verdi', 'audit123')}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
            >
              <div className="font-bold text-white flex items-center justify-between">
                <span>s.verdi</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-400">AUDITOR</span>
              </div>
              <span className="text-slate-500 text-[10px] block truncate">Pass: audit123</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 pt-1">
          Server IP: <span className="font-mono text-slate-400">{typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'}</span> &bull; TLS 1.3 Active
        </div>
      </div>
    </div>
  );
};
