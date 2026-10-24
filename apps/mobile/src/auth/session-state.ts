import { ApiError } from '../api/errors';
// Only an explicit auth rejection invalidates local credentials. Transport/5xx errors do not.
export const sessionFailure = (error: unknown) => error instanceof ApiError && error.status === 401 ? 'expired' : 'connection';
