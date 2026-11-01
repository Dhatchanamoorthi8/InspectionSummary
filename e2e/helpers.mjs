// helpers.mjs
// Test harness, assertion library, HTTP client, and server lifecycle manager

import { createReferenceServer } from './mock-oracle.mjs';

let activeBaseUrl = process.env.BASE_URL || null;
let managedServer = null;

/**
 * Initializes and resolves the target API base URL.
 * Automatically detects whether an external server is running, or boots the reference oracle.
 */
export async function setupTestEnvironment(preferredUrl = null) {
  if (preferredUrl) {
    activeBaseUrl = preferredUrl;
    return activeBaseUrl;
  }
  if (process.env.BASE_URL) {
    activeBaseUrl = process.env.BASE_URL;
    return activeBaseUrl;
  }

  // Probe localhost:3000
  try {
    const res = await fetch('http://localhost:3000/api/health', { method: 'GET', signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      activeBaseUrl = 'http://localhost:3000';
      return activeBaseUrl;
    }
  } catch {
    // Port 3000 not reachable; boot in-process reference oracle
  }

  if (!managedServer) {
    managedServer = createReferenceServer();
    await new Promise((resolve) => {
      managedServer.listen(0, '127.0.0.1', () => {
        const address = managedServer.address();
        activeBaseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  }

  return activeBaseUrl;
}

export async function teardownTestEnvironment() {
  if (managedServer) {
    await new Promise((resolve) => managedServer.close(resolve));
    managedServer = null;
  }
}

export function getBaseUrl() {
  return activeBaseUrl;
}

/**
 * Robust HTTP client executing opaque-box REST requests.
 */
export async function api(endpoint, options = {}, token = null) {
  const base = getBaseUrl();
  if (!base) throw new Error('Test environment not initialized. Call setupTestEnvironment() first.');

  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  let rawText = '';

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    rawText = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
    rawText,
    ok: response.ok,
  };
}

// Token cache to avoid repetitive login overhead
const tokenCache = new Map();

export async function loginAs(username, password = 'Password123!') {
  const cacheKey = `${username}:${password}`;
  if (tokenCache.has(cacheKey)) {
    return tokenCache.get(cacheKey);
  }

  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });

  if (res.status !== 200 || !res.data?.token) {
    throw new Error(`Failed to login as ${username}: HTTP ${res.status} ${JSON.stringify(res.data)}`);
  }

  tokenCache.set(cacheKey, res.data.token);
  return res.data.token;
}

export function clearTokenCache() {
  tokenCache.clear();
}

// --- Assertion Utilities ---
export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message ? message + ' ' : ''}Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
  }
}

export function assertNotEqual(actual, expected, message = '') {
  if (actual === expected) {
    throw new Error(`${message ? message + ' ' : ''}Expected value NOT to equal ${JSON.stringify(expected)}`);
  }
}

export function assertTrue(actual, message = '') {
  if (actual !== true) {
    throw new Error(`${message ? message + ' ' : ''}Expected true, but got ${JSON.stringify(actual)}`);
  }
}

export function assertFalse(actual, message = '') {
  if (actual !== false) {
    throw new Error(`${message ? message + ' ' : ''}Expected false, but got ${JSON.stringify(actual)}`);
  }
}

export function assertIncludes(haystack, needle, message = '') {
  if (typeof haystack === 'string') {
    if (!haystack.includes(needle)) {
      throw new Error(`${message ? message + ' ' : ''}String does not contain "${needle}". Text: ${haystack}`);
    }
  } else if (Array.isArray(haystack)) {
    if (!haystack.some((item) => (typeof item === 'object' ? JSON.stringify(item).includes(String(needle)) : item === needle))) {
      throw new Error(`${message ? message + ' ' : ''}Array does not contain ${JSON.stringify(needle)}`);
    }
  } else {
    throw new Error(`assertIncludes called on non-string, non-array target`);
  }
}

export function assertStatus(res, expectedStatus, context = '') {
  if (res.status !== expectedStatus) {
    const detail = res.data ? JSON.stringify(res.data) : res.rawText;
    throw new Error(`Expected HTTP ${expectedStatus} but received HTTP ${res.status} ${context ? `(${context})` : ''}. Body: ${detail}`);
  }
}
