import { AuthResponse, ProfileItem, TRexStatus, TestReport, User, PortStats, DiagnosticsInfo, SavedTopology } from '../types';

const TOKEN_KEY = 'cisco_trex_jwt_token';
const USER_KEY = 'cisco_trex_user';

export class ApiClient {
  private static getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public static getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public static getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public static setAuth(auth: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, auth.token);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  }

  public static logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  public static async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha na autenticação' }));
      throw new Error(err.error || 'Falha ao autenticar.');
    }

    const data: AuthResponse = await res.json();
    ApiClient.setAuth(data);
    return data;
  }

  public static async getStatus(): Promise<TRexStatus> {
    const res = await fetch('/api/trex/status', {
      headers: ApiClient.getHeaders(),
    });
    if (res.status === 401) {
      ApiClient.logout();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (!res.ok) {
      throw new Error('Falha ao obter status do TRex');
    }
    return res.json();
  }

  public static async getLogs(limit: number = 100): Promise<{ logs: string[] }> {
    const res = await fetch(`/api/trex/logs?limit=${limit}`, {
      headers: ApiClient.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Falha ao obter logs do TRex');
    }
    return res.json();
  }

  public static async rescanInterfaces(): Promise<{ ports: PortStats[] }> {
    const res = await fetch('/api/trex/interfaces', {
      headers: ApiClient.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Falha ao re-escanear interfaces');
    }
    return res.json();
  }

  public static async getDiagnostics(): Promise<{ diagnostics: DiagnosticsInfo }> {
    const res = await fetch('/api/trex/diagnostics', {
      headers: ApiClient.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Falha ao obter diagnóstico do servidor');
    }
    return res.json();
  }

  public static async updateInterfaces(ports: PortStats[]): Promise<{ success: boolean; ports: PortStats[] }> {
    const res = await fetch('/api/trex/interfaces', {
      method: 'POST',
      headers: ApiClient.getHeaders(),
      body: JSON.stringify({ ports }),
    });
    if (!res.ok) {
      throw new Error('Falha ao atualizar interfaces');
    }
    return res.json();
  }

  public static async executeAction(payload: {
    action: 'start_test' | 'start_test2' | 'stop_server' | 'stop' | 'stats' | 'clear';
    dir?: string;
    profile?: string;
    multiplier?: string;
    duration?: string;
    ports?: number[];
  }): Promise<{ success: boolean; message: string; output?: string[] }> {
    const res = await fetch('/api/trex/action', {
      method: 'POST',
      headers: ApiClient.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao executar ação' }));
      throw new Error(err.error || 'Erro na execução do comando TRex.');
    }

    return res.json();
  }

  public static async getProfiles(dir?: string): Promise<{ profiles: Record<string, ProfileItem[]>; allowedDirs: string[] }> {
    const url = dir ? `/api/profiles?dir=${dir}` : '/api/profiles';
    const res = await fetch(url, {
      headers: ApiClient.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Falha ao listar perfis');
    }
    return res.json();
  }

  public static async getProfileContent(dir: string, filename: string): Promise<{ content: string; path: string }> {
    const res = await fetch(`/api/profiles/${dir}/${filename}`, {
      headers: ApiClient.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro ao carregar perfil' }));
      throw new Error(err.error || 'Falha ao carregar conteúdo do perfil');
    }
    return res.json();
  }

  public static async saveProfileContent(dir: string, filename: string, content: string): Promise<{ success: boolean; path: string }> {
    const res = await fetch(`/api/profiles/${dir}/${filename}`, {
      method: 'POST',
      headers: ApiClient.getHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro ao salvar perfil' }));
      throw new Error(err.error || 'Falha ao salvar perfil.');
    }
    return res.json();
  }

  public static async createProfile(dir: string, filename: string, content?: string): Promise<{ success: boolean; path: string }> {
    const res = await fetch('/api/profiles/create', {
      method: 'POST',
      headers: ApiClient.getHeaders(),
      body: JSON.stringify({ dir, filename, content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro ao criar perfil' }));
      throw new Error(err.error || 'Falha ao criar novo perfil.');
    }
    return res.json();
  }

  public static async getReports(): Promise<{ reports: TestReport[] }> {
    const res = await fetch('/api/reports', {
      headers: ApiClient.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Falha ao obter relatórios');
    }
    return res.json();
  }

  public static async getReportById(id: string): Promise<TestReport> {
    const res = await fetch(`/api/reports/${id}`, {
      headers: ApiClient.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Relatório não encontrado');
    }
    return res.json();
  }

  public static async updateReport(id: string, updates: Partial<TestReport>): Promise<{ success: boolean; report: TestReport }> {
    const res = await fetch(`/api/reports/${id}`, {
      method: 'PATCH',
      headers: ApiClient.getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao atualizar relatório' }));
      throw new Error(err.error || 'Falha ao atualizar relatório');
    }
    return res.json();
  }

  public static async deleteReport(id: string): Promise<void> {
    const res = await fetch(`/api/reports/${id}`, {
      method: 'DELETE',
      headers: ApiClient.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Falha ao excluir relatório');
    }
  }

  /* Topology Library API */
  public static async getTopologies(): Promise<SavedTopology[]> {
    const res = await fetch('/api/topologies', {
      headers: ApiClient.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Falha ao obter topologias salvas');
    }
    const data = await res.json();
    return data.topologies;
  }

  public static async saveTopology(topology: Omit<SavedTopology, 'id' | 'createdAt'> & { id?: string }): Promise<{ success: boolean; topology: SavedTopology }> {
    const res = await fetch('/api/topologies', {
      method: 'POST',
      headers: ApiClient.getHeaders(),
      body: JSON.stringify(topology),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao salvar topologia' }));
      throw new Error(err.error || 'Falha ao salvar topologia');
    }
    return res.json();
  }

  public static async deleteTopology(id: string): Promise<void> {
    const res = await fetch(`/api/topologies/${id}`, {
      method: 'DELETE',
      headers: ApiClient.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Falha ao remover topologia da biblioteca');
    }
  }

  public static async getConfig(): Promise<{ serverIp: string; version: string; isSimulated: boolean; defaultHost: string }> {
    const res = await fetch('/api/config', {
      headers: ApiClient.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Falha ao obter configurações');
    }
    return res.json();
  }

  public static async updateConfig(serverIp: string): Promise<{ success: boolean; serverIp: string }> {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: ApiClient.getHeaders(),
      body: JSON.stringify({ serverIp }),
    });
    if (!res.ok) {
      throw new Error('Falha ao salvar configuração');
    }
    return res.json();
  }

  /* User Management API */
  public static async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users', {
      headers: ApiClient.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao buscar usuários' }));
      throw new Error(err.error || 'Falha ao listar usuários');
    }
    const data = await res.json();
    return data.users;
  }

  public static async createUser(user: { username: string; name: string; email: string; role: 'admin' | 'network_operator' | 'auditor'; password: string }): Promise<User> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: ApiClient.getHeaders(),
      body: JSON.stringify(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao criar usuário' }));
      throw new Error(err.error || 'Falha ao criar usuário');
    }
    const data = await res.json();
    return data.user;
  }

  public static async updateUserPassword(id: string, password: string): Promise<void> {
    const res = await fetch(`/api/users/${id}/password`, {
      method: 'PUT',
      headers: ApiClient.getHeaders(),
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao atualizar senha' }));
      throw new Error(err.error || 'Falha ao atualizar senha');
    }
  }

  public static async deleteUser(id: string): Promise<void> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: ApiClient.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao excluir usuário' }));
      throw new Error(err.error || 'Falha ao excluir usuário');
    }
  }
}
