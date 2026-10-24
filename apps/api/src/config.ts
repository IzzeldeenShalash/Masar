import 'dotenv/config';
import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform((value) => value === 'true');
const schema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  DEMO_MODE: bool.default(true),
  COOKIE_SECURE: bool.default(false),
  WEB_ORIGINS: z.string().default('http://localhost:8081,http://127.0.0.1:8081'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(168),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PHOTON_BASE_URL: z.url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol)).default('https://photon.komoot.io'),
  AI_MODE: z.enum(['ollama','disabled','fixture']).default('ollama'),
  ASSISTANT_PROVIDER:z.enum(['gemini','ollama','mock','disabled']).default('mock'),
  ASSISTANT_MODEL:z.string().trim().max(120).default(''),
  GEMINI_API_KEY:z.string().default(''),
  AI_IMAGES_ENABLED:bool.default(false),
  VOICE_PROVIDER:z.enum(['gemini','whisper','disabled']).default('disabled'),
  VOICE_MODEL:z.string().trim().max(120).default(''),
  WHISPER_URL:z.url().refine(v=>{const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password;}).default('http://127.0.0.1:8082/inference'),
  OLLAMA_BASE_URL: z.url().refine(v=>{const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&!u.search&&!u.hash;}).default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().trim().max(120).default(''),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(45000),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
});
export type Config = z.infer<typeof schema>;
export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  const config = parsed.data;
  const origins = config.WEB_ORIGINS.split(',');
  if (origins.some((origin) => { try { return new URL(origin).origin !== origin; } catch { return true; } })) throw new Error('WEB_ORIGINS must contain exact origins');
  if (config.NODE_ENV === 'production' && (!config.COOKIE_SECURE || origins.some((o) => !o.startsWith('https://')))) throw new Error('Production requires secure cookies and HTTPS origins');
  if(config.AI_MODE==='fixture'&&(!config.DEMO_MODE||config.NODE_ENV==='production'))throw new Error('Demo AI fixture requires development demo mode');
  if(config.ASSISTANT_PROVIDER==='mock'&&(!config.DEMO_MODE||config.NODE_ENV==='production'))throw new Error('Assistant mock requires development demo mode; choose a provider or disabled');
  if(/cloud/i.test(config.OLLAMA_MODEL))throw new Error('Choose a locally installed Ollama model, not a cloud model');
  return config;
}
