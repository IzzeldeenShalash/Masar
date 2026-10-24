import type { Express } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
type Place = { label: string; latitude: number; longitude: number };
const cache = new Map<string, { at: number; places: Place[] }>();
let upstreamBusy = false;
let lastRequest = 0;
export function registerPlaceSearch(app: Express, baseUrl: string, prefix='/resident') {
  app.get(prefix+'/places', rateLimit({ windowMs: 60000, limit: 12, standardHeaders: true, legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Please wait before searching again.' } } }), async (req, res) => {
    const query = z.string().trim().min(2).max(120).safeParse(req.query.q);
    if (!query.success) return res.status(400).json({ error: { code: 'VALIDATION', message: 'Enter a place name.' } });
    const key = query.data.toLowerCase();
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < 86400000) return res.json(cached.places);
    if (upstreamBusy || Date.now() - lastRequest < 1100) return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Please wait a moment.' } });
    upstreamBusy = true; lastRequest = Date.now();
    try {
      const url = new URL('/api/', baseUrl);
      url.search = new URLSearchParams({ q: query.data, bbox: '34.8,29,39.4,33.5', limit: '10' }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { 'User-Agent': 'MasarHackathon/0.2 (Jordan civic reporting demo)', Accept: 'application/json' } });
      if (!response.ok) throw new Error('Provider unavailable');
      const body: unknown = await response.json();
      const schema = z.object({ features: z.array(z.object({ geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }), properties: z.object({ name: z.string().optional(), city: z.string().optional(), district: z.string().optional(), state: z.string().optional(), country: z.string().optional(), countrycode: z.string().optional(), street: z.string().optional() }) })) });
      const parsed = schema.parse(body);
      const places = parsed.features.filter(f => f.properties.countrycode?.toUpperCase() === 'JO').map(f => ({ label: [...new Set([f.properties.name, f.properties.street, f.properties.city, f.properties.district, f.properties.state, f.properties.country].filter(Boolean))].join(', ').slice(0, 240), latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] })).filter(p => p.label && p.latitude >= 29 && p.latitude <= 33.5 && p.longitude >= 34.8 && p.longitude <= 39.4);
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      cache.set(key, { at: Date.now(), places });
      return res.json(places);
    } catch { return res.status(503).json({ error: { code: 'UNAVAILABLE', message: 'Place search unavailable. You can still select a location on the map.' } }); }
    finally { upstreamBusy = false; }
  });
}
