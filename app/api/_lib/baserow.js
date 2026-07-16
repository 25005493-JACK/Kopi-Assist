export class BaserowConfigError extends Error {
  constructor(missingNames) {
    super(`Missing Baserow environment variable(s): ${missingNames.join(', ')}`);
    this.name = 'BaserowConfigError';
    this.status = 500;
  }
}

const TABLE_ENV_KEYS = {
  company: 'BASEROW_COMPANY_TABLE_ID',
  financial: 'BASEROW_FINANCIAL_TABLE_ID',
  menu: 'BASEROW_MENU_TABLE_ID',
};

function requiredEnv(name, missingNames) {
  const value = process.env[name]?.trim();
  if (!value) missingNames.push(name);
  return value;
}

export function getBaserowConfig(requiredTables = []) {
  const missingNames = [];
  const baseUrl = requiredEnv('BASEROW_BASE_URL', missingNames)?.replace(/\/+$/, '');
  const token = requiredEnv('BASEROW_API_TOKEN', missingNames);
  const tables = {};

  for (const tableName of requiredTables) {
    const envName = TABLE_ENV_KEYS[tableName];
    tables[tableName] = requiredEnv(envName, missingNames);
  }

  if (missingNames.length) {
    throw new BaserowConfigError(missingNames);
  }

  return { baseUrl, token, tables };
}

export function baserowHeaders(token, extraHeaders = {}) {
  return {
    Authorization: `Token ${token}`,
    ...extraHeaders,
  };
}

export function baserowRowsUrl(baseUrl, tableId, params = {}, rowId = '') {
  const rowPath = rowId ? `${rowId}/` : '';
  const url = new URL(`${baseUrl}/api/database/rows/table/${tableId}/${rowPath}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function readBaserowJson(response, action) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${action} failed (${response.status}): ${text || response.statusText}`);
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${action} returned invalid JSON`);
  }
}

export function baserowErrorResponse(error, NextResponse) {
  const status = error.status || 500;
  return NextResponse.json({ error: error.message }, { status });
}
