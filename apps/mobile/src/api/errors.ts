import type { ApiErrorCode } from '@masar/shared';
export class ApiError extends Error {
  constructor(public code: ApiErrorCode | 'NETWORK', public status = 0, detail?:string) { super(detail || (code==='NETWORK'?'Cannot reach Masar. Check the laptop server and Wi-Fi.':code==='RATE_LIMITED'?'Too many requests. Wait a moment and retry.':code)); }
}
