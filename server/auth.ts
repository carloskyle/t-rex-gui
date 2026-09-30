import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { User, AuthResponse } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cisco-trex-dpdk-secret-key-2026-secure-auth-token';
const JWT_EXPIRES_IN = '12h';
const USERS_FILE = path.resolve(process.cwd(), 'data', 'users.json');

function ensureDataDir(): void {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Default initial users
function getDefaultUsers(): Array<User & { passwordHash: string }> {
  return [
    {
      id: 'usr_admin_01',
      username: 'admin',
      name: 'TRex Super Admin',
      email: 'admin@trex-network.internal',
      role: 'admin',
      passwordHash: bcrypt.hashSync('trex@2026', 10),
    },
    {
      id: 'usr_netops_02',
      username: 'netops',
      name: 'Network Operations Engineer',
      email: 'netops@trex-network.internal',
      role: 'network_operator',
      passwordHash: bcrypt.hashSync('cisco123!', 10),
    },
    {
      id: 'usr_auditor_03',
      username: 'auditor',
      name: 'Security & QA Auditor',
      email: 'auditor@trex-network.internal',
      role: 'auditor',
      passwordHash: bcrypt.hashSync('auditor123', 10),
    }
  ];
}

function loadUsers(): Array<User & { passwordHash: string }> {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    const initial = getDefaultUsers();
    saveUsers(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    const fallback = getDefaultUsers();
    saveUsers(fallback);
    return fallback;
  }
}

function saveUsers(users: Array<User & { passwordHash: string }>): void {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

export function listUsers(): User[] {
  const users = loadUsers();
  return users.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    role: u.role
  }));
}

export function createUser(data: { username: string; name: string; email: string; role: 'admin' | 'network_operator' | 'auditor'; password: string }): User {
  const cleanUsername = data.username.trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error('Nome de usuário deve ter pelo menos 3 caracteres.');
  }
  if (!data.password || data.password.length < 4) {
    throw new Error('Senha deve ter pelo menos 4 caracteres.');
  }

  const users = loadUsers();
  if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
    throw new Error(`O usuário '${data.username}' já existe.`);
  }

  const newUser: User & { passwordHash: string } = {
    id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    username: cleanUsername,
    name: data.name.trim() || cleanUsername,
    email: data.email.trim() || `${cleanUsername}@trex.local`,
    role: data.role || 'network_operator',
    passwordHash: bcrypt.hashSync(data.password, 10),
  };

  users.push(newUser);
  saveUsers(users);

  return {
    id: newUser.id,
    username: newUser.username,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role
  };
}

export function updateUserPassword(id: string, newPassword: string): void {
  if (!newPassword || newPassword.length < 4) {
    throw new Error('Nova senha deve ter pelo menos 4 caracteres.');
  }
  const users = loadUsers();
  const user = users.find(u => u.id === id);
  if (!user) {
    throw new Error('Usuário não encontrado.');
  }

  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  saveUsers(users);
}

export function deleteUser(id: string): void {
  const users = loadUsers();
  const user = users.find(u => u.id === id);
  if (!user) {
    throw new Error('Usuário não encontrado.');
  }
  if (user.username === 'admin') {
    throw new Error('O usuário principal admin não pode ser excluído.');
  }

  const filtered = users.filter(u => u.id !== id);
  saveUsers(filtered);
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authenticateUser(username: string, password: string): AuthResponse | null {
  const cleanUser = username.trim().toLowerCase();
  const users = loadUsers();
  const userRecord = users.find(u => u.username.toLowerCase() === cleanUser);

  if (!userRecord) {
    return null;
  }

  const isValidPassword = bcrypt.compareSync(password, userRecord.passwordHash);
  if (!isValidPassword) {
    return null;
  }

  const userPayload: User = {
    id: userRecord.id,
    username: userRecord.username,
    name: userRecord.name,
    email: userRecord.email,
    role: userRecord.role,
  };

  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: userPayload,
    expiresIn: JWT_EXPIRES_IN,
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acesso negado. Token de autenticação JWT não fornecido.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token JWT inválido ou expirado. Por favor, autentique-se novamente.' });
  }
}

export function requireRole(allowedRoles: Array<'admin' | 'network_operator' | 'auditor'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Permissão insuficiente para esta ação.' });
      return;
    }
    next();
  };
}
