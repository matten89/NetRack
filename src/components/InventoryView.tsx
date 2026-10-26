/**
 * NetRack DCIM - Device Inventory Management View
 * Supports standard chassis devices, expansion modules/cards, optical SFP transceivers, and PDUs
 */
import React, { useState } from 'react';
import { useDCIM } from '../context/DCIMContext';
import {
  Device,
  PowerStatus,
  AvailabilityStatus,
  RackFace,
  DeviceModule,
  SFPTransceiver,
  ItemCategory,
  SocketType,
} from '../types/dcim';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Terminal,
  Globe,
  Trash2,
  Edit,
  Cpu,
  Radio,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  X,
  Server,
  Zap,
  MapPin,
  Box,
  Plug,
  Package,
  HardDrive,
  Link as LinkIcon,
  ChevronDown,
} from 'lucide-react';
import { getSiteHierarchyBreadcrumb, isValidIPv4 } from '../utils/validation';

interface InventoryViewProps {
  onOpenBrands: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onOpenBrands }) => {
  const {
    state,
    addDevice,
    updateDevice,
    deleteDevice,
    toggleInterfaceVisibility,
    addModuleToDevice,
    removeModuleFromDevice,
    addSFPToDevice,
    removeSFPFromDevice,
    runDiscoveryOnDevice,
    openTerminal,
  } = useDCIM();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterPower, setFilterPower] = useState('ALL');
  const [filterAvailable, setFilterAvailable] = useState('ALL');

  // Modals state
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [detailDeviceId, setDetailDeviceId] = useState<string | null>(null);

  // Form state
  const [formCategory, setFormCategory] = useState<ItemCategory>('DEVICE');
  const [formBrandId, setFormBrandId] = useState(state.brands[0]?.id || '');
  const [formModel, setFormModel] = useState('');
  const [formSN, setFormSN] = useState('');
  const [formPositionMode, setFormPositionMode] = useState<'SITE' | 'RACK'>('RACK');
  const [formSiteNodeId, setFormSiteNodeId] = useState(state.sites[0]?.id || '');
  const [formRackId, setFormRackId] = useState(state.racks[0]?.id || '');
  const [formRackRU, setFormRackRU] = useState<number>(1);
  const [formRackFace, setFormRackFace] = useState<RackFace>('FRONT');
  const [formHeightRU, setFormHeightRU] = useState<number>(1);
  const [formIsNonRackable, setFormIsNonRackable] = useState(false);
  const [formPower, setFormPower] = useState<PowerStatus>('SI');
  const [formAvailable, setFormAvailable] = useState<AvailabilityStatus>('SI');
  const [formUser, setFormUser] = useState('');
  const [formIPManagement, setFormIPManagement] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sub-item correlation fields
  const [formParentDeviceId, setFormParentDeviceId] = useState<string>('');
  const [formParentSlotOrPort, setFormParentSlotOrPort] = useState<string>('');
  const [formModuleType, setFormModuleType] = useState<DeviceModule['type']>('EXPANSION');
  const [formSfpType, setFormSfpType] = useState<SFPTransceiver['type']>('10G-SR');
  const [formSfpWavelength, setFormSfpWavelength] = useState('850nm');
  const [formSfpConnector, setFormSfpConnector] = useState<'LC' | 'MPO' | 'RJ45'>('LC');

  // PDU specific fields
  const [formPduSocketCount, setFormPduSocketCount] = useState<number>(8);
  const [formPduSocketType, setFormPduSocketType] = useState<SocketType>('SCHUKO');

  // New Module Form inside detail
  const [newModSlot, setNewModSlot] = useState('');
  const [newModModel, setNewModModel] = useState('');
  const [newModType, setNewModType] = useState<DeviceModule['type']>('EXPANSION');

  // New SFP Form inside detail
  const [newSfpPort, setNewSfpPort] = useState('');
  const [newSfpType, setNewSfpType] = useState<SFPTransceiver['type']>('10G-SR');
  const [newSfpVendor, setNewSfpVendor] = useState('Cisco');
  const [newSfpSN, setNewSfpSN] = useState('');
  const [newSfpWavelength, setNewSfpWavelength] = useState('850nm');

  // Interfaces filter inside detail
  const [ifaceFilter, setIfaceFilter] = useState<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL');

  // Filtered devices
  const filteredDevices = state.devices.filter((dev) => {
    const category = dev.category || 'DEVICE';
    if (filterCategory !== 'ALL' && category !== filterCategory) return false;
    if (filterBrand !== 'ALL' && dev.brandId !== filterBrand) return false;
    if (filterPower !== 'ALL' && dev.isPoweredOn !== filterPower) return false;
    if (filterAvailable !== 'ALL' && dev.isAvailable !== filterAvailable) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchModel = dev.model.toLowerCase().includes(q);
      const matchSN = dev.serialNumber.toLowerCase().includes(q);
      const matchIP = dev.ipManagement.toLowerCase().includes(q);
      const matchUser = dev.user.toLowerCase().includes(q);
      const matchParent = dev.parentSlotOrPort?.toLowerCase().includes(q);
      if (!matchModel && !matchSN && !matchIP && !matchUser && !matchParent) return false;
    }
    return true;
  });

  // Counts by category
  const countAll = state.devices.length;
  const countChassis = state.devices.filter((d) => !d.category || d.category === 'DEVICE').length;
  const countModules = state.devices.filter((d) => d.category === 'MODULE').length;
  const countSFPs = state.devices.filter((d) => d.category === 'SFP').length;
  const countPDUs = state.devices.filter((d) => d.category === 'PDU').length;

  const handleOpenCreateModal = (cat: ItemCategory = 'DEVICE') => {
    setShowCreateDropdown(false);
    setEditingDeviceId(null);
    setFormCategory(cat);
    setFormBrandId(cat === 'PDU' ? 'apc' : state.brands[0]?.id || '');
    setFormModel(
      cat === 'MODULE'
        ? 'Scheda Espansione 8x 10G SFP+'
        : cat === 'SFP'
        ? 'Transceiver SFP-10G-SR'
        : cat === 'PDU'
        ? 'Ciabatta PDU Rackmount 8 Prese'
        : ''
    );
    setFormSN('');
    setFormPositionMode(cat === 'PDU' ? 'RACK' : 'RACK');
    setFormSiteNodeId(state.sites[0]?.id || '');
    setFormRackId(state.racks[0]?.id || '');
    setFormRackRU(1);
    setFormRackFace(cat === 'PDU' ? 'REAR' : 'FRONT');
    setFormHeightRU(cat === 'MODULE' || cat === 'SFP' ? 0 : 1);
    setFormIsNonRackable(false);
    setFormPower('SI');
    setFormAvailable('SI');
    setFormUser('');
    setFormIPManagement('');
    setFormNotes('');
    setFormError(null);

    // Parent correlation
    setFormParentDeviceId(state.devices[0]?.id || '');
    setFormParentSlotOrPort(cat === 'MODULE' ? 'Slot 1' : cat === 'SFP' ? 'Ethernet1/1' : '');
    setFormModuleType('EXPANSION');
    setFormSfpType('10G-SR');
    setFormSfpWavelength('850nm');
    setFormSfpConnector('LC');

    // PDU
    setFormPduSocketCount(8);
    setFormPduSocketType('SCHUKO');

    setShowDeviceModal(true);
  };

  const handleOpenEditModal = (dev: Device) => {
    setEditingDeviceId(dev.id);
    setFormCategory(dev.category || 'DEVICE');
    setFormBrandId(dev.brandId);
    setFormModel(dev.model);
    setFormSN(dev.serialNumber);
    setFormPositionMode(dev.rackId ? 'RACK' : 'SITE');
    setFormSiteNodeId(dev.siteNodeId || state.sites[0]?.id || '');
    setFormRackId(dev.rackId || state.racks[0]?.id || '');
    setFormRackRU(dev.rackRU || 1);
    setFormRackFace(dev.rackFace === 'BOTH' ? 'FRONT' : dev.rackFace || 'FRONT');
    setFormHeightRU(dev.heightRU || 0);
    setFormIsNonRackable(Boolean(dev.isNonRackable));
    setFormPower(dev.isPoweredOn);
    setFormAvailable(dev.isAvailable);
    setFormUser(dev.user || '');
    setFormIPManagement(dev.ipManagement || '');
    setFormNotes(dev.notes || '');
    setFormError(null);

    // Parent
    setFormParentDeviceId(dev.parentDeviceId || '');
    setFormParentSlotOrPort(dev.parentSlotOrPort || '');
    setFormModuleType(dev.moduleType || 'EXPANSION');
    setFormSfpType(dev.sfpType || '10G-SR');
    setFormSfpWavelength(dev.wavelength || '850nm');
    setFormSfpConnector((dev.connector as any) || 'LC');

    // PDU
    setFormPduSocketCount(dev.pduConfig?.socketCount || 8);
    setFormPduSocketType(dev.pduConfig?.socketType || 'SCHUKO');

    setShowDeviceModal(true);
  };

  const handleSaveDevice = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Required fields check
    if (!formBrandId) {
      setFormError('La Marca è obbligatoria.');
      return;
    }
    if (!formModel.trim()) {
      setFormError('Il Modello è obbligatorio.');
      return;
    }
    if (!formSN.trim()) {
      setFormError('Il Serial Number (SN) è obbligatorio.');
      return;
    }

    // IP validation if filled
    if (formIPManagement.trim() && !isValidIPv4(formIPManagement.trim())) {
      setFormError('Il campo IP Management deve contenere un indirizzo IPv4 valido (es. 192.168.1.10).');
      return;
    }

    // Max 300 notes
    if (formNotes.length > 300) {
      setFormError(`Le Note possono contenere massimo 300 caratteri (attualmente: ${formNotes.length}).`);
      return;
    }

    const isSubItem = formCategory === 'MODULE' || formCategory === 'SFP';

    const payload: Partial<Device> = {
      category: formCategory,
      brandId: formBrandId,
      model: formModel.trim(),
      serialNumber: formSN.trim(),
      siteNodeId: !isSubItem && formPositionMode === 'SITE' ? formSiteNodeId : undefined,
      rackId: !isSubItem && formPositionMode === 'RACK' ? formRackId : undefined,
      rackRU: !isSubItem && formPositionMode === 'RACK' ? formRackRU : undefined,
      rackFace: !isSubItem && formPositionMode === 'RACK' ? formRackFace : undefined,
      heightRU: isSubItem ? 0 : formHeightRU,
      isNonRackable: formIsNonRackable,
      isPoweredOn: formPower,
      isAvailable: formAvailable,
      user: formUser.trim(),
      ipManagement: formIPManagement.trim(),
      notes: formNotes.trim(),
      parentDeviceId: isSubItem && formParentDeviceId ? formParentDeviceId : undefined,
      parentSlotOrPort: isSubItem ? formParentSlotOrPort.trim() : undefined,
      moduleType: formCategory === 'MODULE' ? formModuleType : undefined,
      sfpType: formCategory === 'SFP' ? formSfpType : undefined,
      wavelength: formCategory === 'SFP' ? formSfpWavelength : undefined,
      connector: formCategory === 'SFP' ? formSfpConnector : undefined,
      pduConfig:
        formCategory === 'PDU'
          ? {
              socketCount: formPduSocketCount,
              socketType: formPduSocketType,
              circuitBreakerAmps: 16,
              totalPowerWatts: formPduSocketType === 'SCHUKO' ? 3680 : 3500,
              hasSurgeProtection: true,
              usedSockets: 0,
            }
          : undefined,
      deviceRole: formCategory === 'PDU' ? 'PDU' : undefined,
    };

    if (editingDeviceId) {
      const res = updateDevice(editingDeviceId, payload);
      if (!res.success) {
        setFormError(res.error || 'Errore durante la modifica.');
        return;
      }
    } else {
      const res = addDevice({
        ...(payload as any),
        modules: [],
        sfps: [],
        interfaces: [],
      });
      if (!res.success) {
        setFormError(res.error || 'Errore durante la creazione.');
        return;
      }
    }

    setShowDeviceModal(false);
  };

  // Selected device for detail drawer
  const detailDev = detailDeviceId ? state.devices.find((d) => d.id === detailDeviceId) : null;

  const handleAddModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailDev || !newModSlot.trim() || !newModModel.trim()) return;

    addModuleToDevice(detailDev.id, {
      slotName: newModSlot.trim(),
      model: newModModel.trim(),
      type: newModType,
      status: 'OK',
    });

    setNewModSlot('');
    setNewModModel('');
  };

  const handleAddSFP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailDev || !newSfpPort.trim() || !newSfpSN.trim()) return;

    addSFPToDevice(detailDev.id, {
      interfaceName: newSfpPort.trim(),
      type: newSfpType,
      vendor: newSfpVendor.trim() || 'Cisco',
      serialNumber: newSfpSN.trim(),
      wavelength: newSfpWavelength,
      connector: 'LC',
    });

    setNewSfpPort('');
    setNewSfpSN('');
  };

  return (
    <div className="space-y-6">
      {/* Category Pills Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setFilterCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            filterCategory === 'ALL'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Tutti gli Elementi</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] text-cyan-300 font-mono">
            {countAll}
          </span>
        </button>

        <button
          onClick={() => setFilterCategory('DEVICE')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            filterCategory === 'DEVICE'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Apparati (Chassis/Server)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] text-blue-300 font-mono">
            {countChassis}
          </span>
        </button>

        <button
          onClick={() => setFilterCategory('MODULE')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            filterCategory === 'MODULE'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Moduli & Schede Aggiuntive</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] text-purple-300 font-mono">
            {countModules}
          </span>
        </button>

        <button
          onClick={() => setFilterCategory('SFP')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            filterCategory === 'SFP'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Transceiver Ottici & SFP</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] text-emerald-300 font-mono">
            {countSFPs}
          </span>
        </button>

        <button
          onClick={() => setFilterCategory('PDU')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            filterCategory === 'PDU'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Plug className="w-3.5 h-3.5" />
          <span>Ciabatte & PDU</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] text-amber-300 font-mono">
            {countPDUs}
          </span>
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        {/* Search */}
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per Modello, Serial Number, IP, Slot o Utilizzatore..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Filters & Add Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Brand Filter */}
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Tutte le Marche</option>
            {state.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Power Filter */}
          <select
            value={filterPower}
            onChange={(e) => setFilterPower(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Alimentazione: Tutti</option>
            <option value="SI">Acceso (SI)</option>
            <option value="NO">Spento / Stock (NO)</option>
          </select>

          {/* Availability Filter */}
          <select
            value={filterAvailable}
            onChange={(e) => setFilterAvailable(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Disponibilità: Tutti</option>
            <option value="SI">Disponibile (SI)</option>
            <option value="NO">Non Disponibile (NO)</option>
          </select>

          {/* New Item Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowCreateDropdown(!showCreateDropdown)}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/40 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Elemento</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showCreateDropdown && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-50 animate-in fade-in"
                onMouseLeave={() => setShowCreateDropdown(false)}
              >
                <button
                  onClick={() => handleOpenCreateModal('DEVICE')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Server className="w-4 h-4 text-blue-400" />
                  <span>Nuovo Apparato Standard</span>
                </button>
                <button
                  onClick={() => handleOpenCreateModal('MODULE')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>Nuova Scheda / Modulo</span>
                </button>
                <button
                  onClick={() => handleOpenCreateModal('SFP')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Nuovo Transceiver SFP</span>
                </button>
                <button
                  onClick={() => handleOpenCreateModal('PDU')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Plug className="w-4 h-4 text-amber-400" />
                  <span>Nuova Ciabatta / PDU</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Inventario Hardware ({filteredDevices.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Mostrati {filteredDevices.length} di {state.devices.length} elementi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                <th className="py-3 px-4">Categoria & Tipo</th>
                <th className="py-3 px-4">Marca & Modello</th>
                <th className="py-3 px-4">Serial Number (SN)</th>
                <th className="py-3 px-4">Collocazione / Host Padre</th>
                <th className="py-3 px-4">Acceso</th>
                <th className="py-3 px-4">Disponibilità</th>
                <th className="py-3 px-4">Utilizzatore</th>
                <th className="py-3 px-4">IP / Dettagli Prese</th>
                <th className="py-3 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                    Nessun elemento corrisponde ai criteri di ricerca impostati.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => {
                  const brand = state.brands.find((b) => b.id === dev.brandId);
                  const category = dev.category || 'DEVICE';
                  const parentDevice = dev.parentDeviceId
                    ? state.devices.find((d) => d.id === dev.parentDeviceId)
                    : null;
                  const rack = dev.rackId ? state.racks.find((r) => r.id === dev.rackId) : null;
                  const siteBreadcrumb = dev.siteNodeId
                    ? getSiteHierarchyBreadcrumb(dev.siteNodeId, state.sites)
                    : rack?.siteNodeId
                    ? getSiteHierarchyBreadcrumb(rack.siteNodeId, state.sites)
                    : 'Nessuna posizione';

                  return (
                    <tr key={dev.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Category Badge */}
                      <td className="py-3 px-4">
                        {category === 'DEVICE' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1 w-fit">
                            <Server className="w-3 h-3" />
                            <span>Chassis</span>
                          </span>
                        )}
                        {category === 'MODULE' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1 w-fit">
                            <Cpu className="w-3 h-3" />
                            <span>Scheda/Mod</span>
                          </span>
                        )}
                        {category === 'SFP' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                            <Radio className="w-3 h-3" />
                            <span>SFP Optic</span>
                          </span>
                        )}
                        {category === 'PDU' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 w-fit">
                            <Plug className="w-3 h-3" />
                            <span>PDU Ciabatta</span>
                          </span>
                        )}
                      </td>

                      {/* Brand & Model */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: brand?.color || '#049fd9' }}
                            title={brand?.name}
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{dev.model}</span>
                              {dev.isNonRackable && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                                  Mensola
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {brand?.name || dev.brandId} {dev.heightRU > 0 ? `• ${dev.heightRU} RU` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Serial Number */}
                      <td className="py-3 px-4 font-mono font-semibold text-cyan-300">
                        {dev.serialNumber}
                      </td>

                      {/* Position / Host Padre */}
                      <td className="py-3 px-4">
                        {dev.parentDeviceId ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-purple-300 flex items-center gap-1">
                              <LinkIcon className="w-3 h-3 text-purple-400 shrink-0" />
                              <span>Installato su: {parentDevice?.model || dev.parentDeviceId}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Alloggiamento: <strong className="text-white">{dev.parentSlotOrPort || 'Slot Dedicato'}</strong>
                            </div>
                          </div>
                        ) : category === 'MODULE' || category === 'SFP' ? (
                          <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 text-[11px] font-mono">
                            📦 A Magazzino (Scorta)
                          </span>
                        ) : dev.rackId ? (
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1">
                              <Server className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>{rack?.name || dev.rackId}</span>
                              <span className="text-cyan-400 font-mono text-[11px]">
                                (RU {dev.rackRU || 'N/D'} - {dev.rackFace || 'FRONT'})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-xs" title={siteBreadcrumb}>
                              {siteBreadcrumb}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate max-w-xs" title={siteBreadcrumb}>
                              {siteBreadcrumb}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Powered On */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                            dev.isPoweredOn === 'SI'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {dev.isPoweredOn}
                        </span>
                      </td>

                      {/* Availability */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                            dev.isAvailable === 'SI'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {dev.isAvailable}
                        </span>
                      </td>

                      {/* User */}
                      <td className="py-3 px-4 text-slate-300">
                        {dev.user || <span className="text-slate-600">-</span>}
                      </td>

                      {/* IP Management or PDU Sockets info */}
                      <td className="py-3 px-4">
                        {dev.pduConfig ? (
                          <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-950/40 px-2 py-1 rounded border border-amber-800">
                            <Plug className="w-3 h-3 text-amber-400" />
                            <span>
                              {dev.pduConfig.socketCount}x{' '}
                              {dev.pduConfig.socketType === 'SCHUKO'
                                ? 'Schuko'
                                : dev.pduConfig.socketType === 'ITALIAN_BIPASSO'
                                ? 'Bipasso 10/16A'
                                : 'Miste'}
                            </span>
                          </div>
                        ) : dev.ipManagement ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-400 text-xs font-medium">
                              {dev.ipManagement}
                            </span>
                            <button
                              onClick={() => openTerminal(dev)}
                              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                              title="Apri Terminale SSH"
                            >
                              <Terminal className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : dev.category === 'SFP' ? (
                          <span className="font-mono text-[11px] text-emerald-400">
                            {dev.sfpType || '10G'} ({dev.wavelength || '850nm'})
                          </span>
                        ) : dev.category === 'MODULE' ? (
                          <span className="font-mono text-[11px] text-purple-400">
                            {dev.moduleType || 'EXPANSION'}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(!dev.category || dev.category === 'DEVICE') && (
                            <button
                              onClick={() => setDetailDeviceId(dev.id)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-medium transition-colors"
                              title="Visualizza Moduli, SFP e Interfacce"
                            >
                              Dettaglio
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(dev)}
                            aria-label={`Modifica apparato ${dev.model}`}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                            title="Modifica"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Rimuovere l'elemento ${dev.model} (SN: ${dev.serialNumber}) dall'inventario?`)) {
                                deleteDevice(dev.id);
                              }
                            }}
                            aria-label={`Elimina elemento ${dev.model}`}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                            title="Elimina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Create / Edit Modal */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">
                  {editingDeviceId ? 'Modifica Elemento' : 'Nuovo Elemento in Inventario'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {formCategory === 'DEVICE'
                    ? 'Apparato Standard'
                    : formCategory === 'MODULE'
                    ? 'Scheda / Modulo'
                    : formCategory === 'SFP'
                    ? 'Transceiver Ottico SFP'
                    : 'Ciabatta / PDU'}
                </span>
              </div>
              <button
                onClick={() => setShowDeviceModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Category Selector if creating new */}
              {!editingDeviceId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tipologia di Elemento:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormCategory('DEVICE');
                        setFormHeightRU(1);
                      }}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                        formCategory === 'DEVICE'
                          ? 'bg-blue-600 text-white border-blue-500 shadow'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Server className="w-3.5 h-3.5" />
                      <span>Apparato</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormCategory('MODULE');
                        setFormHeightRU(0);
                      }}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                        formCategory === 'MODULE'
                          ? 'bg-purple-600 text-white border-purple-500 shadow'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Scheda/Mod</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormCategory('SFP');
                        setFormHeightRU(0);
                      }}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                        formCategory === 'SFP'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>SFP Optic</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormCategory('PDU');
                        setFormHeightRU(1);
                        setFormRackFace('REAR');
                      }}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                        formCategory === 'PDU'
                          ? 'bg-amber-600 text-white border-amber-500 shadow'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Plug className="w-3.5 h-3.5" />
                      <span>Ciabatta PDU</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Specific Sub-Item Fields: Parent Device and Slot/Port */}
              {(formCategory === 'MODULE' || formCategory === 'SFP') && (
                <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/60 space-y-3">
                  <div className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Associazione con Apparato Chassis Padre</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
                        Installa su Apparato (opzionale):
                      </label>
                      <select
                        value={formParentDeviceId}
                        onChange={(e) => setFormParentDeviceId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-purple-500"
                      >
                        <option value="">-- Nessuno (A Magazzino / Scorta) --</option>
                        {state.devices
                          .filter((d) => !d.category || d.category === 'DEVICE')
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.model} ({d.serialNumber})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
                        Nome Slot o Porta:
                      </label>
                      <input
                        type="text"
                        value={formParentSlotOrPort}
                        onChange={(e) => setFormParentSlotOrPort(e.target.value)}
                        placeholder={formCategory === 'MODULE' ? 'es. Slot 1, PSU-1, PCIe 1' : 'es. Ethernet1/1, eth0'}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>

                  {formCategory === 'MODULE' && (
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Tipo di Scheda:</label>
                      <select
                        value={formModuleType}
                        onChange={(e) => setFormModuleType(e.target.value as any)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-purple-500"
                      >
                        <option value="EXPANSION">Modulo di Espansione</option>
                        <option value="LINE_CARD">Line Card</option>
                        <option value="SUPERVISOR">Supervisor Controller</option>
                        <option value="POWER_SUPPLY">Alimentatore (Power Supply)</option>
                        <option value="FAN">Ventola (Fan Tray)</option>
                      </select>
                    </div>
                  )}

                  {formCategory === 'SFP' && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">Tipo SFP:</label>
                        <select
                          value={formSfpType}
                          onChange={(e) => setFormSfpType(e.target.value as any)}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-purple-500"
                        >
                          <option value="1G-SX">1G-SX</option>
                          <option value="1G-LX">1G-LX</option>
                          <option value="10G-SR">10G-SR</option>
                          <option value="10G-LR">10G-LR</option>
                          <option value="25G-SR">25G-SR</option>
                          <option value="100G-SR4">100G-SR4</option>
                          <option value="10G-DAC">10G-DAC</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">Wavelength:</label>
                        <input
                          type="text"
                          value={formSfpWavelength}
                          onChange={(e) => setFormSfpWavelength(e.target.value)}
                          placeholder="850nm"
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">Connettore:</label>
                        <select
                          value={formSfpConnector}
                          onChange={(e) => setFormSfpConnector(e.target.value as any)}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none"
                        >
                          <option value="LC">LC</option>
                          <option value="MPO">MPO</option>
                          <option value="RJ45">RJ45</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Specific PDU Fields */}
              {formCategory === 'PDU' && (
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/60 space-y-3">
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Plug className="w-3.5 h-3.5" />
                    <span>Configurazione Prese Ciabatta di Alimentazione</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
                        Numero Prese:
                      </label>
                      <select
                        value={formPduSocketCount}
                        onChange={(e) => setFormPduSocketCount(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500 font-mono"
                      >
                        <option value={6}>6 Prese</option>
                        <option value={8}>8 Prese (Standard 1U)</option>
                        <option value={12}>12 Prese</option>
                        <option value={16}>16 Prese</option>
                        <option value={24}>24 Prese</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
                        Tipologia Prese:
                      </label>
                      <select
                        value={formPduSocketType}
                        onChange={(e) => setFormPduSocketType(e.target.value as any)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500 font-semibold"
                      >
                        <option value="SCHUKO">Prese Schuko (Tedesca CEE 7/4)</option>
                        <option value="ITALIAN_BIPASSO">Prese Italiane Bipasso 10/16A (P17/11)</option>
                        <option value="MIXED">Miste (Schuko + Italiane Bipasso)</option>
                        <option value="IEC_C13">Prese IEC C13</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Brand & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Marca <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={onOpenBrands}
                      className="text-[11px] text-cyan-400 hover:underline"
                    >
                      + Personalizza marche
                    </button>
                  </div>
                  <select
                    required
                    value={formBrandId}
                    onChange={(e) => setFormBrandId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                  >
                    {state.brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Modello <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder="es. Nexus 93180, C9300-NM-8X, SFP-10G-SR..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Serial Number & Height */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Serial Number (SN) - Univoco <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSN}
                    onChange={(e) => setFormSN(e.target.value)}
                    placeholder="es. FOC243829KA"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Altezza RU:
                  </label>
                  <select
                    disabled={formCategory === 'MODULE' || formCategory === 'SFP'}
                    value={formHeightRU}
                    onChange={(e) => setFormHeightRU(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
                  >
                    <option value={0}>0 RU (Scheda/SFP)</option>
                    <option value={1}>1 RU</option>
                    <option value={2}>2 RU</option>
                    <option value={3}>3 RU</option>
                    <option value={4}>4 RU</option>
                  </select>
                </div>
              </div>

              {/* Non-rackable / Mensola toggle */}
              {formCategory === 'DEVICE' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">Apparato non rackable (da mensola)</div>
                    <div className="text-[11px] text-slate-400">
                      Abilita per mini router, firewall desktop, Raspberry Pi o apparati condivisibili su mensola.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsNonRackable}
                    onChange={(e) => setFormIsNonRackable(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              )}

              {/* Posizione (Sito vs Rack) only for standalone devices / PDUs */}
              {formCategory !== 'MODULE' && formCategory !== 'SFP' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white uppercase tracking-wider">
                      Posizione Apparato:
                    </label>
                    <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setFormPositionMode('RACK')}
                        className={`px-3 py-1 rounded font-medium ${
                          formPositionMode === 'RACK'
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        A Rack
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormPositionMode('SITE')}
                        className={`px-3 py-1 rounded font-medium ${
                          formPositionMode === 'SITE'
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Gerarchia Sito
                      </button>
                    </div>
                  </div>

                  {formPositionMode === 'RACK' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Seleziona Rack:</label>
                        <select
                          value={formRackId}
                          onChange={(e) => setFormRackId(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                        >
                          {state.racks.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.totalRU} RU)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Posizione RU Iniziale:</label>
                        <input
                          type="number"
                          min={1}
                          max={48}
                          value={formRackRU}
                          onChange={(e) => setFormRackRU(parseInt(e.target.value, 10))}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Faccia Rack:</label>
                        <select
                          value={formRackFace}
                          onChange={(e) => setFormRackFace(e.target.value as any)}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-semibold"
                        >
                          <option value="FRONT">Fronte</option>
                          <option value="REAR">Retro</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Nodo Gerarchico del Sito (fino a 6 livelli):
                      </label>
                      <select
                        value={formSiteNodeId}
                        onChange={(e) => setFormSiteNodeId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                      >
                        {state.sites.map((s) => (
                          <option key={s.id} value={s.id}>
                            [{s.levelName}] {s.name} ({getSiteHierarchyBreadcrumb(s.id, state.sites)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Status & Availability */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Acceso:
                  </label>
                  <select
                    value={formPower}
                    onChange={(e) => setFormPower(e.target.value as PowerStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-semibold"
                  >
                    <option value="SI">SI (Alimentato)</option>
                    <option value="NO">NO (Spento / Stock)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Disponibilità:
                  </label>
                  <select
                    value={formAvailable}
                    onChange={(e) => setFormAvailable(e.target.value as AvailabilityStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-semibold"
                  >
                    <option value="SI">SI (Disponibile)</option>
                    <option value="NO">NO (Assegnato/Occupato)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Utilizzatore:
                  </label>
                  <input
                    type="text"
                    value={formUser}
                    onChange={(e) => setFormUser(e.target.value)}
                    placeholder="es. Team Cloud, Security Ops..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* IP Management */}
              {formCategory === 'DEVICE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    IP Management (IPv4 per accesso SSH / HTTP):
                  </label>
                  <input
                    type="text"
                    value={formIPManagement}
                    onChange={(e) => setFormIPManagement(e.target.value)}
                    placeholder="es. 10.250.1.1 o 192.168.1.100"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              )}

              {/* Notes with character limit indicator */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Note (massimo 300 caratteri):
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      formNotes.length > 300 ? 'text-rose-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {formNotes.length} / 300
                  </span>
                </div>
                <textarea
                  maxLength={300}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Specifiche tecniche, matricola ottica o dettagli di allocazione..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeviceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-900/30"
                >
                  {editingDeviceId ? 'Salva Modifiche' : 'Crea Elemento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Device Detail Drawer / Modal (Modules, SFPs, Interfaces Discovery) */}
      {detailDev && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{detailDev.model}</span>
                    <span className="text-xs font-mono text-cyan-400">({detailDev.serialNumber})</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Gestione schede correlate, transceiver SFP e discovery interfacce
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {detailDev.ipManagement && (
                  <button
                    onClick={() => openTerminal(detailDev)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Terminale SSH</span>
                  </button>
                )}
                <button
                  onClick={() => setDetailDeviceId(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Tabs / Sections */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Section 1: Modules / Line cards */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Schede & Moduli Correlati ({detailDev.modules?.length || 0})
                    </h4>
                  </div>
                </div>

                {/* Modules list */}
                <div className="space-y-2 mb-3">
                  {(detailDev.modules || []).length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      Nessun modulo o scheda opzionale installata.
                    </div>
                  ) : (
                    detailDev.modules.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] text-cyan-300 font-bold">
                            {m.slotName}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-white">{m.model}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Tipo: {m.type} &bull; SN: {m.serialNumber || 'N/D'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {m.status}
                          </span>
                          <button
                            onClick={() => removeModuleFromDevice(detailDev.id, m.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded"
                            title="Rimuovi modulo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Form Add Module */}
                <form
                  onSubmit={handleAddModule}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center gap-2 text-xs"
                >
                  <input
                    type="text"
                    required
                    value={newModSlot}
                    onChange={(e) => setNewModSlot(e.target.value)}
                    placeholder="Slot (es. Slot-1, PSU-1)"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-mono w-32"
                  />
                  <input
                    type="text"
                    required
                    value={newModModel}
                    onChange={(e) => setNewModModel(e.target.value)}
                    placeholder="Modello (es. C9300-NM-8X)"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 min-w-[140px]"
                  />
                  <select
                    value={newModType}
                    onChange={(e) => setNewModType(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                  >
                    <option value="LINE_CARD">Line Card</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="POWER_SUPPLY">Alimentatore (PSU)</option>
                    <option value="FAN">Ventola (Fan)</option>
                    <option value="EXPANSION">Modulo Espansione</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Aggiungi Modulo</span>
                  </button>
                </form>
              </div>

              <div className="border-t border-slate-800" />

              {/* Section 2: SFPs / Transceivers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Transceiver Ottici & SFP Correlati ({detailDev.sfps?.length || 0})
                    </h4>
                  </div>
                </div>

                {/* SFP list */}
                <div className="space-y-2 mb-3">
                  {(detailDev.sfps || []).length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      Nessun transceiver SFP censito su questo apparato.
                    </div>
                  ) : (
                    detailDev.sfps.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] text-emerald-300 font-bold">
                            {s.interfaceName}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{s.type}</span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                ({s.wavelength || '850nm'} - Connettore {s.connector})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Vendor: {s.vendor} &bull; S/N: {s.serialNumber}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => removeSFPFromDevice(detailDev.id, s.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded"
                          title="Rimuovi SFP"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Form Add SFP */}
                <form
                  onSubmit={handleAddSFP}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center gap-2 text-xs"
                >
                  <input
                    type="text"
                    required
                    value={newSfpPort}
                    onChange={(e) => setNewSfpPort(e.target.value)}
                    placeholder="Porta (es. Ethernet1/1)"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-mono w-36"
                  />
                  <select
                    value={newSfpType}
                    onChange={(e) => setNewSfpType(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                  >
                    <option value="1G-SX">1G-SX (MMF)</option>
                    <option value="1G-LX">1G-LX (SMF)</option>
                    <option value="10G-SR">10G-SR (MMF)</option>
                    <option value="10G-LR">10G-LR (SMF)</option>
                    <option value="25G-SR">25G-SR (MMF)</option>
                    <option value="100G-SR4">100G-SR4 (MPO)</option>
                    <option value="10G-DAC">10G-DAC</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={newSfpSN}
                    onChange={(e) => setNewSfpSN(e.target.value)}
                    placeholder="Matricola SFP"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-mono uppercase min-w-[120px]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Aggiungi SFP</span>
                  </button>
                </form>
              </div>

              <div className="border-t border-slate-800" />

              {/* Section 3: Interfaces & Discovery (Nascondi / Mostra) */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Radio className="w-4 h-4 text-cyan-400" />
                      <span>Interfacce & Discovery di Rete ({detailDev.interfaces?.length || 0})</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Gestisci la visibilità delle porte e aggiorna la topologia via LLDP / CDP
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Filter visibility */}
                    <select
                      value={ifaceFilter}
                      onChange={(e) => setIfaceFilter(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none"
                    >
                      <option value="ALL">Tutte le Porte</option>
                      <option value="VISIBLE">Solo Visibili</option>
                      <option value="HIDDEN">Solo Nascoste</option>
                    </select>

                    <button
                      onClick={() => {
                        runDiscoveryOnDevice(detailDev.id);
                        alert(`Discovery di rete completata per ${detailDev.model}! Interfacce e vicini aggiornati.`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Avvia Discovery Porte</span>
                    </button>
                  </div>
                </div>

                {/* Interfaces List */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {(detailDev.interfaces || [])
                    .filter((iface) => {
                      if (ifaceFilter === 'VISIBLE') return !iface.isHidden;
                      if (ifaceFilter === 'HIDDEN') return iface.isHidden;
                      return true;
                    })
                    .map((iface) => (
                      <div
                        key={iface.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                          iface.isHidden
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              iface.status === 'UP' ? 'bg-emerald-400' : 'bg-slate-600'
                            }`}
                          />
                          <div>
                            <div className="font-mono font-bold text-white flex items-center gap-2">
                              <span>{iface.name}</span>
                              <span className="text-[10px] font-normal text-slate-400">
                                ({iface.type} &bull; VLAN {iface.vlan || 1})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              MAC: {iface.macAddress || 'N/D'} &bull; Scoperto via: {iface.discoveredVia || 'MANUAL'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                              iface.isHidden
                                ? 'bg-slate-900 text-slate-500 border border-slate-800'
                                : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            }`}
                          >
                            {iface.isHidden ? 'Nascosta' : 'Visibile'}
                          </span>

                          <button
                            onClick={() => toggleInterfaceVisibility(detailDev.id, iface.id)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
                            title={iface.isHidden ? 'Mostra interfaccia' : 'Nascondi interfaccia non necessaria'}
                          >
                            {iface.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{iface.isHidden ? 'Mostra' : 'Nascondi'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
