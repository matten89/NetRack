import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidIPv4, validateSerialNumber, validateDeviceNotes, getSiteHierarchyBreadcrumb } from './validation';
import { canInstallItem, getOccupiedRUs } from './rackEngine';
import { exportInventoryToCSV, importFullSystemJSON } from './csvEngine';
import { Device, RackInstalledItem, SiteNode, Brand, Rack } from '../types/dcim';

test('IPv4 validation works correctly', () => {
  assert.equal(isValidIPv4('192.168.1.1'), true);
  assert.equal(isValidIPv4('10.0.0.254'), true);
  assert.equal(isValidIPv4('256.0.0.1'), false);
  assert.equal(isValidIPv4('192.168.1'), false);
  assert.equal(isValidIPv4('invalid-ip'), false);
  assert.equal(isValidIPv4(''), false);
});

test('Serial number uniqueness validation', () => {
  const existing: Device[] = [
    {
      id: 'dev-1',
      brandId: 'cisco',
      model: 'Catalyst 9300',
      serialNumber: 'FCW2140A01',
      heightRU: 1,
      isPoweredOn: 'SI',
      isAvailable: 'SI',
      user: 'NetOps',
      ipManagement: '10.10.10.1',
      notes: '',
      modules: [],
      sfps: [],
      interfaces: [],
    },
  ];

  // duplicate SN
  const resDup = validateSerialNumber('fcw2140a01', existing);
  assert.equal(resDup.valid, false);
  assert.match(resDup.error || '', /già assegnato/);

  // duplicate SN but same device edit (excludeDeviceId)
  const resSelf = validateSerialNumber('FCW2140A01', existing, 'dev-1');
  assert.equal(resSelf.valid, true);

  // new valid unique SN
  const resNew = validateSerialNumber('FOC220199Z', existing);
  assert.equal(resNew.valid, true);

  // empty SN
  const resEmpty = validateSerialNumber('', existing);
  assert.equal(resEmpty.valid, false);
});

test('Device notes max 300 characters rule', () => {
  const shortNotes = 'Apparato di core switch sala server principale.';
  assert.equal(validateDeviceNotes(shortNotes).valid, true);

  const longNotes = 'A'.repeat(301);
  const resLong = validateDeviceNotes(longNotes);
  assert.equal(resLong.valid, false);
  assert.match(resLong.error || '', /300 caratteri/);
});

test('Site 6-level hierarchy path builder', () => {
  const sites: SiteNode[] = [
    { id: 's-1', level: 1, levelName: 'Regione', name: 'EMEA' },
    { id: 's-2', level: 2, levelName: 'Nazione', name: 'Italia', parentId: 's-1' },
    { id: 's-3', level: 3, levelName: 'Città', name: 'Milano', parentId: 's-2' },
    { id: 's-4', level: 4, levelName: 'DataCenter', name: 'DC-Caldera', parentId: 's-3' },
    { id: 's-5', level: 5, levelName: 'Sala Server', name: 'Hall 2B', parentId: 's-4' },
    { id: 's-6', level: 6, levelName: 'Fila Rack', name: 'Fila A (Cold Aisle)', parentId: 's-5' },
  ];

  const breadcrumb = getSiteHierarchyBreadcrumb('s-6', sites);
  assert.equal(breadcrumb, 'EMEA > Italia > Milano > DC-Caldera > Hall 2B > Fila A (Cold Aisle)');
});

test('Rack allocation and collision engine', () => {
  const installedItems: RackInstalledItem[] = [
    {
      id: 'item-1',
      rackId: 'rack-01',
      startRU: 40,
      heightRU: 2,
      face: 'FRONT',
      isShelf: false,
      deviceId: 'dev-1',
    },
    {
      id: 'item-2',
      rackId: 'rack-01',
      startRU: 10,
      heightRU: 1,
      face: 'BOTH',
      isShelf: true,
    },
  ];

  // Collides with item-1 at RU 40 on FRONT
  const resCollide = canInstallItem('rack-01', 39, 2, 'FRONT', installedItems, 42);
  assert.equal(resCollide.allowed, false);

  // But RU 40 is free on REAR (since item-1 is FRONT only)
  const resRearOk = canInstallItem('rack-01', 40, 1, 'REAR', installedItems, 42);
  assert.equal(resRearOk.allowed, true);

  // Item-2 is BOTH, so RU 10 collides on REAR too
  const resBothCollide = canInstallItem('rack-01', 10, 1, 'REAR', installedItems, 42);
  assert.equal(resBothCollide.allowed, false);

  // Out of bound check (>42)
  const resOverflow = canInstallItem('rack-01', 42, 2, 'FRONT', installedItems, 42);
  assert.equal(resOverflow.allowed, false);
});

