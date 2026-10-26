/**
 * NetRack DCIM - Local User Self-Service Password Change Modal
 */
import React, { useState } from 'react';
import { useDCIM } from '../context/DCIMContext';
import { KeyRound, X, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
  const { currentUser, updateUserPassword } = useDCIM();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentUser.authType !== 'LOCAL') {
      setStatus({
        success: false,
        message: `L'utente "${currentUser.username}" è autenticato tramite ${currentUser.authType}. Le credenziali devono essere gestite sul server di autenticazione centralizzato.`,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({
        success: false,
        message: 'Le due password inserite non coincidono.',
      });
      return;
    }

    const res = updateUserPassword(currentUser.id, newPassword);
    if (res.success) {
      setStatus({
        success: true,
        message: 'Password aggiornata con successo nel database locale!',
      });
      setTimeout(() => {
        onClose();
      }, 1400);
    } else {
      setStatus({
        success: false,
        message: res.error || 'Errore durante l’aggiornamento della password.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Gestione Password</h2>
              <p className="text-xs text-slate-400">
                Utente: <strong className="text-white">{currentUser.username}</strong> ({currentUser.authType})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {currentUser.authType !== 'LOCAL' ? (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-start gap-3">
              <Shield className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-1">Autenticazione Centralizzata ({currentUser.authType})</strong>
                Questo account è sincronizzato tramite {currentUser.authType}. In conformità alle policy di sicurezza, la password può essere modificata solo sul controller di dominio o server RADIUS/LDAP centrale.
              </div>
            </div>
          ) : (
            <>
              <div className="text-xs text-slate-400">
                In qualità di utente locale, puoi reimpostare direttamente la tua password di accesso al DCIM.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nuova Password:
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Conferma Nuova Password:
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ripeti la password"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                />
              </div>

              {status && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    status.success
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800 text-rose-300'
                  }`}
                >
                  {status.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{status.message}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-900/30"
                >
                  Salva Password
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
