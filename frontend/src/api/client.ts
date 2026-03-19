export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'MEMBER';
  tenantId: string;
  tenantSlug: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  status: string;
  description?: string;
  priority: number;
  startDate?: string;
  targetDate?: string;
}

export interface BrainStatus {
  deepseek: {
    available: boolean;
    baseUrl: string;
    model: string;
    reasonerModel: string;
    timeoutMs: number;
  };
  embeddings: {
    configuredProvider: 'auto' | 'openai' | 'deterministic';
    effectiveProvider: 'openai' | 'deterministic';
    live: boolean;
    mode: 'deterministic' | 'openai';
    model?: string;
    baseUrl?: string;
    fallbackReason?: string;
  };
}

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

async function buildError(response: Response) {
  const text = await response.text();

  try {
    const payload = JSON.parse(text) as {
      message?: string | string[];
      error?: string;
    };
    const message = Array.isArray(payload.message)
      ? payload.message.join(', ')
      : payload.message ?? payload.error;

    return new Error(message || `Request failed: ${response.status}`);
  } catch {
    return new Error(text || `Request failed: ${response.status}`);
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  login(payload: { email: string; password: string; tenantSlug?: string }) {
    return request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  refresh(refreshToken: string) {
    return request<AuthSession>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
  me(token: string) {
    return request<SessionUser>('/auth/me', {}, token);
  },
  getCurrentTenant(token: string) {
    return request<{ id: string; name: string; brainName: string; language: string }>(
      '/tenants/current',
      {},
      token,
    );
  },
  listProjects(token: string) {
    return request<ProjectRecord[]>('/projects', {}, token);
  },
  createProject(
    token: string,
    payload: {
      name: string;
      description?: string;
      priority?: number;
      startDate?: string;
      targetDate?: string;
    },
  ) {
    return request<ProjectRecord>(
      '/projects',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  listCases(token: string) {
    return request<Array<{ id: string; title: string; category: string; impact?: number; lessons?: string }>>(
      '/cases',
      {},
      token,
    );
  },
  listDeadlines(token: string) {
    return request<
      Array<{ id: string; title: string; dueAt: string; priority: string; status: string; description?: string }>
    >('/deadlines', {}, token);
  },
  listCalendarWeek(token: string) {
    return request<Array<{ id: string; title: string; startAt: string; type: string }>>('/calendar/week', {}, token);
  },
  suggestWeek(token: string) {
    return request<{ recommendation: string }>('/calendar/suggest', { method: 'POST' }, token);
  },
  knowledgeSearch(token: string, query: string) {
    return request<Array<{ id: string; content: string; similarity?: number }>>(
      `/knowledge/search?query=${encodeURIComponent(query)}`,
      {},
      token,
    );
  },
  brainStatus(token: string) {
    return request<BrainStatus>('/brain/status', {}, token);
  },
  brainChat(
    token: string,
    payload: { message: string; history?: ChatMessage[]; useReasoner?: boolean },
  ) {
    return request<{
      content: string;
      memoriesUsed: number;
      model?: string;
      usedReasoner: boolean;
      embeddingMode: string;
    }>(
      '/brain/chat',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  listAdminTenants(token: string) {
    return request<
      Array<{
        id: string;
        name: string;
        plan: string;
        status: string;
        _count?: { cases: number; memories: number; users: number };
      }>
    >('/admin/tenants', {}, token);
  },
  getAdminAnalytics(token: string) {
    return request<{
      totalTenants: number;
      activeTenants: number;
      totalCases: number;
      casesThisMonth: number;
      totalAiRequests: number;
      avgResponseTime: number;
      topIndustries: string[];
    }>('/admin/analytics', {}, token);
  },
};