test('CSV export and JSON import', () => {
  const brands: Brand[] = [{ id: 'cisco', name: 'Cisco' }];
  const racks: Rack[] = [{ id: 'r-1', name: 'Rack-A01', totalRU: 42, siteNodeId: 's-1' }];
  const devices: Device[] = [
    {
      id: 'd-1',
      brandId: 'cisco',
      model: 'Nexus 9300',
      serialNumber: 'SN998877',
      heightRU: 1,
      isPoweredOn: 'SI',
      isAvailable: 'SI',
      user: 'Team Rete',
      ipManagement: '192.168.10.1',
      notes: 'Switch Spine',
      modules: [],
      sfps: [],
      interfaces: [],
    },
  ];

  const csv = exportInventoryToCSV(devices, brands, racks);
  assert.match(csv, /"Nexus 9300"/);
  assert.match(csv, /"SN998877"/);

  const jsonStr = JSON.stringify({
    app: 'NetRack DCIM',
    data: { devices, racks },
  });
  const parsed = importFullSystemJSON(jsonStr);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.state?.devices?.length, 1);
});

test('PDU configuration and Socket types validation', () => {
  const pduDevice: Device = {
    id: 'pdu-01',
    category: 'PDU',
    brandId: 'bticino',
    model: 'PDU Rack 8x Bipasso',
    serialNumber: 'SN-BT-001',
    heightRU: 1,
    isPoweredOn: 'SI',
    isAvailable: 'SI',
    user: 'Facility Ops',
    ipManagement: '',
    notes: 'PDU alimentazione rack A01',
    modules: [],
    sfps: [],
    interfaces: [],
    pduConfig: {
      socketCount: 8,
      socketType: 'ITALIAN_BIPASSO',
      circuitBreakerAmps: 16,
    },
  };

  assert.equal(pduDevice.category, 'PDU');
  assert.equal(pduDevice.pduConfig?.socketType, 'ITALIAN_BIPASSO');
  assert.equal(pduDevice.pduConfig?.socketCount, 8);
});

test('Sub-items and Module/SFP correlation with parent device', () => {
  const hostSwitch: Device = {
    id: 'host-sw-1',
    brandId: 'cisco',
    model: 'Catalyst 9300-48UXM',
    serialNumber: 'FCW2345ABCD',
    category: 'DEVICE',
    heightRU: 1,
    isPoweredOn: 'SI',
    isAvailable: 'SI',
    user: 'NetOps',
    ipManagement: '10.10.10.5',
    notes: 'Switch core',
    modules: [
      {
        id: 'mod-1',
        slotName: 'Slot NM',
        model: 'C9300-NM-8X',
        type: 'EXPANSION',
        status: 'OK',
      },
    ],
    sfps: [
      {
        id: 'sfp-1',
        interfaceName: 'TenGigabitEthernet1/1/1',
        type: '10G-SR',
        vendor: 'Cisco',
        serialNumber: 'OPM123456',
        connector: 'LC',
      },
    ],
    interfaces: [],
  };

  const inventoryModuleItem: Device = {
    id: 'inv-mod-1',
    category: 'MODULE',
    brandId: 'cisco',
    model: 'C9300-NM-8X',
    serialNumber: 'FCW2345ABCD-NM-1',
    parentDeviceId: hostSwitch.id,
    parentSlotOrPort: 'Slot NM',
    moduleType: 'EXPANSION',
    heightRU: 0,
    isPoweredOn: 'SI',
    isAvailable: 'SI',
    user: 'NetOps',
    ipManagement: '',
    notes: 'Modulo uplink 8x 10G',
    modules: [],
    sfps: [],
    interfaces: [],
  };

  assert.equal(inventoryModuleItem.category, 'MODULE');
  assert.equal(inventoryModuleItem.parentDeviceId, hostSwitch.id);
  assert.equal(inventoryModuleItem.parentSlotOrPort, 'Slot NM');
});
