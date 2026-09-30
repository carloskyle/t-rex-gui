import fs from 'fs';
import path from 'path';
import { ProfileItem } from './types.js';

// Physical TRex directory on target server (e.g. 10.69.70.20)
const REAL_TREX_DIR = '/opt/trex/v3.08';
const LOCAL_FALLBACK_DIR = path.resolve(process.cwd(), 'data', 'trex_profiles');

export const ALLOWED_DIRS = ['cap2', 'stl', 'astf', 'avl'] as const;
export type AllowedDir = typeof ALLOWED_DIRS[number];

// Determine effective profiles base path
export function getProfilesBasePath(): string {
  if (fs.existsSync(REAL_TREX_DIR)) {
    return REAL_TREX_DIR;
  }
  return LOCAL_FALLBACK_DIR;
}

export function isValidProfileFilename(filename: string): boolean {
  if (!filename || path.basename(filename) !== filename) return false;
  return /^[A-Za-z0-9._-]+\.(yaml|py)$/.test(filename);
}

// Seed initial authentic Cisco TRex profiles if directory is empty or initialized
export function initializeProfilesStorage(): void {
  const baseDir = getProfilesBasePath();

  for (const subDir of ALLOWED_DIRS) {
    const fullPath = path.join(baseDir, subDir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  // Pre-populate with authentic Cisco TRex samples if not already present
  const samples: Array<{ dir: AllowedDir; file: string; content: string }> = [
    {
      dir: 'stl',
      file: 'imix.yaml',
      content: `# Cisco TRex Stateless IMIX Profile
# Real-world Internet Traffic Mix: 64B (58%), 594B (33%), 1518B (9%)
- duration : 0.1
  generator :
    distribution : "seq"
    clients_start : "16.0.0.1"
    clients_end   : "16.0.0.254"
    servers_start : "48.0.0.1"
    servers_end   : "48.0.0.254"
    clients_per_gb : 201
    min_rate_bps : 10000000
  cap_info :
    - name: cap2/small_packet.pcap
      cps : 58.0
    - name: cap2/medium_packet.pcap
      cps : 33.0
    - name: cap2/large_packet.pcap
      cps : 9.0
`
    },
    {
      dir: 'stl',
      file: 'udp_1pkt_simple.py',
      content: `# Cisco TRex Stateless UDP Single Packet Benchmark
from trex_stl_lib.api import *

class STLS1(object):
    def __init__(self):
        self.fsize = 64

    def create_stream(self):
        # Create base packet and pad to size
        base_pkt = Ether()/IP(src="16.0.0.1", dst="48.0.0.1")/UDP(dport=12, sport=1025)
        pad = max(0, self.fsize - len(base_pkt)) * 'x'
        pkt = STLPktBuilder(pkt=base_pkt/pad)

        return STLStream(
            packet=pkt,
            mode=STLTXCont(percentage=100)
        )

    def get_streams(self, direction=0, **kwargs):
        return [self.create_stream()]

def register():
    return STLS1()
`
    },
    {
      dir: 'stl',
      file: 'syn_attack.yaml',
      content: `# Cisco TRex SYN Flood Attack Profile (Firewall & IDS Testing)
- duration : 1.0
  generator :
    distribution : "random"
    clients_start : "10.0.0.1"
    clients_end   : "10.255.255.254"
    servers_start : "192.168.1.100"
    servers_end   : "192.168.1.100"
  cap_info :
    - name: cap2/syn_flood.pcap
      cps : 100000.0
`
    },
    {
      dir: 'astf',
      file: 'http_simple.py',
      content: `# Cisco TRex ASTF (Advanced Stateful) HTTP 1.1 Emulation
from trex.astf.api import *

class Prof1():
    def __init__(self):
        pass

    def get_profile(self, **kwargs):
        # Client program: send GET /index.html and expect HTTP 200 OK
        prog_c = ASTFProgram()
        prog_c.send_msg("GET /3322 HTTP/1.1\\r\\nHost: 10.69.70.20\\r\\nUser-Agent: TRex-Client\\r\\nAccept: */*\\r\\n\\r\\n")
        prog_c.recv_msg(1)

        # Server program: accept and return 200 OK
        prog_s = ASTFProgram()
        prog_s.recv_msg(1)
        prog_s.send_msg("HTTP/1.1 200 OK\\r\\nServer: TRex-Sim\\r\\nContent-Length: 1024\\r\\n\\r\\n" + "X" * 1024)

        # Association IP template
        ip_gen_c = ASTFIpGenDist(ip_range=["16.0.0.1", "16.0.0.254"], distribution="seq")
        ip_gen_s = ASTFIpGenDist(ip_range=["48.0.0.1", "48.0.0.254"], distribution="seq")
        ip_gen = ASTFIpGen(glob=ASTFIpGenGlobal(ip_offset="1.0.0.0"),
                           dist_client=ip_gen_c,
                           dist_server=ip_gen_s)

        template = ASTFTemplate(client_template=ASTFTCPClientTemplate(program=prog_c, ip_gen=ip_gen, port=80),
                                server_template=ASTFTCPServerTemplate(program=prog_s))

        return ASTFProfile(default_ip_gen=ip_gen, templates=template)

def register():
    return Prof1()
`
    },
    {
      dir: 'astf',
      file: 'sfr.py',
      content: `# Cisco TRex ASTF Stateful Real-world Traffic (SFR mix)
from trex.astf.api import *

class SFRProfile():
    def get_profile(self, **kwargs):
        prog = ASTFProgram()
        prog.send_msg("PING\\r\\n")
        prog.recv_msg(1)
        ip_gen = ASTFIpGen(dist_client=ASTFIpGenDist(ip_range=["10.1.0.1", "10.1.0.255"]),
                           dist_server=ASTFIpGenDist(ip_range=["10.2.0.1", "10.2.0.255"]))
        template = ASTFTemplate(client_template=ASTFTCPClientTemplate(program=prog, ip_gen=ip_gen, port=443))
        return ASTFProfile(default_ip_gen=ip_gen, templates=template)

def register():
    return SFRProfile()
`
    },
    {
      dir: 'cap2',
      file: 'dns.yaml',
      content: `# Stateless DNS Queries Capture Replay
- duration : 1.0
  generator :
    distribution : "seq"
    clients_start : "172.16.1.1"
    clients_end   : "172.16.1.254"
    servers_start : "8.8.8.8"
    servers_end   : "8.8.4.4"
  cap_info :
    - name: cap2/dns.pcap
      cps : 5000.0
`
    },
    {
      dir: 'avl',
      file: 'enterprise_mix.yaml',
      content: `# Cisco TRex AVL High Throughput Multi-VLAN Enterprise Profile
- duration : 60
  generator :
    distribution : "random"
    clients_start : "192.168.10.1"
    clients_end   : "192.168.10.254"
    servers_start : "192.168.20.1"
    servers_end   : "192.168.20.254"
  cap_info :
    - name: cap2/enterprise_data.pcap
      cps : 25000.0
`
    }
  ];

  for (const sample of samples) {
    const targetFile = path.join(baseDir, sample.dir, sample.file);
    if (!fs.existsSync(targetFile)) {
      fs.writeFileSync(targetFile, sample.content, 'utf8');
    }
  }
}

// List all profiles in a given directory or across all allowed directories
export function listProfiles(dirFilter?: AllowedDir): Record<AllowedDir, ProfileItem[]> {
  initializeProfilesStorage();
  const baseDir = getProfilesBasePath();
  const results: Record<AllowedDir, ProfileItem[]> = {
    cap2: [],
    stl: [],
    astf: [],
    avl: []
  };

  const dirsToList = dirFilter ? [dirFilter] : ALLOWED_DIRS;

  for (const d of dirsToList) {
    const dirPath = path.join(baseDir, d);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (isValidProfileFilename(file)) {
        try {
          const stat = fs.statSync(path.join(dirPath, file));
          results[d].push({
            name: file,
            dir: d,
            size: stat.size,
            updatedAt: stat.mtime.toISOString(),
            type: file.endsWith('.py') ? 'python' : 'yaml',
          });
        } catch {
          // ignore stat errors
        }
      }
    }
    results[d].sort((a, b) => a.name.localeCompare(b.name));
  }

  return results;
}

export function readProfile(dir: string, filename: string): { content: string; path: string } | null {
  if (!ALLOWED_DIRS.includes(dir as AllowedDir)) {
    throw new Error('Diretório não permitido. Permitidos: cap2, stl, astf, avl');
  }
  if (!isValidProfileFilename(filename)) {
    throw new Error('Nome de arquivo de perfil inválido. Use apenas caracteres seguros e extensão .yaml ou .py');
  }

  const baseDir = getProfilesBasePath();
  const filePath = path.join(baseDir, dir, filename);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return { content, path: filePath };
}

export function saveProfile(dir: string, filename: string, content: string): { success: boolean; path: string } {
  if (!ALLOWED_DIRS.includes(dir as AllowedDir)) {
    throw new Error('Diretório não permitido. Permitidos: cap2, stl, astf, avl');
  }
  if (!isValidProfileFilename(filename)) {
    throw new Error('Nome de arquivo de perfil inválido.');
  }

  const baseDir = getProfilesBasePath();
  const dirPath = path.join(baseDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  return { success: true, path: filePath };
}
