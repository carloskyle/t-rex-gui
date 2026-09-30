import express, { Request, Response, NextFunction } from 'express';
import { authenticateUser, requireAuth, AuthenticatedRequest } from './auth.js';
import { listProfiles, readProfile, saveProfile, ALLOWED_DIRS, AllowedDir, isValidProfileFilename } from './profilesService.js';
import { trexManager } from './trexService.js';
import { getAllReports, getReportById, deleteReport, exportReportAsCsv, exportReportAsMarkdown } from './reportsService.js';

export const app = express();

// Parse JSON and URL encoded bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS and Security Headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

/* -------------------------------------------------------------
 * 1. AUTHENTICATION ROUTES
 * ------------------------------------------------------------- */
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    return;
  }

  const result = authenticateUser(username, password);
  if (!result) {
    res.status(401).json({ error: 'Credenciais inválidas. Verifique usuário e senha.' });
    return;
  }

  trexManager.addLog(`[AUTH] Operador autenticado com sucesso: ${result.user.username} (${result.user.role})`);
  res.json(result);
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

/* -------------------------------------------------------------
 * 2. PROFILES MANAGEMENT ROUTES
 * ------------------------------------------------------------- */
app.get('/api/profiles', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const dir = req.query.dir as AllowedDir | undefined;
    if (dir && !ALLOWED_DIRS.includes(dir)) {
      res.status(400).json({ error: `Diretório inválido. Permitidos: ${ALLOWED_DIRS.join(', ')}` });
      return;
    }
    const profiles = listProfiles(dir);
    res.json({ profiles, allowedDirs: ALLOWED_DIRS });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profiles/:dir/:filename', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dir, filename } = req.params;
    const result = readProfile(dir, filename);
    if (!result) {
      res.status(404).json({ error: 'Perfil não encontrado.' });
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/profiles/:dir/:filename', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dir, filename } = req.params;
    const { content } = req.body;

    if (typeof content !== 'string') {
      res.status(400).json({ error: 'Conteúdo do perfil deve ser texto válido.' });
      return;
    }

    const result = saveProfile(dir, filename, content);
    trexManager.addLog(`[PROFILES] Perfil ${dir}/${filename} salvo com sucesso por ${req.user?.username}`);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Create new profile
app.post('/api/profiles/create', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dir, filename, content } = req.body;
    if (!dir || !ALLOWED_DIRS.includes(dir)) {
      res.status(400).json({ error: 'Diretório inválido.' });
      return;
    }
    if (!filename || !isValidProfileFilename(filename)) {
      res.status(400).json({ error: 'Nome de arquivo inválido. Deve terminar com .yaml ou .py.' });
      return;
    }

    const defaultContent = filename.endsWith('.py')
      ? `# Cisco TRex Python Profile\nfrom trex_stl_lib.api import *\n\ndef register():\n    pass\n`
      : `# Cisco TRex YAML Profile\n- duration: 10\n  generator:\n    distribution: "seq"\n`;

    const result = saveProfile(dir, filename, content || defaultContent);
    trexManager.addLog(`[PROFILES] Novo perfil criado: ${dir}/${filename}`);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/* -------------------------------------------------------------
 * 3. TREX ENGINE CONTROL & TELEMETRY
 * ------------------------------------------------------------- */
app.get('/api/trex/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json(trexManager.getStatus());
});

app.get('/api/trex/logs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  res.json({ logs: trexManager.getLogs(limit) });
});

// Hardware network interfaces detection & rescan
app.get('/api/trex/interfaces', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const ports = trexManager.rescanInterfaces();
    res.json({ ports });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Full Server DPDK & Process Diagnostics
app.get('/api/trex/diagnostics', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const diag = await trexManager.runDiagnostics();
    res.json({ diagnostics: diag });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trex/interfaces', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ports } = req.body;
    if (!Array.isArray(ports)) {
      res.status(400).json({ error: 'Lista de portas inválida.' });
      return;
    }
    trexManager.updatePortMapping(ports);
    res.json({ success: true, ports: trexManager.getStatus().ports });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/trex/action', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const result = await trexManager.executeAction(req.body, req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/* -------------------------------------------------------------
 * 4. TEST REPORTS & ANALYTICS
 * ------------------------------------------------------------- */
app.get('/api/reports', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reports = getAllReports();
    res.json({ reports });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const report = getReportById(req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Relatório não encontrado.' });
      return;
    }
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reports/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = deleteReport(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Relatório não encontrado para exclusão.' });
      return;
    }
    trexManager.addLog(`[REPORT] Relatório ${req.params.id} excluído por ${req.user?.username}`);
    res.json({ success: true, message: 'Relatório excluído com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Download format (CSV, Markdown, JSON)
app.get('/api/reports/:id/export', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const report = getReportById(req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Relatório não encontrado.' });
      return;
    }

    const format = (req.query.format as string) || 'json';

    if (format === 'csv') {
      const csvData = exportReportAsCsv(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="trex-report-${report.id}.csv"`);
      res.send(csvData);
      return;
    }

    if (format === 'markdown' || format === 'md') {
      const mdData = exportReportAsMarkdown(report);
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="trex-report-${report.id}.md"`);
      res.send(mdData);
      return;
    }

    // Default JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="trex-report-${report.id}.json"`);
    res.send(JSON.stringify(report, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------
 * 5. HOST CONFIGURATION
 * ------------------------------------------------------------- */
app.get('/api/config', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const status = trexManager.getStatus();
  res.json({
    serverIp: status.serverIp,
    version: status.trexVersion,
    isSimulated: status.isSimulated,
    defaultHost: '10.69.70.20',
  });
});

app.post('/api/config', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { serverIp } = req.body;
  if (!serverIp || typeof serverIp !== 'string') {
    res.status(400).json({ error: 'Endereço IP inválido.' });
    return;
  }
  trexManager.setServerIp(serverIp.trim());
  res.json({ success: true, serverIp: serverIp.trim() });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API Server Error]', err);
  res.status(500).json({ error: err.message || 'Erro interno no servidor da API TRex' });
});
