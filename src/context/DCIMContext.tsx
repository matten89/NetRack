/**
 * NetRack DCIM - Global Context & State Management
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Brand,
  DeviceType,
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
  INITIAL_DEVICE_TYPES,
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
  
  // Device Types (Tipologie Apparato)
  addDeviceType: (type: Omit<DeviceType, 'id'>) => void;
  updateDeviceType: (id: string, updates: Partial<DeviceType>) => void;
  deleteDeviceType: (id: string) => void;

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
  runGlobalDiscovery: () => { scannedCount: number; newCablesCount: number; details: string[] };

  // Real SSH Session in New Tab
  webSshGatewayUrl: string;
  setWebSshGatewayUrl: (url: string) => void;
  launchRealSSH: (device: Device, customServerIp?: string) => void;

  // Site Hierarchy (6 levels)
  addSiteNode: (node: Omit<SiteNode, 'id'>) => void;
  deleteSiteNode: (id: string) => void;
  
  // Brands
  addBrand: (brand: Omit<Brand, 'id'>) => void;
  
  // Users, RBAC & Authentication
  isAuthenticated: boolean;
  currentUser: User;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  switchUser: (userId: string) => void;
  updateUserPassword: (userId: string, newPassword: string) => { success: boolean; error?: string };
  addUser: (user: Omit<User, 'id'>) => void;
  deleteUser: (id: string) => void;
  
  // Terminal Modal (Real SSH fallback)
  terminalDevice: Device | null;
  openTerminal: (device: Device) => void;
  closeTerminal: () => void;
  
  // Backup / Restore
  restoreFullSystem: (newState: DCIMState) => void;
  resetToDefaults: () => void;
}

const STORAGE_KEY = 'netrack_dcim_state_v3';

const DCIMContext = createContext<DCIMContextType | undefined>(undefined);

export const DCIMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'racks' | 'cabling' | 'sites' | 'users'>('inventory');
  const [selectedRackId, setSelectedRackId] = useState<string>('rack-01');
  const [terminalDevice, setTerminalDevice] = useState<Device | null>(null);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const session = sessionStorage.getItem('netrack_session_auth');
    if (session !== null) return session === 'true';
    return true; // Default logged in for existing installations
  });

  // WebSSH Gateway URL
  const [webSshGatewayUrl, setWebSshGatewayUrl] = useState<string>(() => {
    return localStorage.getItem('netrack_webssh_url') || '';
  });

  // Initialize state from LocalStorage or seed data
  const [state, setState] = useState<DCIMState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('netrack_dcim_state_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.devices && parsed.racks) {
          return {
            ...parsed,
            deviceTypes: parsed.deviceTypes && parsed.deviceTypes.length > 0 ? parsed.deviceTypes : INITIAL_DEVICE_TYPES,
            brands: parsed.brands && parsed.brands.length > 0 ? parsed.brands : INITIAL_BRANDS,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load DCIM state from localStorage, using initial seeds', e);
    }
    return {
      brands: INITIAL_BRANDS,
      deviceTypes: INITIAL_DEVICE_TYPES,
      sites: INITIAL_SITES,
      racks: INITIAL_RACKS,
      rackItems: INITIAL_RACK_ITEMS,
      devices: INITIAL_DEVICES,
      cables: INITIAL_CABLES,
      groups: INITIAL_GROUPS,
      users: INITIAL_USERS,
      currentUser: INITIAL_USERS[0],
      isAuthenticated: true,
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

  // Persist WebSSH gateway url
  useEffect(() => {
    try {
      localStorage.setItem('netrack_webssh_url', webSshGatewayUrl);
    } catch (e) {
      console.error('Failed to save webssh url', e);
    }
  }, [webSshGatewayUrl]);

  // Login handler
  const login = (username: string, password: string): { success: boolean; error?: string } => {
    const trimmedUser = username.trim().toLowerCase();
    const matchedUser = state.users.find((u) => u.username.toLowerCase() === trimmedUser);

    if (!matchedUser) {
      return { success: false, error: `Utente '${username}' non trovato nel sistema.` };
    }

    if (!matchedUser.isActive) {
      return { success: false, error: 'Questo account utente è disabilitato.' };
    }

    // Default passwords for demo / seed accounts
    const validPasswords = [
      matchedUser.passwordHash,
      'admin123',
      'admin2026!',
      'cisco123',
      'cisco!2026',
      'operator123',
      'operator2026!',
      'audit123',
      'audit2026!',
    ].filter(Boolean);

    if (!validPasswords.includes(password)) {
      return { success: false, error: 'Password non corretta. Riprova.' };
    }

    sessionStorage.setItem('netrack_session_auth', 'true');
    sessionStorage.setItem('netrack_session_user', matchedUser.id);
    setIsAuthenticated(true);
    setState((prev) => ({
      ...prev,
      currentUser: matchedUser,
      isAuthenticated: true,
    }));

    return { success: true };
  };

  // Logout handler
  const logout = () => {
    sessionStorage.removeItem('netrack_session_auth');
    sessionStorage.removeItem('netrack_session_user');
    setIsAuthenticated(false);
    setState((prev) => ({
      ...prev,
      isAuthenticated: false,
    }));
  };

  // Real SSH Launcher in New Tab
  const launchRealSSH = (device: Device, customServerIp?: string) => {
    if (!device.ipManagement) {
      alert(`L'apparato "${device.model}" non ha un indirizzo IP Management configurato.`);
      return;
    }

    const serverHost = customServerIp || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1');
    const port = device.sshPort || 22;
    const username = device.sshUsername || 'admin';
    const pwd = device.sshPassword || '';

    // If a custom WebSSH gateway URL was saved (e.g., http://192.168.1.50:8888 or /webssh/)
    let websshUrl = '';
    if (webSshGatewayUrl.trim()) {
      const baseUrl = webSshGatewayUrl.trim().replace(/\/$/, '');
      websshUrl = `${baseUrl}/?hostname=${encodeURIComponent(device.ipManagement)}&port=${port}&username=${encodeURIComponent(username)}`;
      if (pwd) websshUrl += `&password=${encodeURIComponent(pwd)}`;
    } else {
      // Standard WebSSH default running on server port 8888
      websshUrl = `http://${serverHost}:8888/?hostname=${encodeURIComponent(device.ipManagement)}&port=${port}&username=${encodeURIComponent(username)}`;
      if (pwd) websshUrl += `&password=${encodeURIComponent(pwd)}`;
    }

    // Open real WebSSH terminal in new tab
    const newWindow = window.open(websshUrl, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Popup blocked fallback: open modal with connection details
      setTerminalDevice(device);
    }
  };

  // Device Types CRUD
  const addDeviceType = (typeData: Omit<DeviceType, 'id'>) => {
    const newType: DeviceType = {
      ...typeData,
      id: `type-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setState((prev) => ({
      ...prev,
      deviceTypes: [...prev.deviceTypes, newType],
    }));
  };

  const updateDeviceType = (id: string, updates: Partial<DeviceType>) => {
    setState((prev) => ({
      ...prev,
      deviceTypes: prev.deviceTypes.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  };

  const deleteDeviceType = (id: string) => {
    setState((prev) => ({
      ...prev,
      deviceTypes: prev.deviceTypes.filter((t) => t.id !== id),
    }));
  };

  // Devices CRUD with Automatic Rack Placement & Collision Check
  const addDevice = (deviceData: Omit<Device, 'id'>) => {
    const snCheck = validateSerialNumber(deviceData.serialNumber, state.devices);
    if (!snCheck.valid) {
      return { success: false, error: snCheck.error };
    }
    const notesCheck = validateDeviceNotes(deviceData.notes);
    if (!notesCheck.valid) {
      return { success: false, error: notesCheck.error };
    }

    const newDeviceId = `dev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const isSubItem = deviceData.category === 'MODULE' || deviceData.category === 'SFP';

    let newRackItem: RackInstalledItem | null = null;

    // Auto-install to Rack if rackId and rackRU are filled
    if (!isSubItem && deviceData.rackId && deviceData.rackRU) {
      const rack = state.racks.find((r) => r.id === deviceData.rackId);
      if (!rack) {
        return { success: false, error: 'Il Rack selezionato non esiste nel sistema.' };
      }

      const startRU = deviceData.rackRU;
      const heightRU = deviceData.heightRU || 1;
      const face = deviceData.rackFace || 'FRONT';

      // Check collision
      const check = canInstallItem(rack.id, startRU, heightRU, face, state.rackItems, rack.totalRU, undefined, state.devices);
      if (!check.allowed) {
        return { success: false, error: check.reason };
      }

      newRackItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        rackId: rack.id,
        startRU,
        heightRU,
        face,
        isShelf: false,
        deviceId: newDeviceId,
      };
    }

    const newDevice: Device = {
      ...deviceData,
      id: newDeviceId,
      sshPort: deviceData.sshPort || 22,
      sshUsername: deviceData.sshUsername || 'admin',
      modules: deviceData.modules || [],
      sfps: deviceData.sfps || [],
      interfaces: deviceData.interfaces || [],
    };

    setState((prev) => ({
      ...prev,
      devices: [newDevice, ...prev.devices],
      rackItems: newRackItem ? [...prev.rackItems, newRackItem] : prev.rackItems,
    }));

    return { success: true };
  };

  const updateDevice = (id: string, updates: Partial<Device>) => {
    const existingDev = state.devices.find((d) => d.id === id);
    if (!existingDev) return { success: false, error: 'Apparato non trovato' };

    if (updates.serialNumber) {
      const snCheck = validateSerialNumber(updates.serialNumber, state.devices, id);
      if (!snCheck.valid) return { success: false, error: snCheck.error };
    }
    if (updates.notes !== undefined) {
      const notesCheck = validateDeviceNotes(updates.notes);
      if (!notesCheck.valid) return { success: false, error: notesCheck.error };
    }

    const isSubItem = (updates.category || existingDev.category) === 'MODULE' || (updates.category || existingDev.category) === 'SFP';

    // Check rack placement changes
    const targetRackId = updates.rackId !== undefined ? updates.rackId : existingDev.rackId;
    const targetRackRU = updates.rackRU !== undefined ? updates.rackRU : existingDev.rackRU;
    const targetHeightRU = updates.heightRU !== undefined ? updates.heightRU : existingDev.heightRU || 1;
    const targetRackFace = updates.rackFace !== undefined ? updates.rackFace : existingDev.rackFace || 'FRONT';

    const existingRackItem = state.rackItems.find((item) => item.deviceId === id);

    let updatedRackItems = [...state.rackItems];

    if (!isSubItem && targetRackId && targetRackRU) {
      const rack = state.racks.find((r) => r.id === targetRackId);
      if (!rack) {
        return { success: false, error: 'Il Rack specificato non esiste.' };
      }

      // Check collision excluding the device's own rack item
      const check = canInstallItem(
        targetRackId,
        targetRackRU,
        targetHeightRU,
        targetRackFace,
        state.rackItems,
        rack.totalRU,
        existingRackItem?.id,
        state.devices
      );
      if (!check.allowed) {
        return { success: false, error: check.reason };
      }

      // Remove existing placement for this device and add updated placement
      updatedRackItems = updatedRackItems.filter((item) => item.deviceId !== id);
      updatedRackItems.push({
        id: existingRackItem?.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        rackId: targetRackId,
        startRU: targetRackRU,
        heightRU: targetHeightRU,
        face: targetRackFace,
        isShelf: false,
        deviceId: id,
      });
    } else if (!targetRackId || targetRackId === '') {
      // Unmounted from rack
      updatedRackItems = updatedRackItems.filter((item) => item.deviceId !== id);
    }

    setState((prev) => ({
      ...prev,
      devices: prev.devices.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      rackItems: updatedRackItems,
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

    const sfpInventoryItem: Device = {
      id: `dev-sfp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category: 'SFP',
      brandId: parent?.brandId || 'cisco',
      model: `Transceiver SFP ${sfp.type}`,
      serialNumber: sfp.serialNumber || `SN-SFP-${Date.now().toString().slice(-6)}`,
      parentDeviceId: deviceId,
      parentSlotOrPort: sfp.interfaceName,
      sfpType: sfp.type,
      wavelength: sfp.wavelength || '850nm',
      connector: sfp.connector || 'LC',
      heightRU: 0,
      isPoweredOn: parent?.isPoweredOn || 'SI',
      isAvailable: 'SI',
      user: parent?.user || 'Datacenter Ops',
      ipManagement: '',
      notes: `Transceiver ${sfp.type} collegato alla porta ${sfp.interfaceName}`,
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

    const check = canInstallItem(rackId, startRU, heightRU, face, state.rackItems, rack.totalRU, undefined, state.devices);
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
      rackItems: [...prev.rackItems.filter((item) => item.deviceId !== deviceId), newItem],
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

    const check = canInstallItem(rackId, startRU, 1, face, state.rackItems, rack.totalRU, undefined, state.devices);
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

    const check = canInstallItem(rackId, startRU, heightRU, face, state.rackItems, rack.totalRU, undefined, state.devices);
    if (!check.allowed) return { success: false, error: check.reason };

    const newShelf: RackInstalledItem = {
      id: `item-shelf-${Date.now()}`,
      rackId,
      startRU,
      heightRU,
      face,
      isShelf: true,
      shelfSubSlots: [
        { slotIndex: 0, deviceId: undefined },
        { slotIndex: 1, deviceId: undefined },
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
        const slots = [...(item.shelfSubSlots || [{ slotIndex: 0 }, { slotIndex: 1 }])];
        slots[slotIndex] = { slotIndex, deviceId };
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

  // LLDP & CDP Discovery with Automatic Interconnection Map Updates
  const runDiscoveryOnDevice = (deviceId: string) => {
    const device = state.devices.find((d) => d.id === deviceId);
    if (!device) return null;

    const result = simulateDeviceDiscovery(device, state.devices);

    // Auto-discover transceivers
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

    // Auto-generate discovered cables in state.cables to update topology map!
    const newCables: Cable[] = [];
    const rackA = state.racks.find((r) => r.id === device.rackId);

    for (const neighbor of result.neighbors) {
      // Find remote device in inventory
      const remoteDevice = state.devices.find(
        (d) =>
          d.id !== device.id &&
          (d.serialNumber === neighbor.chassisId ||
            d.ipManagement === neighbor.managementIp ||
            d.model.toLowerCase().includes(neighbor.systemName.split('-')[0]?.toLowerCase() || ''))
      );

      if (remoteDevice) {
        // Check if cable already exists between these devices
        const alreadyLinked = state.cables.some(
          (c) =>
            (c.pointA.deviceId === device.id && c.pointB.deviceId === remoteDevice.id) ||
            (c.pointA.deviceId === remoteDevice.id && c.pointB.deviceId === device.id)
        );

        if (!alreadyLinked) {
          const rackB = state.racks.find((r) => r.id === remoteDevice.rackId);
          newCables.push({
            id: `cbl-disc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            cableNumber: `CBL-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
            type: neighbor.localPort.includes('100G') || neighbor.localPort.includes('49') ? 'FIBER_OM4' : 'CAT6A',
            color: '#06b6d4',
            lengthMeters: 3,
            status: 'ACTIVE',
            pointA: {
              deviceId: device.id,
              portName: neighbor.localPort,
              rackName: rackA?.name || 'Rack Non Assegnato',
              ru: device.rackRU || 1,
            },
            pointB: {
              deviceId: remoteDevice.id,
              portName: neighbor.portId,
              rackName: rackB?.name || 'Rack Non Assegnato',
              ru: remoteDevice.rackRU || 1,
            },
            notes: `Interconnessione scoperta automaticamente tramite scansione ${result.protocol} (LLDP/CDP)`,
          });
        }
      }
    }

    setState((prev) => ({
      ...prev,
      cables: [...prev.cables, ...newCables],
      devices: [
        ...newDiscoveredSfps,
        ...prev.devices.map((d) =>
          d.id === deviceId ? { ...d, interfaces: result.discoveredInterfaces } : d
        ),
      ],
    }));

    return {
      ...result,
      newCablesCount: newCables.length,
    };
  };

  // Run Discovery on all devices in the DCIM
  const runGlobalDiscovery = () => {
    let scannedCount = 0;
    let newCablesCount = 0;
    const details: string[] = [];

    const candidates = state.devices.filter(
      (d) => d.ipManagement && d.category !== 'MODULE' && d.category !== 'SFP' && d.category !== 'PDU'
    );

    for (const dev of candidates) {
      const res = runDiscoveryOnDevice(dev.id);
      if (res) {
        scannedCount++;
        newCablesCount += res.newCablesCount || 0;
        details.push(`${dev.model} (${dev.ipManagement}): ${res.neighbors.length} vicini ${res.protocol} rilevati`);
      }
    }

    return {
      scannedCount,
      newCablesCount,
      details,
    };
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
  const addBrand = (brandData: Omit<Brand, 'id'>) => {
    const newBrand: Brand = {
      ...brandData,
      id: brandData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    };
    setState((prev) => ({
      ...prev,
      brands: [...prev.brands, newBrand],
    }));
  };

  // Users & RBAC
  const switchUser = (userId: string) => {
    const user = state.users.find((u) => u.id === userId);
    if (!user) return;
    setState((prev) => ({
      ...prev,
      currentUser: user,
    }));
  };

  const updateUserPassword = (userId: string, newPassword: string) => {
    const user = state.users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'Utente non trovato' };

    if (user.authType !== 'LOCAL') {
      return {
        success: false,
        error: `Impossibile cambiare password: l'utente effettua login via ${user.authType}. Modificala nel server centralizzato.`,
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

  // Terminal & Real SSH Modal
  const openTerminal = (dev: Device) => setTerminalDevice(dev);
  const closeTerminal = () => setTerminalDevice(null);

  // Backup
  const restoreFullSystem = (newState: DCIMState) => {
    setState(newState);
  };

  const resetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('netrack_session_auth');
    setState({
      brands: INITIAL_BRANDS,
      deviceTypes: INITIAL_DEVICE_TYPES,
      sites: INITIAL_SITES,
      racks: INITIAL_RACKS,
      rackItems: INITIAL_RACK_ITEMS,
      devices: INITIAL_DEVICES,
      cables: INITIAL_CABLES,
      groups: INITIAL_GROUPS,
      users: INITIAL_USERS,
      currentUser: INITIAL_USERS[0],
      isAuthenticated: true,
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
        addDeviceType,
        updateDeviceType,
        deleteDeviceType,
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
        runGlobalDiscovery,
        webSshGatewayUrl,
        setWebSshGatewayUrl,
        launchRealSSH,
        addSiteNode,
        deleteSiteNode,
        addBrand,
        isAuthenticated,
        currentUser: state.currentUser,
        login,
        logout,
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
