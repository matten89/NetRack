/**
 * NetRack DCIM - User & Group RBAC Management (Local / RADIUS / LDAP)
 */
import React, { useState } from 'react';
import { useDCIM } from '../context/DCIMContext';
import { User, AuthType, UserRole } from '../types/dcim';
import {
  Users,
  Shield,
  KeyRound,
  Plus,
  Trash2,
  Lock,
  CheckCircle2,
  XCircle,
  Server,
  UserCheck,
} from 'lucide-react';

interface UserManagementViewProps {
  onOpenPasswordModal: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  onOpenPasswordModal,
}) => {
  const { state, currentUser, switchUser, addUser, deleteUser } = useDCIM();
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('ENGINEER');
  const [newAuthType, setNewAuthType] = useState<AuthType>('LOCAL');
  const [newGroupId, setNewGroupId] = useState(state.groups[0]?.id || '');
  const [newPassword, setNewPassword] = useState('');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    addUser({
      username: newUsername.trim(),
      fullName: newFullName.trim() || newUsername.trim(),
      email: newEmail.trim() || `${newUsername}@datacenter.corp`,
      role: newRole,
      authType: newAuthType,
      groupId: newGroupId,
      passwordHash: newAuthType === 'LOCAL' ? newPassword || 'dcim2026!' : undefined,
      isActive: true,
    });

    setShowAddUserModal(false);
    setNewUsername('');
    setNewFullName('');
    setNewEmail('');
    setNewPassword('');
  };

  return (
    <div className="space-y-6">
      {/* Title & Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Gestione Utenti, Gruppi & Autenticazione Multi-Source</h1>
            <p className="text-xs text-slate-400">
              Supporto per sorgenti Locale, RADIUS e LDAP/Active Directory con RBAC granulare
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddUserModal(true)}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuovo Utente</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>Utenti Censiti ({state.users.length})</span>
          </h2>
          <span className="text-xs text-slate-400">
            Utente corrente: <strong className="text-cyan-300">{currentUser.username}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                <th className="py-3 px-4">Username & Nome</th>
                <th className="py-3 px-4">Ruolo RBAC</th>
                <th className="py-3 px-4">Autenticazione</th>
                <th className="py-3 px-4">Gruppo di Appartenenza</th>
                <th className="py-3 px-4">Stato Password</th>
                <th className="py-3 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {state.users.map((u) => {
                const group = state.groups.find((g) => g.id === u.groupId);
                const isCurrent = u.id === currentUser.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 font-mono text-xs">
                          {u.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            {u.username}
                            {isCurrent && (
                              <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.2 rounded-full font-sans">
                                Tu
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{u.fullName} ({u.email})</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-mono font-medium text-[11px] bg-slate-800 text-slate-200 border border-slate-700">
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                          u.authType === 'LOCAL'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : u.authType === 'RADIUS'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-purple-950 text-purple-300 border border-purple-800'
                        }`}
                      >
                        {u.authType}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {group?.name || 'Standard'}
                    </td>

                    <td className="py-3 px-4">
                      {u.authType === 'LOCAL' ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Locale (Gestibile dall'utente)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Gestita da server {u.authType}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isCurrent && u.authType === 'LOCAL' && (
                          <button
                            onClick={onOpenPasswordModal}
                            className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800 text-amber-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Cambia Password</span>
                          </button>
                        )}

                        {!isCurrent && (
                          <>
                            <button
                              onClick={() => switchUser(u.id)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] transition-colors"
                            >
                              Simula Accesso
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Rimuovere l'utente ${u.username}?`)) {
                                  deleteUser(u.id);
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Elimina utente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Groups & Permissions Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>Matrice Permessi Gruppi di Sicurezza</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {state.groups.map((grp) => (
            <div key={grp.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-xs text-white">{grp.name}</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {grp.authSource}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-4">{grp.description}</p>
              </div>

              <div className="space-y-1.5 text-[11px] pt-3 border-t border-slate-900">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Modifica Inventario:</span>
                  {grp.permissions.canEditInventory ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Rack Design & RU:</span>
                  {grp.permissions.canDesignRacks ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Gestione Cablaggi:</span>
                  {grp.permissions.canManageCabling ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Discovery LLDP/CDP:</span>
                  {grp.permissions.canRunDiscovery ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Accesso Web SSH:</span>
                  {grp.permissions.canAccessTerminal ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Export Backup:</span>
                  {grp.permissions.canExportBackup ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h2 className="text-base font-bold text-white">Crea Nuovo Utente</h2>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Username:</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="es. f.neri"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Completo:</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="es. Fabio Neri"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email:</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="f.neri@datacenter.corp"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sorgente Autenticazione:</label>
                  <select
                    value={newAuthType}
                    onChange={(e) => setNewAuthType(e.target.value as AuthType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                  >
                    <option value="LOCAL">Locale (DB NetRack)</option>
                    <option value="RADIUS">Server RADIUS</option>
                    <option value="LDAP">Server LDAP / AD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ruolo RBAC:</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="ENGINEER">ENGINEER</option>
                    <option value="OPERATOR">OPERATOR</option>
                    <option value="AUDITOR">AUDITOR</option>
                  </select>
                </div>
              </div>

              {newAuthType === 'LOCAL' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password Iniziale:</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimo 6 caratteri"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                >
                  Salva Utente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
