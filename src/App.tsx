/**
 * NetRack DCIM - Main Application Component
 */
import React, { useState } from 'react';
import { DCIMProvider, useDCIM } from './context/DCIMContext';
import { Header } from './components/Header';
import { InventoryView } from './components/InventoryView';
import { RackDesignView } from './components/RackDesignView';
import { RackCablingView } from './components/RackCablingView';
import { SiteHierarchyView } from './components/SiteHierarchyView';
import { UserManagementView } from './components/UserManagementView';
import { SSHTerminalModal } from './components/SSHTerminalModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { BrandsModal } from './components/BrandsModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { UbuntuInstallModal } from './components/UbuntuInstallModal';
import {
  Server,
  Network,
  Cpu,
  Layers,
  ShieldCheck,
  HardDrive,
  Info,
} from 'lucide-react';

const DCIMDashboard: React.FC = () => {
  const { activeTab, terminalDevice, closeTerminal } = useDCIM();
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showBrandsModal, setShowBrandsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUbuntuModal, setShowUbuntuModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Header
        onOpenBackup={() => setShowBackupModal(true)}
        onOpenBrands={() => setShowBrandsModal(true)}
        onOpenPasswordModal={() => setShowPasswordModal(true)}
        onOpenUbuntuGuide={() => setShowUbuntuModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'inventory' && (
          <InventoryView onOpenBrands={() => setShowBrandsModal(true)} />
        )}
        {activeTab === 'racks' && <RackDesignView />}
        {activeTab === 'cabling' && <RackCablingView />}
        {activeTab === 'sites' && <SiteHierarchyView />}
        {activeTab === 'users' && (
          <UserManagementView onOpenPasswordModal={() => setShowPasswordModal(true)} />
        )}
      </main>

      {/* Modals */}
      {terminalDevice && (
        <SSHTerminalModal device={terminalDevice} onClose={closeTerminal} />
      )}

      {showBackupModal && (
        <BackupRestoreModal onClose={() => setShowBackupModal(false)} />
      )}

      {showBrandsModal && (
        <BrandsModal onClose={() => setShowBrandsModal(false)} />
      )}

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      {showUbuntuModal && (
        <UbuntuInstallModal onClose={() => setShowUbuntuModal(false)} />
      )}

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-4 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-slate-400">NetRack DCIM Engine v2.6 Online</span>
            <span>&bull;</span>
            <span>Gerarchia 6 Livelli &bull; Rack Elevation Fronte/Retro &bull; Discovery LLDP/CDP &bull; RBAC</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Storage Locale Persistente &bull; Export CSV & Backup JSON
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <DCIMProvider>
      <DCIMDashboard />
    </DCIMProvider>
  );
}
