

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://crm-api.vasifytech.com/api";

interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  errors?: Array<{ msg: string; param: string }>;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── Auth token management ────────────────────────────────────────────────────

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("auth_token");
    authToken = stored;
    return stored;
  }
  return authToken;
};

export const isAuthenticated = () => !!getAuthToken();

// ─── API request wrapper ──────────────────────────────────────────────────────

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();

  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      console.error("API Error Status:", response.status);
      console.error("API Error Data:", JSON.stringify(errorData, null, 2));

      if (errorData.errors && Array.isArray(errorData.errors)) {
        const validationErrors = errorData.errors
          .map((e: any) => `${e.param}: ${e.msg}`)
          .join(", ");
        throw new Error(`Validation failed: ${validationErrors}`);
      }

      throw new Error(
        errorData.error || errorData.message || `HTTP ${response.status}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("API Request Error:", error);
    throw error;
  }
}

// ─── Helper: build query string from params object ────────────────────────────
// Shared by all getAll() methods — skips undefined / null / empty string values

function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      sp.append(key, String(value));
    }
  });
  const q = sp.toString();
  return q ? `?${q}` : "";
}

// ─── Helper: check if error is a 404 / route not found ───────────────────────

function is404(err: any): boolean {
  return (
    err?.message?.includes("404") ||
    err?.message?.includes("Route not found") ||
    err?.message?.includes("HTTP 404")
  );
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiRequest<{
      token: string;
      user: any;
      message: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (response.token) setAuthToken(response.token);
    return response;
  },

  register: async (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) => {
    const response = await apiRequest<{
      token: string;
      user: any;
      message: string;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    if (response.token) setAuthToken(response.token);
    return response;
  },

  getProfile: async () => apiRequest<{ user: any }>("/auth/profile"),

  updateProfile: async (userData: any) =>
    apiRequest<{ user: any; message: string }>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(userData),
    }),

  changePassword: async (currentPassword: string, newPassword: string) =>
    apiRequest<{ message: string }>("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  logout: () => setAuthToken(null),

  verifyToken: async () =>
    apiRequest<{ valid: boolean; user: any }>("/auth/verify"),
};

// ─── Customers API ────────────────────────────────────────────────────────────

export const customersApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    assignedTo?: string;
  }) =>
    apiRequest<{ customers: any[]; pagination: any }>(
      `/customers${buildQuery(params)}`,
    ),

  getById: async (id: string) =>
    apiRequest<{ customer: any; related: any }>(`/customers/${id}`),

  create: async (customerData: any) =>
    apiRequest<{ customer: any; message: string }>("/customers", {
      method: "POST",
      body: JSON.stringify(customerData),
    }),

  update: async (id: string, customerData: any) =>
    apiRequest<{ customer: any; message: string }>(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(customerData),
    }),

  delete: async (id: string) =>
    apiRequest<{ message: string }>(`/customers/${id}`, {
      method: "DELETE",
    }),

  moveToLead: async (id: string) =>
    apiRequest<{ message: string; leadId: string }>(
      `/customers/${id}/move-to-lead`,
      { method: "POST", body: JSON.stringify({}) },
    ),
};

// ─── Retainers API ────────────────────────────────────────────────────────────
// SOW §2.5: WhatsApp API / Monthly Retainer Management
// SOW §2.6: Monthly Retainer Tracking (payments sub-resource)
//
// Backend endpoints expected:
//   GET    /retainers                      → { retainers[], pagination }
//   GET    /retainers/:id                  → { retainer }
//   POST   /retainers                      → { retainer, message }
//   PUT    /retainers/:id                  → { retainer, message }
//   DELETE /retainers/:id                  → { message }
//   POST   /retainers/:id/renew            → { retainer, message }
//   GET    /retainers/:id/payments         → { payments[] }
//   POST   /retainer-payments              → { payment, message }
//   PUT    /retainer-payments/:id          → { payment, message }
//   DELETE /retainer-payments/:id          → { message }
//   GET    /retainers/stats/overview       → { activeCount, mrr, ... }

export const retainersApi = {
  // ── Retainer CRUD ──────────────────────────────────────────────────────────

  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;        // active | inactive | expired
    service?: string;
    renewalDue?: string;    // this-week | this-month | expired | upcoming
    dateSort?: string;      // soonest | latest | amount-high | amount-low | newest
  }): Promise<{ retainers: any[]; pagination: any }> => {
    try {
      return await apiRequest<{ retainers: any[]; pagination: any }>(
        `/retainers${buildQuery(params)}`,
      );
    } catch (err: any) {
      if (is404(err)) {
        console.warn("[retainersApi.getAll] /api/retainers not registered yet — returning empty list");
        return { retainers: [], pagination: {} };
      }
      throw err;
    }
  },

  getById: async (id: string): Promise<{ retainer: any }> =>
    apiRequest<{ retainer: any }>(`/retainers/${id}`),

  create: async (data: any): Promise<{ retainer: any; message: string }> =>
    apiRequest<{ retainer: any; message: string }>("/retainers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: async (
    id: string,
    data: any,
  ): Promise<{ retainer: any; message: string }> =>
    apiRequest<{ retainer: any; message: string }>(`/retainers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: async (id: string): Promise<{ message: string }> =>
    apiRequest<{ message: string }>(`/retainers/${id}`, {
      method: "DELETE",
    }),

  // ── Renewal action ─────────────────────────────────────────────────────────
  // Sets a new renewal date, marks status as "active",
  // and writes a row to retainer_renewal_log on the backend.

  renew: async (
    id: string,
    renewalDate: string,
  ): Promise<{ retainer: any; message: string }> =>
    apiRequest<{ retainer: any; message: string }>(`/retainers/${id}/renew`, {
      method: "POST",
      body: JSON.stringify({ renewalDate }),
    }),

  // ── Monthly Payments sub-resource (SOW §2.6) ───────────────────────────────

  getPayments: async (
    retainerId: string,
    params?: { month?: string },   // e.g. month=2026-05-01
  ): Promise<{ payments: any[] }> => {
    try {
      return await apiRequest<{ payments: any[] }>(
        `/retainers/${retainerId}/payments${buildQuery(params)}`,
      );
    } catch (err: any) {
      if (is404(err)) {
        console.warn("[retainersApi.getPayments] Route not registered yet — returning empty list");
        return { payments: [] };
      }
      throw err;
    }
  },

  createPayment: async (
    data: any,
  ): Promise<{ payment: any; message: string }> =>
    apiRequest<{ payment: any; message: string }>("/retainer-payments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePayment: async (
    id: string,
    data: any,
  ): Promise<{ payment: any; message: string }> =>
    apiRequest<{ payment: any; message: string }>(`/retainer-payments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletePayment: async (id: string): Promise<{ message: string }> =>
    apiRequest<{ message: string }>(`/retainer-payments/${id}`, {
      method: "DELETE",
    }),

  // ── Stats (for dashboard widget) ──────────────────────────────────────────

  getStats: async (): Promise<{
    activeCount: number;
    mrr: number;
    expiringSoon: number;
    expired: number;
  }> => {
    try {
      return await apiRequest<{
        activeCount: number;
        mrr: number;
        expiringSoon: number;
        expired: number;
      }>("/retainers/stats/overview");
    } catch {
      // Non-critical — dashboard computes stats client-side if this fails
      return { activeCount: 0, mrr: 0, expiringSoon: 0, expired: 0 };
    }
  },
};

// ─── Leads API ────────────────────────────────────────────────────────────────
//
// NOTE: updateSalesForm has been REMOVED. The crm-context now sends
// sales_form_data and next_action directly via leadsApi.update() using
// snake_case keys that the backend already accepts in PUT /leads/:id.
// This eliminates the "No fields to update" error that occurred when the
// old code sent the camelCase alias `salesFormData`.

export const leadsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    source?: string;
    assignedTo?: string;
    service?: string;
    createdBy?: string;
    followUpDue?: string;
    nextAction?: string;
    next_action?: string;
    phone?: string;
    dateSort?: string;
  }) =>
    apiRequest<{ leads: any[]; pagination: any }>(
      `/leads${buildQuery(params)}`,
    ),

  getById: async (id: string) =>
    apiRequest<{ lead: any; related: any }>(`/leads/${id}`),

  create: async (leadData: any) =>
    apiRequest<{ lead: any; message: string }>("/leads", {
      method: "POST",
      body: JSON.stringify(leadData),
    }),

  // Standard update — accepts ANY snake_case or camelCase fields.
  // The backend's leadFieldMap maps both aliases.
  update: async (id: string, leadData: any) =>
    apiRequest<{ lead: any; message: string }>(`/leads/${id}`, {
      method: "PUT",
      body: JSON.stringify(leadData),
    }),

  delete: async (id: string) =>
    apiRequest<{ message: string }>(`/leads/${id}`, {
      method: "DELETE",
    }),

  convertToCustomer: async (id: string, customerData?: any) =>
    apiRequest<{ customer: any; message: string }>(`/leads/${id}/convert`, {
      method: "POST",
      body: JSON.stringify({ customerData }),
    }),

  // ── Follow-up management ──────────────────────────────────────────────────

  scheduleFollowUp: async (
    leadId: string,
    followUpDate: string,
    followUpTime?: string,
    notes?: string,
  ) => {
    try {
      return await apiRequest<{ message: string; followUpDate: string }>(
        `/leads/${leadId}/follow-up`,
        {
          method: "PUT",
          body: JSON.stringify({ followUpDate, followUpNotes: notes }),
        },
      );
    } catch {
      return await apiRequest<{ lead: any; message: string }>(
        `/leads/${leadId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            followUpDate,
            ...(followUpTime ? { followUpTime } : {}),
            ...(notes ? { notes } : {}),
          }),
        },
      );
    }
  },

  getFollowUps: async (leadId: string) =>
    apiRequest<{ followUps: any[] }>(`/leads/${leadId}/follow-ups`),

  addFollowUp: async (
    leadId: string,
    data: { followUpDate: string; followUpTime?: string; notes?: string },
  ) =>
    apiRequest<{ followUp: any; message: string }>(
      `/leads/${leadId}/follow-ups`,
      { method: "POST", body: JSON.stringify(data) },
    ),

  updateFollowUp: async (
    leadId: string,
    followUpId: string,
    data: {
      followUpDate?: string;
      followUpTime?: string;
      notes?: string;
      completed?: boolean;
    },
  ) =>
    apiRequest<{ followUp: any; message: string }>(
      `/leads/${leadId}/follow-ups/${followUpId}`,
      { method: "PATCH", body: JSON.stringify(data) },
    ),

  deleteFollowUp: async (leadId: string, followUpId: string) =>
    apiRequest<{ message: string }>(
      `/leads/${leadId}/follow-ups/${followUpId}`,
      { method: "DELETE" },
    ),
};

