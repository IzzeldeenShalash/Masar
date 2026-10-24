import { z } from 'zod';
export * from './resident';

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const passwordSchema = z.string().min(12).max(128);
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).strict();
export const signupSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
}).strict();
export const signupFormSchema = signupSchema.extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords must match' });
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type SignupFormInput = z.infer<typeof signupFormSchema>;
export type Role = 'USER' | 'AGENCY';
export const demoAccounts = { user: 'user@demo.com', agency: 'agency@demo.com', password: 'MasarDemo!2026' } as const;
const agencyDtoSchema = z.object({ id: z.string(), name: z.string(), nameAr: z.string() });
export const selectAgencySchema = z.object({ agencyId: z.string().regex(/^[a-f\d]{24}$/i) }).strict();
export const accountSchema = z.object({
  id: z.string(), displayName: z.string(), email: z.string(), role: z.enum(['USER', 'AGENCY']),
  agency: agencyDtoSchema.nullable(),
  agencies: z.array(agencyDtoSchema),
});
export type Account = z.infer<typeof accountSchema>;
export type AuthResponse = { user: Account; csrfToken: string; token?: string };
export type HealthResponse = { status: 'ok'; demoMode: boolean };
export type ApiErrorCode = 'VALIDATION' | 'INVALID_CREDENTIALS' | 'SIGNUP_UNAVAILABLE' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'CSRF' | 'RATE_LIMITED' | 'INTERNAL' | 'UNAVAILABLE';
export type ApiErrorResponse = { error: { code: ApiErrorCode; message: string } };

export * from './alerts';

export * from './ai';
export * from './stage8';
