import fs from 'fs';
import path from 'path';

export interface SavedTopology {
  id: string;
  name: string;
  dutName?: string;
  dutModel?: string;
  dutFirmware?: string;
  notes?: string;
  image: string; // base64 data url or path
  createdAt: string;
}

const TOPOLOGIES_FILE = path.resolve(process.cwd(), 'data', 'topologies.json');

function ensureDataDir(): void {
  const dir = path.dirname(TOPOLOGIES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getInitialTopologies(): SavedTopology[] {
  return [
    {
      id: 'topo_baseline_dual_10g',
      name: 'Bancada Padrão Intel X520-DA2 ⇄ Switch L2/L3 (Dual 10G SFP+)',
      dutName: 'Switch Core L2/L3',
      dutModel: 'Dual 10G SFP+ Full-Duplex',
      dutFirmware: 'Produção Homologada',
      notes: 'Topologia direta em anel com portas SFP+ 10GbE interconectadas nas portas 0 e 1 do gerador TRex.',
      image: '',
      createdAt: new Date().toISOString()
    }
  ];
}

export function getAllTopologies(): SavedTopology[] {
  ensureDataDir();
  if (!fs.existsSync(TOPOLOGIES_FILE)) {
    const initial = getInitialTopologies();
    fs.writeFileSync(TOPOLOGIES_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(TOPOLOGIES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading topologies file, resetting to initial', err);
    return [];
  }
}

export function saveTopology(topology: Omit<SavedTopology, 'id' | 'createdAt'> & { id?: string }): SavedTopology {
  ensureDataDir();
  const topologies = getAllTopologies();
  const id = topology.id || `topo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const newTopo: SavedTopology = {
    ...topology,
    id,
    createdAt: new Date().toISOString()
  };

  const existingIndex = topologies.findIndex(t => t.id === id);
  if (existingIndex >= 0) {
    topologies[existingIndex] = newTopo;
  } else {
    topologies.unshift(newTopo);
  }

  fs.writeFileSync(TOPOLOGIES_FILE, JSON.stringify(topologies, null, 2), 'utf8');
  return newTopo;
}

export function deleteTopology(id: string): boolean {
  ensureDataDir();
  const topologies = getAllTopologies();
  const filtered = topologies.filter(t => t.id !== id);
  if (filtered.length === topologies.length) return false;
  fs.writeFileSync(TOPOLOGIES_FILE, JSON.stringify(filtered, null, 2), 'utf8');
  return true;
}
