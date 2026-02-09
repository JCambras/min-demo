import { cookies } from "next/headers";
import * as crypto from "crypto";

// ─── Config ──────────────────────────────────────────────────────────────────

const COOKIE_NAME = "min_sf_connection";
const ENCRYPTION_KEY = process.env.SF_COOKIE_SECRET || (() => {
  if (process.env.NODE_ENV === "production") throw new Error("SF_COOKIE_SECRET must be set in production");
  return "min-demo-dev-key-change-in-prod!!";
})();

// OAuth app config — these are for YOUR Connected App in Salesforce
// In production, each customer would use their own Connected App or you'd use a managed package
const OAUTH_CLIENT_ID = process.env.SF_OAUTH_CLIENT_ID || process.env.SALESFORCE_CLIENT_ID || "";
const OAUTH_CLIENT_SECRET = process.env.SF_OAUTH_CLIENT_SECRET || process.env.SALESFORCE_CLIENT_SECRET || "";
const OAUTH_REDIRECT_URI = process.env.SF_OAUTH_REDIRECT_URI || "http://localhost:3000/api/salesforce/callback";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SFConnection {
  accessToken: string;
  refreshToken?: string;
  instanceUrl: string;
  orgId?: string;
  userName?: string;
  connectedAt: string;      // ISO timestamp
  expiresAt?: string;       // ISO timestamp
  source: "oauth" | "env";  // How this connection was established
}

export interface SFConnectionStatus {
  connected: boolean;
  instanceUrl?: string;
  userName?: string;
  orgId?: string;
  connectedAt?: string;
  source?: "oauth" | "env";
}

// ─── Encryption ──────────────────────────────────────────────────────────────

function deriveKey(secret: string): Buffer {
  return crypto.scryptSync(secret, "min-sf-salt", 32);
}

function encrypt(text: string): string {
  const key = deriveKey(ENCRYPTION_KEY);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(data: string): string {
  const [ivHex, tagHex, encHex] = data.split(":");
  const key = deriveKey(ENCRYPTION_KEY);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(encHex, "hex"), undefined, "utf8") + decipher.final("utf8");
}

// ─── Cookie Storage ──────────────────────────────────────────────────────────

export async function storeConnection(conn: SFConnection): Promise<void> {
  const encrypted = encrypt(JSON.stringify(conn));
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  });
}

export async function getStoredConnection(): Promise<SFConnection | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  try {
    return JSON.parse(decrypt(cookie.value)) as SFConnection;
  } catch {
    // Cookie corrupted or key changed — clear it
    cookieStore.delete(COOKIE_NAME);
    return null;
  }
}

export async function clearConnection(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ─── Token Resolution ────────────────────────────────────────────────────────
// This is the key function: tries OAuth cookie first, falls back to .env.local.
// All existing handlers call getAccessToken() — this is the ONLY function that changes.

export async function getAccessToken(): Promise<{ accessToken: string; instanceUrl: string }> {
  // 1. Try stored OAuth connection
  const stored = await getStoredConnection();
  if (stored) {
    // Check if we need to refresh (tokens expire ~2 hours)
    if (stored.expiresAt && new Date(stored.expiresAt) < new Date()) {
      if (stored.refreshToken) {
        try {
          return await refreshAccessToken(stored);
        } catch {
          // Refresh failed — fall through to env
        }
      }
    } else {
      return { accessToken: stored.accessToken, instanceUrl: stored.instanceUrl };
    }
  }

  // 2. Fallback to .env.local (client_credentials flow — current behavior)
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || "";

  if (!clientId || !clientSecret || !instanceUrl) {
    throw new Error("No Salesforce connection. Connect via Settings or configure .env.local");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  const response = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Token error:", data);
    throw new Error(data.error_description || "Failed to get access token");
  }

  return { accessToken: data.access_token, instanceUrl: data.instance_url };
}

// ─── OAuth Refresh ───────────────────────────────────────────────────────────

async function refreshAccessToken(conn: SFConnection): Promise<{ accessToken: string; instanceUrl: string }> {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", conn.refreshToken!);
  params.append("client_id", OAUTH_CLIENT_ID);
  params.append("client_secret", OAUTH_CLIENT_SECRET);

  const response = await fetch(`${conn.instanceUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || "Token refresh failed");
  }

  // Store updated tokens
  const updated: SFConnection = {
    ...conn,
    accessToken: data.access_token,
    instanceUrl: data.instance_url || conn.instanceUrl,
    expiresAt: new Date(Date.now() + 7200 * 1000).toISOString(), // ~2 hours
  };
  await storeConnection(updated);

  return { accessToken: updated.accessToken, instanceUrl: updated.instanceUrl };
}

// ─── OAuth URL Builder ───────────────────────────────────────────────────────

export function buildAuthUrl(sfDomain: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    scope: "api refresh_token",
    prompt: "consent",
  });
  // Normalize domain — user might enter "myorg.my.salesforce.com" or "https://myorg.my.salesforce.com"
  const base = sfDomain.startsWith("http") ? sfDomain : `https://${sfDomain}`;
  return `${base}/services/oauth2/authorize?${params.toString()}`;
}

// ─── OAuth Token Exchange ────────────────────────────────────────────────────

export async function exchangeCodeForTokens(code: string, sfDomain: string): Promise<SFConnection> {
  const base = sfDomain.startsWith("http") ? sfDomain : `https://${sfDomain}`;
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: OAUTH_CLIENT_ID,
    client_secret: OAUTH_CLIENT_SECRET,
    redirect_uri: OAUTH_REDIRECT_URI,
  });

  const response = await fetch(`${base}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || "Token exchange failed");
  }

  // Get user info for display
  let userName = "";
  let orgId = "";
  try {
    const idRes = await fetch(data.id, { headers: { Authorization: `Bearer ${data.access_token}` } });
    const idData = await idRes.json();
    userName = idData.display_name || idData.username || "";
    orgId = idData.organization_id || "";
  } catch { /* non-critical */ }

  const conn: SFConnection = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    instanceUrl: data.instance_url,
    orgId,
    userName,
    connectedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7200 * 1000).toISOString(),
    source: "oauth",
  };

  await storeConnection(conn);
  return conn;
}

// ─── Connection Status ───────────────────────────────────────────────────────

export async function getConnectionStatus(): Promise<SFConnectionStatus> {
  // Check OAuth first
  const stored = await getStoredConnection();
  if (stored) {
    return {
      connected: true,
      instanceUrl: stored.instanceUrl,
      userName: stored.userName,
      orgId: stored.orgId,
      connectedAt: stored.connectedAt,
      source: stored.source,
    };
  }

  // Check env fallback
  const hasEnv = !!(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET && process.env.SALESFORCE_INSTANCE_URL);
  if (hasEnv) {
    return {
      connected: true,
      instanceUrl: process.env.SALESFORCE_INSTANCE_URL,
      source: "env",
    };
  }

  return { connected: false };
}
