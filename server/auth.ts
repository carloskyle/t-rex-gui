import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { User, AuthResponse } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cisco-trex-dpdk-secret-key-2026-secure-auth-token';
const JWT_EXPIRES_IN = '12h';

// Pre-configured system users for Cisco TRex Network Testing
// Passwords hashed with bcrypt (costs 10)
const USERS_STORE: Array<User & { passwordHash: string }> = [
  {
    id: 'usr_admin_01',
    username: 'admin',
    name: 'TRex Super Admin',
    email: 'admin@trex-network.internal',
    role: 'admin',
    // hash for: trex@2026
    passwordHash: bcrypt.hashSync('trex@2026', 10),
  },
  {
    id: 'usr_netops_02',
    username: 'netops',
    name: 'Network Operations Engineer',
    email: 'netops@trex-network.internal',
    role: 'network_operator',
    // hash for: cisco123!
    passwordHash: bcrypt.hashSync('cisco123!', 10),
  },
  {
    id: 'usr_auditor_03',
    username: 'auditor',
    name: 'Security & QA Auditor',
    email: 'auditor@trex-network.internal',
    role: 'auditor',
    // hash for: auditor123
    passwordHash: bcrypt.hashSync('auditor123', 10),
  }
];

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authenticateUser(username: string, password: string): AuthResponse | null {
  const cleanUser = username.trim().toLowerCase();
  const userRecord = USERS_STORE.find(u => u.username.toLowerCase() === cleanUser);

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
