export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'network_operator' | 'auditor';
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn: string;
}

export interface ProfileItem {
  name: string;
  dir: 'cap2' | 'stl' | 'astf' | 'avl';
  size: number;
  updatedAt: string;
  type: 'yaml' | 'python';
}

export interface PortStats {
  id: number;
  name: string;
  speed: string; // e.g. "100 Gbps", "10 Gbps", "1 Gbps"
  status: 'UP' | 'DOWN';
  model?: string; // e.g. "Intel E810-C", "Mellanox ConnectX-5", "Intel 82599ES"
  driver?: string; // e.g. "mlx5_core", "vfio-pci", "igb_uio", "e1000e"
  pciAddress?: string; // e.g. "0000:03:00.0"
  ip?: string;
  mac?: string;
  txBps: number;
  rxBps: number;
  txPps: number;
  rxPps: number;
  opackets: number;
  ipackets: number;
  obytes: number;
  ibytes: number;
  oerrors: number;
  ierrors: number;
}

export interface TRexMetrics {
  txBps: number;
  rxBps: number;
  txPps: number;
  rxPps: number;
  txGbps: number;
  rxGbps: number;
  txMpps: number;
  rxMpps: number;
  cpuUtilPercent: number;
  dropRatePercent: number;
  rxDropBps?: number;
  rxDropPps?: number;
  latencyMinMs: number;
  latencyAvgMs: number;
  latencyMaxMs: number;
  jitterMs: number;
  activeFlows?: number;
  openFlowsPerSec?: number;
}

export interface TRexStatus {
  isRunning: boolean;
  activeServer: 'server1' | 'server2' | 'none';
  currentProfile: string | null;
  currentDir: string | null;
  multiplier: string | null;
  duration: string | null;
  elapsedSeconds: number;
  remainingSeconds: number;
  mode: 'STL' | 'ASTF' | 'IDLE';
  serverIp: string;
  trexVersion: string;
  isSimulated: boolean;
  ports: PortStats[];
  metrics: TRexMetrics;
}

export interface TelemetrySample {
  second: number;
  txGbps: number;
  rxGbps: number;
  txMpps: number;
  rxMpps: number;
  dropRatePercent: number;
  cpuPercent: number;
  latencyMs: number;
  p0TxGbps?: number;
  p0RxGbps?: number;
  p1TxGbps?: number;
  p1RxGbps?: number;
}

export interface DetailedPortReport {
  id: number;
  name: string;
  speed: string;
  pciAddress?: string;
  driver?: string;
  mac?: string;
  ip?: string;
  totalTxPkts: number;
  totalRxPkts: number;
  totalTxBytes: number;
  totalRxBytes: number;
  avgTxGbps: number;
  avgRxGbps: number;
  avgTxMpps: number;
  avgRxMpps: number;
  errors: number;
}

export interface TechnicalAnalysis {
  avgFrameSizeBytes: number;
  l1LineRateTxGbps: number;
  l1LineRateRxGbps: number;
  l2FrameRateTxGbps: number;
  l2FrameRateRxGbps: number;
  l3PayloadTxGbps: number;
  l3PayloadRxGbps: number;
  deliveryRatioPercent: number;
  droppedPacketsTotal: number;
  latencyMinUs: number;
  latencyAvgUs: number;
  latencyMaxUs: number;
  jitterUs: number;
  bandwidthEfficiencyPercent: number;
}

export interface TestReport {
  id: string;
  timestamp: string;
  endTime: string;
  operator: string;
  operatorRole: string;
  serverType: 'start_test (Server 1)' | 'start_test2 (Server 2)';
  targetHost: string;
  profile: string;
  dir: string;
  multiplier: string;
  duration: string;
  ports: number[];
  status: 'COMPLETED' | 'STOPPED' | 'FAILED' | 'RUNNING';
  summary: {
    totalPacketsTx: number;
    totalPacketsRx: number;
    totalBytesTx: number;
    totalBytesRx: number;
    avgTxGbps: number;
    avgRxGbps: number;
    peakTxGbps: number;
    peakRxGbps: number;
    avgTxMpps: number;
    avgRxMpps: number;
    avgDropRatePercent: number;
    maxLatencyMs: number;
    avgLatencyMs: number;
    cpuUtilizationPercent: number;
  };
  technicalAnalysis?: TechnicalAnalysis;
  detailedPorts?: DetailedPortReport[];
  timelineSamples?: TelemetrySample[];
  dutName?: string;
  dutModel?: string;
  dutFirmware?: string;
  topologyImage?: string;
  notes?: string;
  logs: string[];
}

export interface TRexActionRequest {
  action: 'start_test' | 'start_test2' | 'stop_server' | 'stop' | 'stats' | 'clear';
  dir?: 'cap2' | 'stl' | 'astf' | 'avl';
  profile?: string;
  multiplier?: string;
  duration?: string;
  ports?: number[];
  customParams?: string;
}

export interface SavedTopology {
  id: string;
  name: string;
  dutName?: string;
  dutModel?: string;
  dutFirmware?: string;
  notes?: string;
  image: string;
  createdAt: string;
}
