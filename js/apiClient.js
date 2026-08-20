'use strict';

/**
 * StudyGen AI — Standardized HTTP API Client
 *
 * Encapsulates all backend REST API requests using standard fetch().
 * Security & Rules:
 *   - Enforces `{ credentials: 'include' }` for HttpOnly cookie authentication.
 *   - Sets `Content-Type: application/json` for JSON bodies automatically.
 *   - Does NOT set Content-Type for FormData uploads (browser handles multipart boundary).
 *   - Parses standard response envelope: { success, message, data, error }.
 *   - NEVER reads, writes, or stores JWT tokens in JS or browser storage.
 */

const ApiClient = (() => {
  // Dynamically resolve backend API origin: use localhost:5000 ONLY when on local dev servers
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const port = typeof window !== 'undefined' ? window.location.port : '5000';

  const isFileProtocol = protocol === 'file:';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '';
  const isDevPort = isLocalhost && port !== '5000';

  const BASE_URL = (isFileProtocol || isDevPort || (isLocalhost && port === '5000')) 
    ? `http://${hostname || 'localhost'}:5000/api` 
    : '/api';

  /**
   * Helper to handle response parsing and standardized errors.
   */
  async function handleResponse(response) {
    let result;
    try {
      result = await response.json();
    } catch {
      result = {
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: `Server returned non-JSON response (${response.status})`,
        },
      };
    }

    if (!response.ok || result.success === false) {
      const errorObj = result.error || {
        code: 'HTTP_ERROR',
        message: result.message || `Request failed with status ${response.status}`,
      };

      // Create typed error object
      const error = new Error(errorObj.message || 'API request failed');
      error.status = response.status;
      error.code = errorObj.code || 'API_ERROR';
      error.errors = result.errors || null;
      throw error;
    }

    return result;
  }

  /**
   * GET request wrapper
   */
  async function get(endpoint, params = null) {
    let url = `${BASE_URL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, val);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    return handleResponse(response);
  }

  /**
   * POST request wrapper (JSON body)
   */
  async function post(endpoint, data = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return handleResponse(response);
  }

  /**
   * PUT request wrapper (JSON body)
   */
  async function put(endpoint, data = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return handleResponse(response);
  }

  /**
   * DELETE request wrapper
   */
  async function del(endpoint) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    return handleResponse(response);
  }

  /**
   * Multipart File Upload wrapper (FormData payload)
   * MUST NOT manually set Content-Type header so browser sets multipart boundary correctly!
   */
  async function uploadFile(endpoint, formData) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        // Content-Type intentionally OMITTED for FormData
      },
      credentials: 'include',
      body: formData,
    });

    return handleResponse(response);
  }

  return {
    get,
    post,
    put,
    delete: del,
    uploadFile,
    BASE_URL,
  };
})();

// Export globally for browser window
window.ApiClient = ApiClient;