// ─── Deals API ────────────────────────────────────────────────────────────────

export const dealsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    stage?: string;
    customerId?: string;
    assignedTo?: string;
    minValue?: number;
    maxValue?: number;
  }) =>
    apiRequest<{ deals: any[]; pagination: any }>(
      `/deals${buildQuery(params)}`,
    ),

  getById: async (id: string) =>
    apiRequest<{ deal: any; related: any }>(`/deals/${id}`),

  create: async (dealData: any) =>
    apiRequest<{ deal: any; message: string }>("/deals", {
      method: "POST",
      body: JSON.stringify(dealData),
    }),

  update: async (id: string, dealData: any) =>
    apiRequest<{ deal: any; message: string }>(`/deals/${id}`, {
      method: "PUT",
      body: JSON.stringify(dealData),
    }),

  delete: async (id: string) =>
    apiRequest<{ message: string }>(`/deals/${id}`, { method: "DELETE" }),

  getPipelineSummary: async () =>
    apiRequest<{ pipeline: any[]; closed: any[] }>("/deals/pipeline/summary"),
};

// ─── Tasks API ────────────────────────────────────────────────────────────────

export const tasksApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    priority?: string;
    status?: string;
    assignedTo?: string;
    relatedType?: string;
    relatedId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
  }) =>
    apiRequest<{ tasks: any[]; pagination: any }>(
      `/tasks${buildQuery(params)}`,
    ),

  getById: async (id: string) => apiRequest<{ task: any }>(`/tasks/${id}`),

  create: async (taskData: any) =>
    apiRequest<{ task: any; message: string }>("/tasks", {
      method: "POST",
      body: JSON.stringify(taskData),
    }),

  update: async (id: string, taskData: any) =>
    apiRequest<{ task: any; message: string }>(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(taskData),
    }),

  delete: async (id: string) =>
    apiRequest<{ message: string }>(`/tasks/${id}`, { method: "DELETE" }),

  getStats: async (assignedTo?: string) => {
    const query = assignedTo ? `?assignedTo=${assignedTo}` : "";
    return apiRequest<{
      statusBreakdown: any[];
      overdue: number;
      dueToday: number;
    }>(`/tasks/stats/overview${query}`);
  },
};

