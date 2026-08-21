const BASE = "/api/retainers";

export const retainerService = {
  getAll:  (params?: Record<string, unknown>) =>
    fetch(`${BASE}?${new URLSearchParams(params as any)}`).then(r => r.json()),

  getById: (id: string) =>
    fetch(`${BASE}/${id}`).then(r => r.json()),

  create:  (data: unknown) =>
    fetch(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),

  update:  (id: string, data: unknown) =>
    fetch(`${BASE}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),

  delete:  (id: string) =>
    fetch(`${BASE}/${id}`, { method: "DELETE" }).then(r => r.json()),

  renew:   (id: string, renewalDate: string) =>
    fetch(`${BASE}/${id}/renew`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ renewalDate }) }).then(r => r.json()),
};