/**
 * NetRack DCIM - LLDP & CDP Network Discovery Engine
 */
import { Device, NetworkInterface, LLDPNeighbor, Cable } from '../types/dcim';

export interface DiscoveryScanResult {
  deviceId: string;
  deviceName: string;
  ip: string;
  protocol: 'LLDP' | 'CDP';
  discoveredInterfaces: NetworkInterface[];
  neighbors: LLDPNeighbor[];
  potentialCables: Array<{
    remoteDeviceName: string;
    remotePort: string;
    localPort: string;
    remoteChassisId: string;
  }>;
}

export function simulateDeviceDiscovery(
  device: Device,
  allDevices: Device[]
): DiscoveryScanResult {
  const isCisco = device.model.toLowerCase().includes('catalyst') ||
                  device.model.toLowerCase().includes('nexus') ||
                  device.brandId.toLowerCase().includes('cisco');
  
  const protocol: 'LLDP' | 'CDP' = isCisco ? 'CDP' : 'LLDP';
  
  // Standard interface template based on device type
  const generatedInterfaces: NetworkInterface[] = [];
  const neighbors: LLDPNeighbor[] = [];
  const potentialCables: DiscoveryScanResult['potentialCables'] = [];

  // Determine port density
  const portCount = device.model.includes('48') ? 48 : device.model.includes('24') ? 24 : 12;
  const prefix = isCisco ? 'GigabitEthernet1/0/' : 'eth';

  for (let i = 1; i <= portCount; i++) {
    const portName = `${prefix}${i}`;
    const existing = device.interfaces.find((iface) => iface.name === portName);
    
    // Simulate active links on some ports
    const isUp = i % 3 !== 0;
    const isHidden = existing ? existing.isHidden : i > 16; // by default hide high ports if not used
    
    generatedInterfaces.push({
      id: existing?.id || `iface-${device.id}-${i}`,
      name: portName,
      type: i > portCount - 4 ? '10G' : '1G',
      macAddress: `00:50:56:${Math.floor(10 + i * 2).toString(16)}:${Math.floor(20 + i).toString(16)}:${Math.floor(i * 3).toString(16)}`.toUpperCase(),
      ipAddress: i === 1 ? device.ipManagement : undefined,
      vlan: i % 2 === 0 ? 100 : 200,
      status: isUp ? 'UP' : 'DOWN',
      isHidden,
      discoveredVia: protocol,
    });
  }

  // Find other devices in inventory to link as realistic LLDP/CDP neighbors
  const otherDevices = allDevices.filter((d) => d.id !== device.id && d.ipManagement);
  
  if (otherDevices.length > 0) {
    const targetNeighbor1 = otherDevices[0];
    neighbors.push({
      localPort: `${prefix}1`,
      chassisId: targetNeighbor1.serialNumber || '00:1A:2B:3C:4D:5E',
      systemName: `${targetNeighbor1.model}-${targetNeighbor1.serialNumber.slice(-4)}`,
      portId: 'GigabitEthernet1/0/1',
      protocol,
      managementIp: targetNeighbor1.ipManagement,
      capabilities: ['Bridge', 'Router'],
    });

    potentialCables.push({
      localPort: `${prefix}1`,
      remoteDeviceName: targetNeighbor1.model,
      remotePort: 'GigabitEthernet1/0/1',
      remoteChassisId: targetNeighbor1.serialNumber,
    });
  }

  if (otherDevices.length > 1) {
    const targetNeighbor2 = otherDevices[1];
    neighbors.push({
      localPort: `${prefix}2`,
      chassisId: targetNeighbor2.serialNumber || '00:1A:2B:99:88:77',
      systemName: `${targetNeighbor2.model}-${targetNeighbor2.serialNumber.slice(-4)}`,
      portId: 'eth1',
      protocol,
      managementIp: targetNeighbor2.ipManagement,
      capabilities: ['Station'],
    });

    potentialCables.push({
      localPort: `${prefix}2`,
      remoteDeviceName: targetNeighbor2.model,
      remotePort: 'eth1',
      remoteChassisId: targetNeighbor2.serialNumber,
    });
  }

  return {
    deviceId: device.id,
    deviceName: device.model,
    ip: device.ipManagement || 'N/D',
    protocol,
    discoveredInterfaces: generatedInterfaces,
    neighbors,
    potentialCables,
  };
}