// ─── Invoices API ─────────────────────────────────────────────────────────────

export const invoicesApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
  }) =>
    apiRequest<{ invoices: any[]; pagination: any }>(
      `/invoices${buildQuery(params)}`,
    ),

  getById: async (id: string) =>
    apiRequest<{ invoice: any }>(`/invoices/${id}`),

  create: async (invoiceData: any) =>
    apiRequest<{ invoice: any; message: string }>("/invoices", {
      method: "POST",
      body: JSON.stringify(invoiceData),
    }),

  update: async (id: string, invoiceData: any) =>
    apiRequest<{ invoice: any; message: string }>(`/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(invoiceData),
    }),

  delete: async (id: string) =>
    apiRequest<{ message: string }>(`/invoices/${id}`, { method: "DELETE" }),

  getStats: async () =>
    apiRequest<{
      statusBreakdown: any[];
      monthlyTrend: any[];
      overdue: { count: number; total_amount: number };
    }>("/invoices/stats/overview"),
};

// ─── Renewals API ─────────────────────────────────────────────────────────────
// Graceful fallbacks: if routes are not yet registered, returns empty arrays
// instead of crashing the app.

export const renewalsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerId?: string;
    expiryDateFrom?: string;
    expiryDateTo?: string;
  }): Promise<{ renewals: any[]; pagination: any }> => {
    try {
      return await apiRequest<{ renewals: any[]; pagination: any }>(
        `/renewals${buildQuery(params)}`,
      );
    } catch (err: any) {
      if (is404(err)) {
        console.warn("[renewalsApi.getAll] /api/renewals route not found — returning empty list");
        return { renewals: [], pagination: {} };
      }
      throw err;
    }
  },

  getById: async (id: string) =>
    apiRequest<{ renewal: any }>(`/renewals/${id}`),

  create: async (renewalData: any) =>
    apiRequest<{ renewal: any; message: string }>("/renewals", {
      method: "POST",
      body: JSON.stringify(renewalData),
    }),

  update: async (id: string, renewalData: any) =>
    apiRequest<{ renewal: any; message: string }>(`/renewals/${id}`, {
      method: "PUT",
      body: JSON.stringify(renewalData),
    }),

  delete: async (id: string) =>
    apiRequest<{ message: string }>(`/renewals/${id}`, { method: "DELETE" }),

  getReminders: async (): Promise<{ reminders: any[] }> => {
    try {
      return await apiRequest<{ reminders: any[] }>("/renewals/reminders/list");
    } catch (err: any) {
      if (is404(err)) {
        console.warn("[renewalsApi.getReminders] Route not found — returning empty list");
        return { reminders: [] };
      }
      throw err;
    }
  },

  createReminder: async (reminderData: any) =>
    apiRequest<{ reminder: any; message: string }>("/renewals/reminders", {
      method: "POST",
      body: JSON.stringify(reminderData),
    }),

  getStats: async () =>
    apiRequest<{
      statusBreakdown: any[];
      expiryBreakdown: any[];
      monthlyRevenue: any[];
    }>("/renewals/stats/overview"),
};