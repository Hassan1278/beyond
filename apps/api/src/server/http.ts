import { randomUUID } from 'node:crypto';
import type { ApiError, ApiErrorCode } from '@beyond/shared';

const safeErrors = {
  bad_request: { status: 400, message: 'Invalid request.' },
  unauthorized: { status: 401, message: 'Authentication required.' },
  forbidden: { status: 403, message: 'Access denied.' },
  not_found: { status: 404, message: 'Resource not found.' },
  conflict: { status: 409, message: 'Request conflicts with the current state.' },
  rate_limited: { status: 429, message: 'Too many requests.' },
  not_ready: { status: 503, message: 'Service is not ready.' },
  internal_error: { status: 500, message: 'An internal error occurred.' },
} as const satisfies Record<ApiErrorCode, { status: number; message: string }>;

function responseHeaders(requestId: string): HeadersInit {
  return {
    'Cache-Control': 'no-store',
    'X-Request-Id': requestId,
  };
}

export function dataResponse<T>(data: T): Response {
  const requestId = randomUUID();
  return Response.json({ data }, { status: 200, headers: responseHeaders(requestId) });
}

export function errorResponse(code: ApiErrorCode): Response {
  const requestId = randomUUID();
  const { status, message } = safeErrors[code];
  const body: ApiError = { error: { code, message, request_id: requestId } };
  return Response.json(body, { status, headers: responseHeaders(requestId) });
}
