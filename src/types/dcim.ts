/**
 * NetRack DCIM - Type Definitions
 */

export type PowerStatus = 'SI' | 'NO';
export type AvailabilityStatus = 'SI' | 'NO';

export type ItemCategory = 'DEVICE' | 'MODULE' | 'SFP' | 'PDU';

export type SocketType = 'SCHUKO' | 'ITALIAN_BIPASSO' | 'MIXED' | 'IEC_C13';

export interface PDUConfig {
  socketCount: number; // e.g. 6, 8, 12, 16, 24
  socketType: SocketType; // Schuko, Italiana Bipasso, Miste, IEC C13
  usedSockets?: number;
  circuitBreakerAmps?: number; // es. 16A
  totalPowerWatts?: number; // es. 3680W
  hasSurgeProtection?: boolean;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  color?: string; // badge accent color
  defaultPortPrefix?: string;
}

export interface DeviceModule {
  id: string;
  slotName: string;
  model: string;
  serialNumber?: string;
  type: 'LINE_CARD' | 'SUPERVISOR' | 'POWER_SUPPLY' | 'FAN' | 'EXPANSION';
  status: 'OK' | 'WARNING' | 'FAILED';
}

export interface SFPTransceiver {
  id: string;
  interfaceName: string;
  type: '1G-SX' | '1G-LX' | '10G-SR' | '10G-LR' | '25G-SR' | '40G-SR4' | '100G-SR4' | '10G-DAC' | 'RJ45';
  vendor: string;
  serialNumber: string;
  wavelength?: string;
  connector: 'LC' | 'MPO' | 'RJ45';
}

export interface NetworkInterface {
  id: string;
  name: string; // e.g. GigabitEthernet1/0/1, eth0, TenGig0/1
  type: '100M' | '1G' | '10G' | '25G' | '40G' | '100G' | 'MGMT';
  macAddress?: string;
  ipAddress?: string;
  vlan?: number;
  status: 'UP' | 'DOWN' | 'ADMIN_DOWN';
  isHidden: boolean; // allow user to hide unnecessary interfaces
  discoveredVia?: 'LLDP' | 'CDP' | 'MANUAL';
  connectedToPortId?: string; // cable link
}

export interface SiteNode {
  id: string;
  level: 1 | 2 | 3 | 4 | 5 | 6; // up to 6 levels: Region, Country, City, Campus/DC, Room, Row/Rack
  levelName: string; // e.g. "Regione", "Nazione", "Città", "DataCenter", "Sala Server", "Fila"
  name: string;
  parentId?: string; // null for top level
}

export type RackFace = 'FRONT' | 'REAR';

export interface ShelfSubSlot {
  slotIndex: number; // 0 = Left, 1 = Right, 2 = Center...
  deviceId?: string; // Device installed in this shelf slot
}

export interface RackInstalledItem {
  id: string;
  rackId: string;
  startRU: number; // 1 to rack.totalRU
  heightRU: number; // usually 1, 2, 4
  face: RackFace | 'BOTH';
  isShelf: boolean; // if true, allows multiple small non-rackable items inside
  shelfSubSlots?: ShelfSubSlot[]; // multiple devices inside same shelf
  deviceId?: string; // single device if not shelf
  isPDU?: boolean; // if true, power strip / PDU
  pduConfig?: PDUConfig;
}

export interface Rack {
  id: string;
  name: string;
  totalRU: number; // e.g. 42, 48, 24
  siteNodeId: string; // link to site hierarchy
  siteBreadcrumb?: string;
  maxPowerWatts?: number;
  notes?: string;
}

export interface Device {
  id: string;
  brandId: string;
  model: string; // text free
  serialNumber: string; // unique, free text
  category?: ItemCategory; // DEVICE (standard chassis), MODULE (scheda aggiuntiva), SFP (transceiver ottico), PDU (ciabatta)
  
  // Parent correlation for sub-items (modules/cards, SFPs)
  parentDeviceId?: string; // if installed inside another chassis/host
  parentSlotOrPort?: string; // e.g. "Slot 1" or "Porta Ethernet1/1"
  moduleType?: DeviceModule['type'];
  sfpType?: SFPTransceiver['type'];
  wavelength?: string;
  connector?: string;
  pduConfig?: PDUConfig; // For power strips (ciabatte di alimentazione)

  siteNodeId?: string; // Position in site hierarchy (up to 6 levels)
  rackId?: string; // Direct rack assignment
  rackRU?: number; // Starting RU
  rackFace?: RackFace | 'BOTH';
  heightRU: number; // 1, 2, 3, 4, etc.
  isNonRackable?: boolean; // can only be mounted on a shelf
  shelfId?: string; // if installed on a shelf
  shelfSlotIndex?: number;
  isPoweredOn: PowerStatus; // Acceso (SI/NO)
  isAvailable: AvailabilityStatus; // Disponibilità (SI/NO)
  user: string; // Utilizzatore (testo)
  ipManagement: string; // IPv4/IPv6 management address
  notes: string; // max 300 characters
  
  // Correlations
  modules: DeviceModule[];
  sfps: SFPTransceiver[];
  interfaces: NetworkInterface[];
  
  // Visual Faceplate details
  formFactor?: '1U' | '2U' | '4U' | 'SHELF_MINI' | 'PDU';
  deviceRole?: 'ROUTER' | 'SWITCH' | 'SERVER' | 'FIREWALL' | 'STORAGE' | 'PDU' | 'SHELF' | 'OTHER';
}

export interface Cable {
  id: string;
  cableNumber: string; // e.g. CBL-1001
  type: 'CAT6A' | 'CAT7' | 'FIBER_OM4' | 'FIBER_OS2' | 'DAC_10G' | 'DAC_100G';
  color: string; // HEX color code e.g. #3b82f6
  lengthMeters: number;
  status: 'ACTIVE' | 'PLANNED' | 'DISCONNECTED';
  
  // Point A
  pointA: {
    deviceId: string;
    portName: string;
    rackName: string;
    ru: number;
  };
  
  // Point B
  pointB: {
    deviceId: string;
    portName: string;
    rackName: string;
    ru: number;
  };
  
  notes?: string;
}

export interface LLDPNeighbor {
  localPort: string;
  chassisId: string;
  systemName: string;
  portId: string;
  protocol: 'LLDP' | 'CDP';
  managementIp?: string;
  capabilities?: string[];
}

export type AuthType = 'LOCAL' | 'RADIUS' | 'LDAP';

export type UserRole = 'ADMIN' | 'ENGINEER' | 'OPERATOR' | 'AUDITOR';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  authType: AuthType;
  groupId: string;
  passwordHash?: string; // For local auth
  lastLogin?: string;
  isActive: boolean;
}

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  authSource: AuthType;
  permissions: {
    canEditInventory: boolean;
    canDesignRacks: boolean;
    canManageCabling: boolean;
    canRunDiscovery: boolean;
    canAccessTerminal: boolean;
    canExportBackup: boolean;
    canManageUsers: boolean;
  };
}

export interface DCIMState {
  brands: Brand[];
  sites: SiteNode[];
  racks: Rack[];
  rackItems: RackInstalledItem[];
  devices: Device[];
  cables: Cable[];
  users: User[];
  groups: UserGroup[];
  currentUser: User;
}
