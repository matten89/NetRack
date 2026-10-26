/**
 * NetRack DCIM - CSV and Full Backup Engine
 */
import { Device, Rack, Cable, SiteNode, DCIMState, Brand } from '../types/dcim';

export function escapeCSV(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

export function exportInventoryToCSV(devices: Device[], brands: Brand[], racks: Rack[]): string {
  const brandMap = new Map(brands.map((b) => [b.id, b.name]));
  const rackMap = new Map(racks.map((r) => [r.id, r.name]));

  const headers = [
    'ID',
    'Marca',
    'Modello',
    'Serial_Number',
    'Rack',
    'RU',
    'Faccia',
    'Acceso',
    'Disponibilita',
    'Utilizzatore',
    'IP_Management',
    'Note',
    'Num_Moduli',
    'Num_SFP',
    'Num_Interfacce',
  ];

  const rows = devices.map((d) => [
    escapeCSV(d.id),
    escapeCSV(brandMap.get(d.brandId) || d.brandId),
    escapeCSV(d.model),
    escapeCSV(d.serialNumber),
    escapeCSV(d.rackId ? rackMap.get(d.rackId) || d.rackId : ''),
    escapeCSV(d.rackRU || ''),
    escapeCSV(d.rackFace || ''),
    escapeCSV(d.isPoweredOn),
    escapeCSV(d.isAvailable),
    escapeCSV(d.user),
    escapeCSV(d.ipManagement),
    escapeCSV(d.notes),
    escapeCSV(d.modules?.length || 0),
    escapeCSV(d.sfps?.length || 0),
    escapeCSV(d.interfaces?.length || 0),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportRacksToCSV(racks: Rack[], sites: SiteNode[]): string {
  const siteMap = new Map(sites.map((s) => [s.id, s.name]));
  const headers = ['ID', 'Nome_Rack', 'RU_Totali', 'Sito_ID', 'Sito_Nome', 'Max_Power_Watts', 'Note'];

  const rows = racks.map((r) => [
    escapeCSV(r.id),
    escapeCSV(r.name),
    escapeCSV(r.totalRU),
    escapeCSV(r.siteNodeId),
    escapeCSV(siteMap.get(r.siteNodeId) || ''),
    escapeCSV(r.maxPowerWatts || ''),
    escapeCSV(r.notes || ''),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportCablingToCSV(cables: Cable[]): string {
  const headers = [
    'ID_Cavo',
    'Codice',
    'Tipo',
    'Colore',
    'Lunghezza_m',
    'Stato',
    'PuntoA_ApparatoID',
    'PuntoA_Porta',
    'PuntoA_Rack',
    'PuntoA_RU',
    'PuntoB_ApparatoID',
    'PuntoB_Porta',
    'PuntoB_Rack',
    'PuntoB_RU',
    'Note',
  ];

  const rows = cables.map((c) => [
    escapeCSV(c.id),
    escapeCSV(c.cableNumber),
    escapeCSV(c.type),
    escapeCSV(c.color),
    escapeCSV(c.lengthMeters),
    escapeCSV(c.status),
    escapeCSV(c.pointA.deviceId),
    escapeCSV(c.pointA.portName),
    escapeCSV(c.pointA.rackName),
    escapeCSV(c.pointA.ru),
    escapeCSV(c.pointB.deviceId),
    escapeCSV(c.pointB.portName),
    escapeCSV(c.pointB.rackName),
    escapeCSV(c.pointB.ru),
    escapeCSV(c.notes || ''),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportSitesToCSV(sites: SiteNode[]): string {
  const headers = ['ID', 'Livello', 'Nome_Livello', 'Nome_Nodo', 'Genitore_ID'];
  const rows = sites.map((s) => [
    escapeCSV(s.id),
    escapeCSV(s.level),
    escapeCSV(s.levelName),
    escapeCSV(s.name),
    escapeCSV(s.parentId || ''),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportFullSystemJSON(state: DCIMState): string {
  const payload = {
    app: 'NetRack DCIM',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: state,
  };
  return JSON.stringify(payload, null, 2);
}

export function importFullSystemJSON(jsonString: string): {
  valid: boolean;
  state?: DCIMState;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'File JSON non valido o vuoto.' };
    }
    const data = parsed.data || parsed;
    if (!Array.isArray(data.devices) || !Array.isArray(data.racks)) {
      return { valid: false, error: 'Il backup non contiene i campi essenziali (devices, racks).' };
    }
    return { valid: true, state: data as DCIMState };
  } catch (err: any) {
    return { valid: false, error: `Errore durante il parsing JSON: ${err.message}` };
  }
}
