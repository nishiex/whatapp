import type { Metadata } from "next";
import { RetainersContent } from "@/components/retainers/retainers-content";

// ─── Page Metadata ────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       "Retainers | Vasify CRM",
  description: "Manage monthly retainer clients, track renewals, and monitor recurring revenue.",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RetainersPage() {
  return <RetainersContent />;
}