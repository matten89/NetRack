/**
 * NetRack DCIM - Global Context & State Management
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Brand,
  SiteNode,
  Rack,
  RackInstalledItem,
  Device,
  Cable,
  User,
  UserGroup,
  DCIMState,
  RackFace,
  DeviceModule,
  SFPTransceiver,
  NetworkInterface,
  SocketType,
} from '../types/dcim';
import {
  INITIAL_BRANDS,
  INITIAL_SITES,
  INITIAL_RACKS,
  INITIAL_DEVICES,
  INITIAL_RACK_ITEMS,
  INITIAL_CABLES,
  INITIAL_GROUPS,
  INITIAL_USERS,
} from '../data/seedData';
import { validateSerialNumber, validateDeviceNotes } from '../utils/validation';
import { canInstallItem } from '../utils/rackEngine';
import { simulateDeviceDiscovery } from '../utils/discoverySimulator';

interface DCIMContextType {
  state: DCIMState;
  
  // Navigation
  activeTab: 'inventory' | 'racks' | 'cabling' | 'sites' | 'users';
  setActiveTab: (tab: 'inventory' | 'racks' | 'cabling' | 'sites' | 'users') => void;
  selectedRackId: string;
  setSelectedRackId: (id: string) => void;
  
  // Devices CRUD
  addDevice: (device: Omit<Device, 'id'>) => { success: boolean; error?: string };
  updateDevice: (id: string, updates: Partial<Device>) => { success: boolean; error?: string };
  deleteDevice: (id: string) => void;
  toggleInterfaceVisibility: (deviceId: string, interfaceId: string) => void;
  addModuleToDevice: (deviceId: string, mod: Omit<DeviceModule, 'id'>) => void;
  removeModuleFromDevice: (deviceId: string, moduleId: string) => void;
  addSFPToDevice: (deviceId: string, sfp: Omit<SFPTransceiver, 'id'>) => void;
  removeSFPFromDevice: (deviceId: string, sfpId: string) => void;
  
  // Racks & Elevation
  addRack: (rack: Omit<Rack, 'id'>) => void;
  updateRack: (id: string, updates: Partial<Rack>) => void;
  deleteRack: (id: string) => void;
  mountDeviceToRack: (
    rackId: string,
    deviceId: string,
    startRU: number,
    heightRU: number,
    face: RackFace | 'BOTH'
  ) => { success: boolean; error?: string };
  installPDUToRack: (
    rackId: string,
    startRU: number,
    face: RackFace,
    pduData: {
      model: string;
      brandId: string;
      serialNumber: string;
      socketCount: number;
      socketType: SocketType;
      circuitBreakerAmps?: number;
      user?: string;
      notes?: string;
    }
  ) => { success: boolean; error?: string };
  addShelfToRack: (
    rackId: string,
    startRU: number,
    heightRU: number,
    face: RackFace | 'BOTH'
  ) => { success: boolean; error?: string };
  mountDeviceToShelf: (shelfItemId: string, slotIndex: number, deviceId: string) => void;
  unmountRackItem: (itemId: string) => void;
  
  // Cabling & Discovery
  addCable: (cable: Omit<Cable, 'id'>) => void;
  updateCable: (id: string, updates: Partial<Cable>) => void;
  deleteCable: (id: string) => void;
  runDiscoveryOnDevice: (deviceId: string) => any;
  
  // Site Hierarchy (6 levels)
  addSiteNode: (node: Omit<SiteNode, 'id'>) => void;
  deleteSiteNode: (id: string) => void;
  
  // Brands
  addBrand: (brand: Omit<Brand, 'id'>) => void;
  
  // Users & RBAC
  currentUser: User;
  switchUser: (userId: string) => void;
  updateUserPassword: (userId: string, newPassword: string) => { success: boolean; error?: string };
  addUser: (user: Omit<User, 'id'>) => void;
  deleteUser: (id: string) => void;
  
  // Terminal Modal
  terminalDevice: Device | null;
  openTerminal: (device: Device) => void;
  closeTerminal: () => void;
  
  // Backup / Restore
  restoreFullSystem: (newState: DCIMState) => void;
  resetToDefaults: () => void;
}

const STORAGE_KEY = 'netrack_dcim_state_v2';

const DCIMContext = createContext<DCIMContextType | undefined>(undefined);

export const DCIMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'racks' | 'cabling' | 'sites' | 'users'>('inventory');
  const [selectedRackId, setSelectedRackId] = useState<string>('rack-01');
  const [terminalDevice, setTerminalDevice] = useState<Device | null>(null);

  // Initialize state from LocalStorage or seed data
  const [state, setState] = useState<DCIMState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.devices && parsed.racks) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load DCIM state from localStorage, using initial seeds', e);
    }
    return {
      brands: INITIAL_BRANDS,
      sites: INITIAL_SITES,
      racks: INITIAL_RACKS,
      rackItems: INITIAL_RACK_ITEMS,
      devices: INITIAL_DEVICES,
      cables: INITIAL_CABLES,
      groups: INITIAL_GROUPS,
      users: INITIAL_USERS,
      currentUser: INITIAL_USERS[0],
    };
  });

  // Persist to LocalStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [state]);

  // Devices
  const addDevice = (deviceData: Omit<Device, 'id'>) => {
    const snCheck = validateSerialNumber(deviceData.serialNumber, state.devices);
    if (!snCheck.valid) {
      return { success: false, error: snCheck.error };
    }
    const notesCheck = validateDeviceNotes(deviceData.notes);
    if (!notesCheck.valid) {
      return { success: false, error: notesCheck.error };
    }

    const newDevice: Device = {
      ...deviceData,
      id: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      modules: deviceData.modules || [],
      sfps: deviceData.sfps || [],
      interfaces: deviceData.interfaces || [],
    };

    setState((prev) => ({
      ...prev,
      devices: [newDevice, ...prev.devices],
    }));

    return { success: true };
  };

  const updateDevice = (id: string, updates: Partial<Device>) => {
    if (updates.serialNumber) {
      const snCheck = validateSerialNumber(updates.serialNumber, state.devices, id);
      if (!snCheck.valid) return { success: false, error: snCheck.error };
    }
    if (updates.notes !== undefined) {
      const notesCheck = validateDeviceNotes(updates.notes);
      if (!notesCheck.valid) return { success: false, error: notesCheck.error };
    }

    setState((prev) => ({
      ...prev,
      devices: prev.devices.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
    return { success: true };
  };

  const deleteDevice = (id: string) => {
    setState((prev) => ({
      ...prev,
      devices: prev.devices.filter((d) => d.id !== id),
      rackItems: prev.rackItems.filter((item) => {
        if (item.deviceId === id) return false;
        if (item.shelfSubSlots) {
          item.shelfSubSlots = item.shelfSubSlots.map((s) => (s.deviceId === id ? { ...s, deviceId: undefined } : s));
        }
        return true;
      }),
      cables: prev.cables.filter((c) => c.pointA.deviceId !== id && c.pointB.deviceId !== id),
    }));
  };

  const toggleInterfaceVisibility = (deviceId: string, interfaceId: string) => {
    setState((prev) => ({
      ...prev,
      devices: prev.devices.map((d) => {
        if (d.id !== deviceId) return d;
        return {
          ...d,
          interfaces: d.interfaces.map((iface) =>
            iface.id === interfaceId ? { ...iface, isHidden: !iface.isHidden } : iface
          ),
        };
      }),
    }));
  };

  const addModuleToDevice = (deviceId: string, mod: Omit<DeviceModule, 'id'>) => {
    const parent = state.devices.find((d) => d.id === deviceId);
    const modId = `mod-${Date.now()}`;
    const newMod: DeviceModule = {
      ...mod,
      id: modId,
    };

    // Also register directly as an inventory item
    const modInventoryItem: Device = {
      id: `dev-mod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category: 'MODULE',
      brandId: parent?.brandId || 'cisco',
      model: mod.model,
      serialNumber: mod.serialNumber || `SN-MOD-${Date.now().toString().slice(-6)}`,
      parentDeviceId: deviceId,
      parentSlotOrPort: mod.slotName,
      moduleType: mod.type,
      heightRU: 0,
      isPoweredOn: parent?.isPoweredOn || 'SI',
      isAvailable: 'SI',
      user: parent?.user || 'Datacenter Ops',
      ipManagement: '',
      notes: `Modulo ${mod.type} installato su ${parent?.model || deviceId} [${mod.slotName}]`,
      modules: [],
      sfps: [],
      interfaces: [],
    };

    setState((prev) => ({
      ...prev,
      devices: [
        modInventoryItem,
        ...prev.devices.map((d) =>
          d.id === deviceId ? { ...d, modules: [...d.modules, newMod] } : d
        ),
      ],
    }));
  };

  const removeModuleFromDevice = (deviceId: string, moduleId: string) => {
    setState((prev) => {
      const parent = prev.devices.find((d) => d.id === deviceId);
      const modToRemove = parent?.modules.find((m) => m.id === moduleId);
      return {
        ...prev,
        devices: prev.devices
          .filter(
            (d) =>
              !(
                d.category === 'MODULE' &&
                d.parentDeviceId === deviceId &&
                (d.serialNumber === modToRemove?.serialNumber || d.parentSlotOrPort === modToRemove?.slotName)
              )
          )
          .map((d) =>
            d.id === deviceId ? { ...d, modules: d.modules.filter((m) => m.id !== moduleId) } : d
          ),
      };
    });
  };

  const addSFPToDevice = (deviceId: string, sfp: Omit<SFPTransceiver, 'id'>) => {
    const parent = state.devices.find((d) => d.id === deviceId);
    const sfpId = `sfp-${Date.now()}`;
    const newSfp: SFPTransceiver = {
      ...sfp,
      id: sfpId,
    };

    // Also register directly as an inventory item
    const sfpInventoryItem: Device = {
      id: `dev-sfp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category: 'SFP',
      brandId: parent?.brandId || 'cisco',
      model: `Transceiver SFP ${sfp.type} (${sfp.vendor})`,
      serialNumber: sfp.serialNumber || `SN-SFP-${Date.now().toString().slice(-6)}`,
      parentDeviceId: deviceId,
      parentSlotOrPort: sfp.interfaceName,
      sfpType: sfp.type,
      wavelength: sfp.wavelength,
      connector: sfp.connector,
      heightRU: 0,
      isPoweredOn: parent?.isPoweredOn || 'SI',
      isAvailable: 'SI',
      user: parent?.user || 'Datacenter Ops',
      ipManagement: '',
      notes: `Transceiver ottico ${sfp.type} inserito su ${parent?.model || deviceId} [${sfp.interfaceName}]`,
      modules: [],
      sfps: [],
      interfaces: [],
    };

    setState((prev) => ({
      ...prev,
      devices: [
        sfpInventoryItem,
        ...prev.devices.map((d) =>
          d.id === deviceId ? { ...d, sfps: [...d.sfps, newSfp] } : d
        ),
      ],
    }));
  };

  const removeSFPFromDevice = (deviceId: string, sfpId: string) => {
    setState((prev) => {
      const parent = prev.devices.find((d) => d.id === deviceId);
      const sfpToRemove = parent?.sfps.find((s) => s.id === sfpId);
      return {
        ...prev,
        devices: prev.devices
          .filter(
            (d) =>
              !(
                d.category === 'SFP' &&
                d.parentDeviceId === deviceId &&
                (d.serialNumber === sfpToRemove?.serialNumber || d.parentSlotOrPort === sfpToRemove?.interfaceName)
              )
          )
          .map((d) =>
            d.id === deviceId ? { ...d, sfps: d.sfps.filter((s) => s.id !== sfpId) } : d
          ),
      };
    });
  };

  // Racks & Elevation
  const addRack = (rackData: Omit<Rack, 'id'>) => {
    const newRack: Rack = {
      ...rackData,
      id: `rack-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      racks: [...prev.racks, newRack],
    }));
  };

  const updateRack = (id: string, updates: Partial<Rack>) => {
    setState((prev) => ({
      ...prev,
      racks: prev.racks.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  };

  const deleteRack = (id: string) => {
    setState((prev) => ({
      ...prev,
      racks: prev.racks.filter((r) => r.id !== id),
      rackItems: prev.rackItems.filter((i) => i.rackId !== id),
      devices: prev.devices.map((d) => (d.rackId === id ? { ...d, rackId: undefined, rackRU: undefined } : d)),
    }));
    if (selectedRackId === id) {
      const remaining = state.racks.filter((r) => r.id !== id);
      if (remaining.length > 0) setSelectedRackId(remaining[0].id);
    }
  };

  const mountDeviceToRack = (
    rackId: string,
    deviceId: string,
    startRU: number,
    heightRU: number,
    face: RackFace | 'BOTH'
  ) => {
    const rack = state.racks.find((r) => r.id === rackId);
    if (!rack) return { success: false, error: 'Rack non trovato' };

    const check = canInstallItem(rackId, startRU, heightRU, face, state.rackItems, rack.totalRU);
    if (!check.allowed) return { success: false, error: check.reason };

    const newItem: RackInstalledItem = {
      id: `item-${Date.now()}`,
      rackId,
      startRU,
      heightRU,
      face,
      isShelf: false,
      deviceId,
    };

    setState((prev) => ({
      ...prev,
      rackItems: [...prev.rackItems, newItem],
      devices: prev.devices.map((d) =>
        d.id === deviceId ? { ...d, rackId, rackRU: startRU, rackFace: face, heightRU } : d
      ),
    }));

    return { success: true };
  };

  const installPDUToRack = (
    rackId: string,
    startRU: number,
    face: RackFace,
    pduData: {
      model: string;
      brandId: string;
      serialNumber: string;
      socketCount: number;
      socketType: SocketType;
      circuitBreakerAmps?: number;
      user?: string;
      notes?: string;
    }
  ) => {
    const rack = state.racks.find((r) => r.id === rackId);
    if (!rack) return { success: false, error: 'Rack non trovato' };

    const check = canInstallItem(rackId, startRU, 1, face, state.rackItems, rack.totalRU);
    if (!check.allowed) return { success: false, error: check.reason };

    const pduDeviceId = `dev-pdu-${Date.now()}`;
    const newPduDevice: Device = {
      id: pduDeviceId,
      category: 'PDU',
      brandId: pduData.brandId,
      model: pduData.model,
      serialNumber: pduData.serialNumber,
      rackId,
      rackRU: startRU,
      rackFace: face,
      heightRU: 1,
      isPoweredOn: 'SI',
      isAvailable: 'SI',
      user: pduData.user || 'Facility & Power Management',
      ipManagement: '',
      notes: pduData.notes || `Ciabatta di alimentazione ${pduData.socketCount} prese ${pduData.socketType}`,
      deviceRole: 'PDU',
      pduConfig: {
        socketCount: pduData.socketCount,
        socketType: pduData.socketType,
        circuitBreakerAmps: pduData.circuitBreakerAmps || 16,
        totalPowerWatts: pduData.socketType === 'SCHUKO' ? 3680 : 3500,
        hasSurgeProtection: true,
        usedSockets: 0,
      },
      modules: [],
      sfps: [],
      interfaces: [],
    };

    const newRackItem: RackInstalledItem = {
      id: `item-pdu-${Date.now()}`,
      rackId,
      startRU,
      heightRU: 1,
      face,
      isShelf: false,
      isPDU: true,
      deviceId: pduDeviceId,
      pduConfig: newPduDevice.pduConfig,
    };

    setState((prev) => ({
      ...prev,
      devices: [newPduDevice, ...prev.devices],
      rackItems: [...prev.rackItems, newRackItem],
    }));

    return { success: true };
  };

  const addShelfToRack = (
    rackId: string,
    startRU: number,
    heightRU: number,
    face: RackFace | 'BOTH'
  ) => {
    const rack = state.racks.find((r) => r.id === rackId);
    if (!rack) return { success: false, error: 'Rack non trovato' };

    const check = canInstallItem(rackId, startRU, heightRU, face, state.rackItems, rack.totalRU);
    if (!check.allowed) return { success: false, error: check.reason };

    const newShelf: RackInstalledItem = {
      id: `shelf-${Date.now()}`,
      rackId,
      startRU,
      heightRU,
      face,
      isShelf: true,
      shelfSubSlots: [
        { slotIndex: 0, deviceId: undefined },
        { slotIndex: 1, deviceId: undefined },
        { slotIndex: 2, deviceId: undefined },
      ],
    };

    setState((prev) => ({
      ...prev,
      rackItems: [...prev.rackItems, newShelf],
    }));

    return { success: true };
  };

  const mountDeviceToShelf = (shelfItemId: string, slotIndex: number, deviceId: string) => {
    const targetShelf = state.rackItems.find((i) => i.id === shelfItemId && i.isShelf);
    if (!targetShelf) return;

    setState((prev) => ({
      ...prev,
      rackItems: prev.rackItems.map((item) => {
        if (item.id !== shelfItemId) return item;
        const slots = [...(item.shelfSubSlots || [])];
        const existingSlot = slots.find((s) => s.slotIndex === slotIndex);
        if (existingSlot) {
          existingSlot.deviceId = deviceId;
        } else {
          slots.push({ slotIndex, deviceId });
        }
        return { ...item, shelfSubSlots: slots };
      }),
      devices: prev.devices.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              rackId: targetShelf.rackId,
              rackRU: targetShelf.startRU,
              shelfId: targetShelf.id,
              shelfSlotIndex: slotIndex,
              isNonRackable: true,
            }
          : d
      ),
    }));
  };

  const unmountRackItem = (itemId: string) => {
    const item = state.rackItems.find((i) => i.id === itemId);
    if (!item) return;

    const unmountedDeviceIds: string[] = [];
    if (item.deviceId) unmountedDeviceIds.push(item.deviceId);
    if (item.shelfSubSlots) {
      for (const slot of item.shelfSubSlots) {
        if (slot.deviceId) unmountedDeviceIds.push(slot.deviceId);
      }
    }

    setState((prev) => ({
      ...prev,
      rackItems: prev.rackItems.filter((i) => i.id !== itemId),
      devices: prev.devices.map((d) =>
        unmountedDeviceIds.includes(d.id)
          ? { ...d, rackId: undefined, rackRU: undefined, rackFace: undefined, shelfId: undefined, shelfSlotIndex: undefined }
          : d
      ),
    }));
  };

  // Cabling
  const addCable = (cableData: Omit<Cable, 'id'>) => {
    const newCable: Cable = {
      ...cableData,
      id: `cbl-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      cables: [...prev.cables, newCable],
    }));
  };

  const updateCable = (id: string, updates: Partial<Cable>) => {
    setState((prev) => ({
      ...prev,
      cables: prev.cables.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  const deleteCable = (id: string) => {
    setState((prev) => ({
      ...prev,
      cables: prev.cables.filter((c) => c.id !== id),
    }));
  };

  // Discovery
  const runDiscoveryOnDevice = (deviceId: string) => {
    const device = state.devices.find((d) => d.id === deviceId);
    if (!device) return null;

    const result = simulateDeviceDiscovery(device, state.devices);

    // Automatically register discovered transceivers/modules into inventory if not yet present
    const newDiscoveredSfps: Device[] = [];
    const activeOpticIfaces = result.discoveredInterfaces.filter(
      (i) => (i.type === '10G' || i.type === '25G' || i.type === '100G') && i.status === 'UP'
    );

    for (const optIface of activeOpticIfaces.slice(0, 2)) {
      const alreadyHasSfp = state.devices.some(
        (d) => d.category === 'SFP' && d.parentDeviceId === device.id && d.parentSlotOrPort === optIface.name
      );
      if (!alreadyHasSfp) {
        const sfpType = optIface.type === '100G' ? '100G-SR4' : optIface.type === '25G' ? '25G-SR' : '10G-SR';
        const sfpItem: Device = {
          id: `dev-sfp-disc-${Date.now()}-${optIface.id}`,
          category: 'SFP',
          brandId: device.brandId,
          model: `Transceiver SFP ${sfpType} (Auto-Discovered)`,
          serialNumber: `SN-SFP-${optIface.macAddress?.replace(/:/g, '').slice(-6) || Date.now().toString().slice(-6)}`,
          parentDeviceId: device.id,
          parentSlotOrPort: optIface.name,
          sfpType: sfpType as any,
          wavelength: '850nm',
          connector: optIface.type === '100G' ? 'MPO' : 'LC',
          heightRU: 0,
          isPoweredOn: 'SI',
          isAvailable: 'SI',
          user: device.user || 'NetOps',
          ipManagement: '',
          notes: `Transceiver ottico ${sfpType} rilevato automaticamente via discovery ${result.protocol} sulla porta ${optIface.name}`,
          modules: [],
          sfps: [],
          interfaces: [],
        };
        newDiscoveredSfps.push(sfpItem);
      }
    }

    // Update device interfaces with the discovered interfaces and add discovered SFPs to inventory
    setState((prev) => ({
      ...prev,
      devices: [
        ...newDiscoveredSfps,
        ...prev.devices.map((d) =>
          d.id === deviceId ? { ...d, interfaces: result.discoveredInterfaces } : d
        ),
      ],
    }));
    return result;
  };

  // Sites
  const addSiteNode = (node: Omit<SiteNode, 'id'>) => {
    const newNode: SiteNode = {
      ...node,
      id: `site-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      sites: [...prev.sites, newNode],
    }));
  };

  const deleteSiteNode = (id: string) => {
    setState((prev) => ({
      ...prev,
      sites: prev.sites.filter((s) => s.id !== id && s.parentId !== id),
    }));
  };

  // Brands
  const addBrand = (brand: Omit<Brand, 'id'>) => {
    const newBrand: Brand = {
      ...brand,
      id: brand.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    };
    setState((prev) => ({
      ...prev,
      brands: [...prev.brands, newBrand],
    }));
  };

  // Users & RBAC
  const switchUser = (userId: string) => {
    const u = state.users.find((user) => user.id === userId);
    if (u) {
      setState((prev) => ({ ...prev, currentUser: u }));
    }
  };

  const updateUserPassword = (userId: string, newPassword: string) => {
    const target = state.users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'Utente non trovato' };
    if (target.authType !== 'LOCAL') {
      return {
        success: false,
        error: `L'utente è autenticato tramite ${target.authType}. Solo gli utenti con autenticazione Locale possono modificare la password nel DCIM.`,
      };
    }
    if (newPassword.length < 6) {
      return { success: false, error: 'La nuova password deve contenere almeno 6 caratteri.' };
    }

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? { ...u, passwordHash: newPassword } : u)),
      currentUser: prev.currentUser.id === userId ? { ...prev.currentUser, passwordHash: newPassword } : prev.currentUser,
    }));

    return { success: true };
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
    }));
  };

  const deleteUser = (id: string) => {
    if (state.currentUser.id === id) {
      alert('Non puoi eliminare l’utente attualmente connesso!');
      return;
    }
    setState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== id),
    }));
  };

  // Terminal
  const openTerminal = (dev: Device) => setTerminalDevice(dev);
  const closeTerminal = () => setTerminalDevice(null);

  // Backup
  const restoreFullSystem = (newState: DCIMState) => {
    setState(newState);
  };

  const resetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      brands: INITIAL_BRANDS,
      sites: INITIAL_SITES,
      racks: INITIAL_RACKS,
      rackItems: INITIAL_RACK_ITEMS,
      devices: INITIAL_DEVICES,
      cables: INITIAL_CABLES,
      groups: INITIAL_GROUPS,
      users: INITIAL_USERS,
      currentUser: INITIAL_USERS[0],
    });
  };

  return (
    <DCIMContext.Provider
      value={{
        state,
        activeTab,
        setActiveTab,
        selectedRackId,
        setSelectedRackId,
        addDevice,
        updateDevice,
        deleteDevice,
        toggleInterfaceVisibility,
        addModuleToDevice,
        removeModuleFromDevice,
        addSFPToDevice,
        removeSFPFromDevice,
        addRack,
        updateRack,
        deleteRack,
        mountDeviceToRack,
        installPDUToRack,
        addShelfToRack,
        mountDeviceToShelf,
        unmountRackItem,
        addCable,
        updateCable,
        deleteCable,
        runDiscoveryOnDevice,
        addSiteNode,
        deleteSiteNode,
        addBrand,
        currentUser: state.currentUser,
        switchUser,
        updateUserPassword,
        addUser,
        deleteUser,
        terminalDevice,
        openTerminal,
        closeTerminal,
        restoreFullSystem,
        resetToDefaults,
      }}
    >
      {children}
    </DCIMContext.Provider>
  );
};

export const useDCIM = () => {
  const context = useContext(DCIMContext);
  if (!context) throw new Error('useDCIM must be used within a DCIMProvider');
  return context;
};
