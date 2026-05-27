import { RouterOSClient } from 'mikro-routeros';

export interface MikrotikConfig {
  host: string;
  port?: number;
  user: string;
  password?: string;
  timeout?: number;
}

export interface PppoeSecret {
  id?: string;
  name: string;
  password?: string;
  service?: string;
  profile?: string;
  localAddress?: string;
  remoteAddress?: string;
  lastCaller?: string;
  lastDisconnectReason?: string;
  disabled?: string;
  comment?: string;
}

export interface ActiveConnection {
  id?: string;
  name: string;
  service?: string;
  callerId?: string;
  address?: string;
  uptime?: string;
  encoding?: string;
  sessionId?: string;
}

export interface PppProfile {
  id?: string;
  name: string;
  localAddress?: string;
  remoteAddress?: string;
  rateLimit?: string;
  dnsServer?: string;
  comment?: string;
}

/**
 * MikroTik RouterOS API Client
 *
 * Uses the binary API protocol (port 8728 by default) via mikro-routeros.
 * Compatible with RouterOS v6 and v7.
 */
export class MikrotikClient {
  private client: RouterOSClient;
  private config: MikrotikConfig;

  constructor(config: MikrotikConfig) {
    this.config = config;
    this.client = new RouterOSClient(
      config.host,
      config.port || 8728,
      config.timeout || 30000,
    );
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.client.login(this.config.user, this.config.password || '');
  }

  async close(): Promise<void> {
    try {
      await this.client.close();
    } catch {
      // Ignore close errors
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.client.runQuery('/system/resource/print');
      return Array.isArray(result) && result.length > 0;
    } catch (err) {
      return false;
    } finally {
      try { await this.close(); } catch {}
    }
  }

  async getPPPoESecrets(): Promise<PppoeSecret[]> {
    const result = await this.client.runQuery('/ppp/secret/print');
    const secrets: any[] = Array.isArray(result) ? result : [];
    return secrets.map((s: any) => ({
      id: s['.id'],
      name: s.name,
      password: s.password,
      service: s.service,
      profile: s.profile,
      localAddress: s['local-address'],
      remoteAddress: s['remote-address'],
      lastCaller: s['last-caller-id'] || s['last-caller'],
      lastDisconnectReason: s['last-disconnect-reason'],
      disabled: s.disabled,
      comment: s.comment,
    }));
  }

  async getActiveConnections(): Promise<ActiveConnection[]> {
    const result = await this.client.runQuery('/ppp/active/print');
    const active: any[] = Array.isArray(result) ? result : [];
    return active.map((a: any) => ({
      id: a['.id'],
      name: a.name,
      service: a.service,
      callerId: a['caller-id'],
      address: a.address,
      uptime: a.uptime,
      encoding: a.encoding,
      sessionId: a['session-id'],
    }));
  }

  async getProfiles(): Promise<PppProfile[]> {
    const result = await this.client.runQuery('/ppp/profile/print');
    const profiles: any[] = Array.isArray(result) ? result : [];
    return profiles.map((p: any) => ({
      id: p['.id'],
      name: p.name,
      localAddress: p['local-address'],
      remoteAddress: p['remote-address'],
      rateLimit: p['rate-limit'],
      dnsServer: p['dns-server'],
      comment: p.comment,
    }));
  }

  async addPPPoESecret(data: PppoeSecret): Promise<void> {
    const payload: any = {
      name: data.name,
      password: data.password || '',
      service: data.service || 'pppoe',
      profile: data.profile || 'default',
    };
    if (data.remoteAddress) payload['remote-address'] = data.remoteAddress;
    if (data.localAddress) payload['local-address'] = data.localAddress;
    if (data.comment) payload.comment = data.comment;

    await this.client.runQuery('/ppp/secret/add', payload);
  }

  async updatePPPoESecret(name: string, data: Partial<PppoeSecret>): Promise<void> {
    // Find the secret by name to get its .id
    const result = await this.client.runQuery('/ppp/secret/print', { name });
    const secrets: any[] = Array.isArray(result) ? result : [];
    if (secrets.length === 0) throw new Error(`PPPoE secret for ${name} not found`);

    const secretId = secrets[0]['.id'];
    const payload: any = { '.id': secretId };
    if (data.password !== undefined) payload.password = data.password;
    if (data.profile !== undefined) payload.profile = data.profile;
    if (data.remoteAddress !== undefined) payload['remote-address'] = data.remoteAddress;
    if (data.localAddress !== undefined) payload['local-address'] = data.localAddress;
    if (data.disabled !== undefined) payload.disabled = data.disabled;
    if (data.comment !== undefined) payload.comment = data.comment;

    await this.client.runQuery('/ppp/secret/set', payload);
  }

  async deletePPPoESecret(name: string): Promise<void> {
    const result = await this.client.runQuery('/ppp/secret/print', { name });
    const secrets: any[] = Array.isArray(result) ? result : [];
    if (secrets.length === 0) return; // Already deleted

    const secretId = secrets[0]['.id'];
    await this.client.runQuery('/ppp/secret/remove', { '.id': secretId });
  }

  async disconnectUser(name: string): Promise<boolean> {
    const result = await this.client.runQuery('/ppp/active/print', { name });
    const active: any[] = Array.isArray(result) ? result : [];
    if (active.length === 0) return false;

    const activeId = active[0]['.id'];
    await this.client.runQuery('/ppp/active/remove', { '.id': activeId });
    return true;
  }
}
