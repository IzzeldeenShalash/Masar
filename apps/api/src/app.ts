import {registerAIRoutes} from './ai-routes';
import express, { type Express, type Request, type Response, type RequestHandler, type ErrorRequestHandler } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { timingSafeEqual } from 'node:crypto';
import mongoose from 'mongoose';
import { loginSchema, signupSchema, selectAgencySchema, type Account, type ApiErrorCode, type Role } from '@masar/shared';
import { Agency, Session, User } from './db';
import { digest, hashPassword, randomToken, verifyPassword } from './security';
import type { Config } from './config';
import { registerResidentRoutes } from './resident-routes';
import { registerAgencyRoutes } from './agency-routes';

declare module 'express-serve-static-core' {
  interface Request { account?: Account; sessionId?: string; sessionCsrf?: string }
}
const cookieName = 'masar_session';
function fail(res: Response, status: number, code: ApiErrorCode, message: string) {
  return res.status(status).json({ error: { code, message } });
}
export function requireRole(role: Role): RequestHandler {
  return (req, res, next) => {
    if (!req.account) { fail(res, 401, 'UNAUTHORIZED', 'Please sign in again.'); return; }
    if (req.account.role !== role) { fail(res, 403, 'FORBIDDEN', 'Access is not permitted.'); return; }
    next();
  };
}
export async function buildApp(config: Config, registerTestRoutes?: (app: Express) => void) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.set('case sensitive routing', true);
  app.set('strict routing', true);
  const origins = config.WEB_ORIGINS.split(',');
  const dummyHash = await hashPassword(randomToken());
  const cookieOptions = { path: '/', httpOnly: true, secure: config.COOKIE_SECURE, sameSite: 'strict' as const };
  // No request logger: bodies, cookies, tokens and database URIs are never logged.
  app.use((_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    next();
  });
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin)) { fail(res, 403, 'CSRF', 'Origin is not permitted.'); return; }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (!req.is('application/json')) { fail(res, 415, 'VALIDATION', 'JSON is required.'); return; }
      if (!origin && req.headers['sec-fetch-site']) { fail(res, 403, 'CSRF', 'Origin is required for browser requests.'); return; }
    }
    next();
  });
  app.use(cors({ origin: origins, credentials: true, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'] }));
  const limiter = (limit: number) => rateLimit({
    windowMs: 60_000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, res) => { fail(res, 429, 'RATE_LIMITED', 'Too many requests. Try again later.'); },
  });
  app.use(limiter(120));
  app.use('/resident/photos', express.json({ limit: '3mb', strict: true }));
  app.use('/agency/photos', express.json({ limit: '3mb', strict: true }));
  app.use('/assistant/transcribe',express.json({limit:'4mb',strict:true}));
  app.use(express.json({ limit: '16kb', strict: true }));
  app.use(cookieParser());
  app.use(async (req, res, next) => {
    if (['/health', '/auth/signup', '/auth/login'].includes(req.path)) { next(); return; }
    const authorization = req.headers.authorization;
    // Browsers exclusively use HttpOnly cookies, even when Authorization is present.
    const token: unknown = req.headers.origin ? req.cookies[cookieName] : authorization?.startsWith('Bearer ') ? authorization.slice(7) : req.cookies[cookieName];
    if (typeof token !== 'string' || !token || token.length > 256) { fail(res, 401, 'UNAUTHORIZED', 'Please sign in again.'); return; }
    const session = await Session.findOne({ tokenDigest: digest(token), expiresAt: { $gt: new Date() } });
    if (!session) { fail(res, 401, 'UNAUTHORIZED', 'Please sign in again.'); return; }
    const user = await User.findById(session.userId);
    if (!user) { fail(res, 401, 'UNAUTHORIZED', 'Please sign in again.'); return; }
    const ids = user.role === 'AGENCY' ? [...new Set([user.agencyId, ...user.agencyIds].filter(Boolean).map(String))] : [];
    const available = await Agency.find({ _id: { $in: ids } });
    const agency = available.find((item) => item.id === String(session.activeAgencyId ?? user.agencyId));
    if (user.role === 'AGENCY' && !agency) { fail(res, 403, 'FORBIDDEN', 'Account is unavailable.'); return; }
    req.account = { id: user.id, email: user.email, displayName: user.displayName, role: user.role as Role, agency: agency ? { id: agency.id, name: agency.name, nameAr: agency.nameAr } : null, agencies: available.map((item) => ({ id: item.id, name: item.name, nameAr: item.nameAr })) };
    req.sessionId = session.id;
    req.sessionCsrf = session.csrfToken;
    if (!['GET', 'HEAD'].includes(req.method) && (req.headers.origin || !authorization)) {
      const csrf = req.headers['x-csrf-token'];
      const expected = Buffer.from(session.csrfToken);
      const supplied = typeof csrf === 'string' ? Buffer.from(csrf) : Buffer.alloc(0);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { fail(res, 403, 'CSRF', 'Refresh your session and retry.'); return; }
    }
    next();
  });
  async function establish(user: { id: string; displayName: string; email: string; role: string; agencyId?: mongoose.Types.ObjectId | null; agencyIds?: mongoose.Types.ObjectId[] }, req: Request, res: Response) {
    const token = randomToken();
    const csrfToken = randomToken();
    const expiresAt = new Date(Date.now() + config.SESSION_TTL_HOURS * 3600_000);
    await Session.create({ tokenDigest: digest(token), csrfToken, userId: user.id, expiresAt, activeAgencyId: user.agencyId });
    const agency = user.agencyId ? await Agency.findById(user.agencyId) : null;
    const ids = user.role === 'AGENCY' ? [...new Set([user.agencyId, ...(user.agencyIds ?? [])].filter(Boolean).map(String))] : [];
    const available = await Agency.find({ _id: { $in: ids } });
    if (req.headers.origin) res.cookie(cookieName, token, { ...cookieOptions, expires: expiresAt });
    return { user: { id: user.id, displayName: user.displayName, email: user.email, role: user.role, agency: agency ? { id: agency.id, name: agency.name, nameAr: agency.nameAr } : null, agencies: available.map((item) => ({ id: item.id, name: item.name, nameAr: item.nameAr })) }, csrfToken, ...(!req.headers.origin ? { token } : {}) };
  }
  app.get('/health', async (_req, res) => {
    if (mongoose.connection.readyState !== 1) return fail(res, 503, 'UNAVAILABLE', 'Database unavailable.');
    await mongoose.connection.db!.admin().ping();
    return res.json({ status: 'ok', demoMode: config.DEMO_MODE });
  });
  app.post('/auth/signup', limiter(5), async (req, res) => {
    const input = signupSchema.safeParse(req.body);
    if (!input.success) return fail(res, 400, 'VALIDATION', 'Check your name, email and password (12–128 characters).');
    const passwordHash = await hashPassword(input.data.password);
    try {
      const user = await User.create({ displayName: input.data.displayName, email: input.data.email, passwordHash, role: 'USER', agencyId: null });
      return res.status(201).json(await establish(user, req, res));
    } catch (error) {
      if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) return fail(res, 409, 'SIGNUP_UNAVAILABLE', 'Unable to create an account with these details. Try signing in or use different details.');
      throw error;
    }
  });
  app.post('/auth/login', limiter(10), async (req, res) => {
    const input = loginSchema.safeParse(req.body);
    if (!input.success) return fail(res, 400, 'VALIDATION', 'Check your email and password.');
    const user = await User.findOne({ email: input.data.email }).select('+passwordHash');
    const valid = await verifyPassword(user?.passwordHash ?? dummyHash, input.data.password);
    if (!user || !valid) return fail(res, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    return res.json(await establish(user, req, res));
  });
  app.get('/auth/me', (req, res) => {
    if (!req.account) return fail(res, 401, 'UNAUTHORIZED', 'Please sign in again.');
    return res.json({ user: req.account, csrfToken: req.sessionCsrf });
  });
  app.post('/auth/agency', requireRole('AGENCY'), async (req, res) => {
    const input = selectAgencySchema.safeParse(req.body);
    if (!input.success) return fail(res, 400, 'VALIDATION', 'Choose a valid agency.');
    const agency = req.account!.agencies.find((item) => item.id === input.data.agencyId);
    if (!agency) return fail(res, 403, 'FORBIDDEN', 'Access is not permitted.');
    const session = await Session.findOneAndUpdate({ _id: req.sessionId, userId: req.account!.id, expiresAt: { $gt: new Date() } }, { $set: { activeAgencyId: agency.id } });
    if (!session) return fail(res, 401, 'UNAUTHORIZED', 'Please sign in again.');
    return res.json({ user: { ...req.account, agency }, csrfToken: req.sessionCsrf });
  });
  app.post('/auth/logout', async (req, res) => {
    if (!req.sessionId) return fail(res, 401, 'UNAUTHORIZED', 'Please sign in again.');
    await Session.deleteOne({ _id: req.sessionId });
    res.clearCookie(cookieName, cookieOptions);
    return res.status(204).send();
  });
  app.use((req,res,next)=>{if(req.method==='POST')res.on('finish',()=>{const match=req.path.match(/^\/(?:agency|resident)\/reports\/([a-f\d]{24})\//i);if(match&&res.statusCode<300)issueEvents.emit('change',match[1],'status');});next();});
  registerResidentRoutes(app, requireRole('USER'), config.PHOTON_BASE_URL, config.UPLOAD_DIR);
  registerAIRoutes(app,config);
  registerStage8(app,config);
  registerAgencyRoutes(app, requireRole('AGENCY'), config.UPLOAD_DIR, config.PHOTON_BASE_URL);
  if (registerTestRoutes) {
    if (config.NODE_ENV !== 'test') throw new Error('Test routes require NODE_ENV=test');
    registerTestRoutes(app);
  }
  app.use((_req, res) => { fail(res, 404, 'FORBIDDEN', 'Route not available.'); });
  const onError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
    if (status === 400 || status === 413 || status === 415) { fail(res, status, 'VALIDATION', 'Invalid request.'); return; }
    fail(res, 503, 'UNAVAILABLE', 'Service is temporarily unavailable. Please retry.');
  };
  app.use(onError);
  return app;
}
import {registerStage8} from './stage8-routes';
import {issueEvents} from './community-service';
