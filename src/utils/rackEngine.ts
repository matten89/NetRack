/**
 * NetRack DCIM - Rack Layout & Allocation Engine
 */
import { RackInstalledItem, RackFace } from '../types/dcim';

export interface RUOccupant {
  ruNumber: number;
  item: RackInstalledItem;
  isBaseRU: boolean; // true if this is the startRU of the item
  relativeOffset: number; // 0 for base, 1 for base+1
}

/**
 * Returns a map of occupied RUs for a given rack and face (FRONT or REAR).
 * An item with face 'BOTH' occupies both FRONT and REAR.
 */
export function getOccupiedRUs(
  rackId: string,
  rackItems: RackInstalledItem[],
  face: RackFace
): Map<number, RUOccupant> {
  const map = new Map<number, RUOccupant>();

  const relevantItems = rackItems.filter(
    (item) => item.rackId === rackId && (item.face === 'BOTH' || item.face === face)
  );

  for (const item of relevantItems) {
    for (let offset = 0; offset < item.heightRU; offset++) {
      const ru = item.startRU + offset;
      map.set(ru, {
        ruNumber: ru,
        item,
        isBaseRU: offset === 0,
        relativeOffset: offset,
      });
    }
  }

  return map;
}

/**
 * Checks whether an item can be installed at startRU with heightRU on a specific face.
 */
export function canInstallItem(
  rackId: string,
  startRU: number,
  heightRU: number,
  face: RackFace | 'BOTH',
  rackItems: RackInstalledItem[],
  totalRU: number,
  excludeItemId?: string,
  devices?: any[]
): { allowed: boolean; reason?: string } {
  if (startRU < 1) {
    return { allowed: false, reason: 'Il valore RU iniziale non può essere inferiore a 1.' };
  }
  if (startRU + heightRU - 1 > totalRU) {
    return {
      allowed: false,
      reason: `L'apparato sfora l'altezza massima del rack (${totalRU} RU). Spazio richiesto fino a RU ${startRU + heightRU - 1}.`,
    };
  }

  const checkFaces: RackFace[] = face === 'BOTH' ? ['FRONT', 'REAR'] : [face];

  for (const checkFace of checkFaces) {
    const occupied = getOccupiedRUs(
      rackId,
      rackItems.filter((i) => i.id !== excludeItemId),
      checkFace
    );

    for (let ru = startRU; ru < startRU + heightRU; ru++) {
      if (occupied.has(ru)) {
        const occ = occupied.get(ru)!;
        const occDevice = devices?.find((d) => d.id === occ.item.deviceId);
        const nameDesc = occDevice
          ? `"${occDevice.model}" (S/N: ${occDevice.serialNumber})`
          : occ.item.isPDU
          ? `PDU/Ciabatta (ID ${occ.item.id})`
          : occ.item.isShelf
          ? `Mensola Rack (ID ${occ.item.id})`
          : `Elemento ID ${occ.item.id}`;
        return {
          allowed: false,
          reason: `Installazione non riuscita: la RU ${ru} (${checkFace}) è già occupata da ${nameDesc}. Seleziona una o più RU libere.`,
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Returns an array of available free RU ranges for a given rack and face.
 */
export function getFreeRUs(
  rackId: string,
  totalRU: number,
  rackItems: RackInstalledItem[],
  face: RackFace
): number[] {
  const occupied = getOccupiedRUs(rackId, rackItems, face);
  const free: number[] = [];
  for (let ru = 1; ru <= totalRU; ru++) {
    if (!occupied.has(ru)) {
      free.push(ru);
    }
  }
  return free;
}
