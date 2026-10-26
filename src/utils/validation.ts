/**
 * NetRack DCIM - Validation Logic
 */
import { Device, SiteNode } from '../types/dcim';

export function isValidIPv4(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = ip.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 4) return false;
  
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return false;
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) return false;
    if (part.length > 1 && part.startsWith('0')) return false; // leading zeros not standard
  }
  return true;
}

export function isValidIPOrHost(val: string): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  if (isValidIPv4(trimmed)) return true;
  // standard hostname check
  return /^[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9]$/.test(trimmed);
}

export function validateSerialNumber(
  sn: string,
  existingDevices: Device[],
  excludeDeviceId?: string
): { valid: boolean; error?: string } {
  if (!sn || !sn.trim()) {
    return { valid: false, error: 'Il Serial Number (SN) è obbligatorio.' };
  }
  const cleanSN = sn.trim().toUpperCase();
  const duplicate = existingDevices.find(
    (d) => d.id !== excludeDeviceId && d.serialNumber.trim().toUpperCase() === cleanSN
  );
  if (duplicate) {
    return {
      valid: false,
      error: `Il Serial Number "${sn}" è già assegnato all'apparato "${duplicate.model}" (ID: ${duplicate.id}). Il serial number deve essere univoco.`,
    };
  }
  return { valid: true };
}

export function validateDeviceNotes(notes: string): { valid: boolean; error?: string } {
  if (notes && notes.length > 300) {
    return {
      valid: false,
      error: `Le note possono contenere al massimo 300 caratteri (attualmente: ${notes.length}).`,
    };
  }
  return { valid: true };
}

export function getSiteHierarchyBreadcrumb(siteNodeId: string, allNodes: SiteNode[]): string {
  if (!siteNodeId) return 'Nessuna posizione';
  const nodeMap = new Map<string, SiteNode>();
  for (const n of allNodes) {
    nodeMap.set(n.id, n);
  }

  const path: string[] = [];
  let curr = nodeMap.get(siteNodeId);
  let guard = 0;
  while (curr && guard < 10) {
    path.unshift(curr.name);
    if (curr.parentId) {
      curr = nodeMap.get(curr.parentId);
    } else {
      break;
    }
    guard++;
  }
  return path.join(' > ') || 'Posizione non specificata';
}

export function getSiteNodeLevelHierarchy(nodeId: string, allNodes: SiteNode[]): SiteNode[] {
  const nodeMap = new Map<string, SiteNode>();
  for (const n of allNodes) {
    nodeMap.set(n.id, n);
  }
  const chain: SiteNode[] = [];
  let curr = nodeMap.get(nodeId);
  let guard = 0;
  while (curr && guard < 10) {
    chain.unshift(curr);
    curr = curr.parentId ? nodeMap.get(curr.parentId) : undefined;
    guard++;
  }
  return chain;
}
