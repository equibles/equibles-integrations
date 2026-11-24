import type { ToolSpec } from './spec.js';

export const DEFAULT_BASE_URL = 'https://api.equibles.com';
export const API_KEY_ENV = 'EQUIBLES_API_KEY';
const DEFAULT_TIMEOUT_MS = 60_000;

/** A failed call: the API's own error message, or status 0 when the API could not be reached. */
export class EquiblesAPIError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'EquiblesAPIError';
    this.status = status;
    this.code = code;
  }
}

export interface EquiblesClientOptions {
  /** Defaults to the EQUIBLES_API_KEY environment variable. */
  apiKey?: string;
  baseUrl?: string;
  /** Per-request timeout in milliseconds (default 60 seconds). */
  timeoutMs?: number;
  /** A fetch implementation, for runtimes without a global fetch or for tests. */
  fetch?: typeof fetch;
}

export class EquiblesClient {
  private readonly key: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: EquiblesClientOptions = {}) {
    const key = (options.apiKey ?? readEnv(API_KEY_ENV) ?? '').trim();
    if (!key) {
      throw new Error(
        `An Equibles API key is required: pass apiKey or set ${API_KEY_ENV}. ` +
          'Get a free key at https://equibles.com/dashboard/apikeys.',
      );
    }
    // fetch rejects such a header value with an error that can quote it, key included.
    if (!/^[\x21-\x7e]+$/.test(key)) {
      throw new Error('The Equibles API key contains a space, control or non-ASCII character; copy it again.');
    }
    this.key = key;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new Error('No fetch implementation is available; pass one as the fetch option.');
    }
    this.fetchImpl = fetchImpl;
  }

  async call(spec: ToolSpec, args: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
    let path = spec.path;
    const pathParams = new Set<string>();
    for (const param of spec.params) {
      const placeholder = `{${param.name}}`;
      if (!path.includes(placeholder)) continue;
      pathParams.add(param.name);
      const value = args[param.name];
      if (value === undefined || value === null) {
        throw new EquiblesAPIError(400, `Missing required argument ${param.name}.`);
      }
      // Dot segments survive encoding and URL resolution removes them, moving the request to another route.
      if (['', '.', '..'].includes(String(value).trim())) {
        throw new EquiblesAPIError(400, `Invalid value for ${param.name}.`);
      }
      // Keep ":" for MIC:TICKER but encode "/", so a value always stays one path segment.
      path = path.replace(placeholder, encodeURIComponent(String(value)).replace(/%3A/gi, ':'));
    }

    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(args)) {
      if (value === undefined || value === null || pathParams.has(name)) continue;
      query.append(name, String(value));
    }
    const qs = query.toString();
    const url = new URL(path + (qs ? `?${qs}` : ''), this.baseUrl);

    const timeout = AbortSignal.timeout(this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers: {
          Authorization: `Bearer ${this.key}`,
          Accept: 'application/json',
          'User-Agent': '@equibles/ai-sdk',
        },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      // The error text can quote request headers, so only its name is passed on.
      const name = error instanceof Error ? error.name : 'Error';
      throw new EquiblesAPIError(0, `Could not reach the Equibles API (${name}).`);
    }

    if (!response.ok) throw await errorFrom(response);
    try {
      return await response.json();
    } catch {
      throw new EquiblesAPIError(response.status, 'The Equibles API returned a non-JSON answer.');
    }
  }
}

function readEnv(name: string): string | undefined {
  return typeof process === 'undefined' ? undefined : process.env?.[name];
}

async function errorFrom(response: Response): Promise<EquiblesAPIError> {
  const text = await response.text().catch(() => '');
  try {
    const error = (JSON.parse(text) as { error?: { message?: unknown; code?: unknown } })?.error;
    if (error && typeof error.message === 'string' && error.message) {
      return new EquiblesAPIError(
        response.status,
        error.message,
        typeof error.code === 'string' ? error.code : undefined,
      );
    }
  } catch {
    // Not JSON: fall through to the raw text.
  }
  return new EquiblesAPIError(response.status, text.slice(0, 500) || response.statusText);
}
