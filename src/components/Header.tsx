/**
 * NetRack DCIM - Header & Navigation Bar
 */
import React, { useState } from 'react';
import { useDCIM } from '../context/DCIMContext';
import {
  Server,
  Layers,
  Network,
  MapPin,
  Users,
  Database,
  Tag,
  KeyRound,
  Shield,
  Activity,
  HardDrive,
  Cpu,
  LogOut,
  Sliders,
} from 'lucide-react';

interface HeaderProps {
  onOpenBackup: () => void;
  onOpenBrands: () => void;
  onOpenDeviceTypes: () => void;
  onOpenPasswordModal: () => void;
  onOpenUbuntuGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenBackup,
  onOpenBrands,
  onOpenDeviceTypes,
  onOpenPasswordModal,
  onOpenUbuntuGuide,
}) => {
  const { state, activeTab, setActiveTab, currentUser, switchUser, logout } = useDCIM();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const activeDevicesCount = state.devices.filter((d) => d.isPoweredOn === 'SI').length;
  const totalRacksCount = state.racks.length;
  const totalCablesCount = state.cables.length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur bg-opacity-95">
      {/* Top utility bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-mono font-bold text-xl">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">NetRack DCIM</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  v2.6 Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Data Center Infrastructure & Cabling Management
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-300 bg-slate-950/80 px-4 py-1.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5" title="Apparati attivi / totali">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Apparati: <strong className="text-white">{activeDevicesCount}</strong>/{state.devices.length} ON
              </span>
            </div>
            <div className="w-px h-3.5 bg-slate-800" />
            <div className="flex items-center gap-1.5" title="Rack censiti">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Rack: <strong className="text-white">{totalRacksCount}</strong>
              </span>
            </div>
            <div className="w-px h-3.5 bg-slate-800" />
            <div className="flex items-center gap-1.5" title="Connessioni fisiche">
              <Network className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Cavi: <strong className="text-white">{totalCablesCount}</strong>
              </span>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenBrands}
              aria-label="Gestione Marche e Loghi"
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Gestione Marche & Loghi"
            >
              <Tag className="w-4 h-4" />
              <span className="hidden lg:inline">Marche</span>
            </button>

            <button
              onClick={onOpenDeviceTypes}
              aria-label="Gestione Tipologie Apparati"
              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Gestione Tipologie Apparati (Router, Switch, Firewall, AP, Server...)"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden lg:inline">Tipologie</span>
            </button>

            <button
              onClick={onOpenBackup}
              aria-label="Backup e Ripristino Dati"
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Backup CSV e Ripristino Completo"
            >
              <Database className="w-4 h-4" />
              <span className="hidden lg:inline">Backup / Restore</span>
            </button>

            <button
              onClick={onOpenUbuntuGuide}
              aria-label="Guida Installazione Ubuntu Server 26"
              className="p-2 text-slate-400 hover:text-orange-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Guida Installazione Ubuntu Server 26 / 24 LTS (Nginx, Systemd, Docker, SSL)"
            >
              <Server className="w-4 h-4 text-orange-400" />
              <span className="hidden lg:inline text-orange-300 font-semibold">Deploy Ubuntu 26</span>
            </button>

            {/* Active User Pill & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-200 transition-all"
                aria-label="Menu utente"
              >
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400">
                  {currentUser.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <div className="font-semibold text-slate-100 flex items-center gap-1">
                    {currentUser.username}
                    <span
                      className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                        currentUser.authType === 'LOCAL'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : currentUser.authType === 'RADIUS'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-purple-950 text-purple-300 border border-purple-800'
                      }`}
                    >
                      {currentUser.authType}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">{currentUser.role}</div>
                </div>
              </button>

              {showUserDropdown && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2"
                  onMouseLeave={() => setShowUserDropdown(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-800 text-xs">
                    <p className="font-semibold text-white">{currentUser.fullName}</p>
                    <p className="text-slate-400">{currentUser.email}</p>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                      <Shield className="w-3 h-3 text-cyan-400" />
                      <span>Autenticazione: <strong>{currentUser.authType}</strong></span>
                    </div>
                  </div>

                  {currentUser.authType === 'LOCAL' && (
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenPasswordModal();
                      }}
                      className="w-full text-left px-3 py-2 mt-1 rounded-lg text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>Modifica la mia Password</span>
                    </button>
                  )}

                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Simula Cambio Utente:
                    </div>
                    {state.users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center justify-between ${
                          u.id === currentUser.id
                            ? 'bg-cyan-950/60 text-cyan-300 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{u.username} ({u.role})</span>
                        <span className="text-[10px] text-slate-400">{u.authType}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition-colors font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnetti Sessione</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-800/80 pt-2 pb-2 overflow-x-auto scrollbar-none" aria-label="Tabs principali">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Inventario Apparati</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-slate-800 text-slate-300">
              {state.devices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('racks')}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'racks'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Rack Design & Elevation</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-slate-800 text-slate-300">
              {state.racks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cabling')}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'cabling'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Rack Cabling & Discovery</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-slate-800 text-slate-300">
              {state.cables.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sites')}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sites'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Gerarchia Siti (6 Livelli)</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Utenti & RBAC (Locale/Radius/LDAP)</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
