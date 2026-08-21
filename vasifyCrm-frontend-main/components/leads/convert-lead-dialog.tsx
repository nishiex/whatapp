



"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useCRM } from "@/contexts/crm-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  X, UserCheck, Briefcase, Globe, Phone, Mail, IndianRupee,
  CheckCircle2,
} from "lucide-react";
import type { Lead, Customer } from "@/types/crm";

// ── Services aligned with Vasifytech SOW §5.2 ─────────────────────────────
const TECH_SERVICES: Record<string, string> = {
  "website":        "Website",
  "whatsapp-api":   "WhatsApp API",
  "lms":            "LMS",
  "crm":            "CRM",
  "social-media":   "Social Media",
  "other":          "Other",
};

const getLeadTotalAmount = (l: Lead): number => {
  const v = (l as any).totalAmount ?? (l as any).total_amount ?? l.estimatedValue ?? 0;
  return typeof v === "number" ? v : Number(v ?? 0);
};

const getLeadExpectedAmount = (l: Lead): number => {
  const v = (l as any).expectedAmount ?? (l as any).expected_amount ?? 0;
  return typeof v === "number" ? v : Number(v ?? 0);
};

// ═══════════════════════════════════════════════════════════════════════════
// ✅ NEW — ConfettiBurst: a tiny self-contained physics confetti cannon.
// No external library — pure <canvas> + requestAnimationFrame.
// ═══════════════════════════════════════════════════════════════════════════

interface ConfettiParticle {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; vr: number;
  size: number;
  color: string;
  shape: "rect" | "circle";
  life: number; maxLife: number;
}

const CONFETTI_COLORS = [
  "#10B981", "#34D399", // emerald
  "#8B5CF6", "#A78BFA", // violet
  "#3B82F6", "#60A5FA", // blue
  "#F59E0B", "#FBBF24", // amber
  "#F472B6",            // pink accent
];

function ConfettiBurst({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr  = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    const W = rect.width  || 400;
    const H = rect.height || 400;

    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    // Launch point: roughly where the check-icon sits
    const originX = W / 2;
    const originY = H * 0.28;

    const COUNT = 130;
    const particles: ConfettiParticle[] = Array.from({ length: COUNT }, () => {
      const angle = Math.PI + Math.random() * Math.PI; // upward hemisphere
      const speed = 4 + Math.random() * 7;
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        size: 5 + Math.random() * 5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        shape: Math.random() < 0.5 ? "rect" : "circle",
        life: 0,
        maxLife: 80 + Math.random() * 50, // frames (~1.3–2.2s @ 60fps)
      };
    });

    const GRAVITY = 0.22;
    const DRAG    = 0.992;

    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = 0;

      for (const p of particles) {
        if (p.life >= p.maxLife) continue;
        p.life++;
        p.vx *= DRAG;
        p.vy = p.vy * DRAG + GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;

        const fadeStart = p.maxLife * 0.75;
        const opacity = p.life > fadeStart
          ? Math.max(0, 1 - (p.life - fadeStart) / (p.maxLife - fadeStart))
          : 1;

        if (opacity <= 0 || p.y > H + 20) continue;
        alive++;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (alive > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, W, H); // burst finished — stop animating
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}

interface ConvertLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onSuccess?: () => void;
}

export function ConvertLeadDialog({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: ConvertLeadDialogProps) {
  const { convertLead } = useCRM();

  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    status: "active" as Customer["status"],
    notes: "",
    totalValue: "0",
    expectedValue: "0",
  });
  const [tags, setTags]                 = useState<string[]>([]);
  const [newTag, setNewTag]             = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showSuccess, setShowSuccess]             = useState(false);
  const [convertedCustomer, setConvertedCustomer] = useState<Customer | null>(null);

  // ── Reset form whenever dialog opens with a new lead ──────────────────
  useEffect(() => {
    if (lead && open) {
      const initialTags: string[] = [];
      const serviceKey = (lead as any).service ?? "";
      if (serviceKey && TECH_SERVICES[serviceKey]) {
        initialTags.push(TECH_SERVICES[serviceKey]);
      }

      const leadTotal    = getLeadTotalAmount(lead);
      const leadExpected = getLeadExpectedAmount(lead);

      setFormData({
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "India",
        status: "active",
        notes: lead.notes || "",
        totalValue:    String(leadTotal || 0),
        expectedValue: String(leadExpected || 0),
      });
      setTags(initialTags);
      setNewTag("");
      setShowSuccess(false);
      setConvertedCustomer(null);
    }
  }, [lead, open]);

  const closeAndFinish = () => {
    const wasSuccess = showSuccess;
    setShowSuccess(false);
    setConvertedCustomer(null);
    onOpenChange(false);
    if (wasSuccess) onSuccess?.();
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    const totalValueNumber    = formData.totalValue    ? Number(formData.totalValue)    : 0;
    const expectedValueNumber = formData.expectedValue ? Number(formData.expectedValue) : 0;

    const customerData = {
      name:           lead.name,
      email:          lead.email,
      phone:          (lead as any).phone,
      whatsappNumber: lead.whatsappNumber,
      assignedTo:     lead.assignedTo,
      address:        formData.address,
      city:           formData.city,
      state:          formData.state,
      zipCode:        formData.zipCode,
      country:        formData.country,
      status:         formData.status,
      notes:          formData.notes,
      totalValue:    Number.isNaN(totalValueNumber)    ? 0    : totalValueNumber,
      expectedAmount: Number.isNaN(expectedValueNumber) ? null : expectedValueNumber,
      tags,
    };

    setIsSubmitting(true);
    try {
      const customer = await convertLead(lead.id, customerData);
      if (customer) {
        setConvertedCustomer(customer);
        setShowSuccess(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Tag helpers ─────────────────────────────────────────────────────────
  const addTag = () => {
    const value = newTag.trim();
    if (value && !tags.includes(value)) setTags((prev) => [...prev, value]);
    setNewTag("");
  };

  const removeTag = (tag: string) =>
    setTags((prev) => prev.filter((t) => t !== tag));

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  if (!lead) return null;

  const serviceLabel = TECH_SERVICES[(lead as any).service ?? ""] ?? null;
  const displayEmail =
    lead.email &&
    !lead.email.includes("@whatsapp.") &&
    !lead.email.includes("@booking.")
      ? lead.email
      : null;

  const leadTotalDisplay    = getLeadTotalAmount(lead);
  const leadExpectedDisplay = getLeadExpectedAmount(lead);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { if (!v) closeAndFinish(); }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">

        {showSuccess && convertedCustomer ? (
          // ✅ NEW — relative + overflow-hidden so the confetti canvas is
          // clipped to this panel's rounded corners and positioned correctly.
          <div className="relative overflow-hidden p-8 sm:p-10 flex flex-col items-center text-center bg-gradient-to-b from-emerald-50 via-white to-white rounded-2xl animate-in fade-in zoom-in-95 duration-300">

            <ConfettiBurst active={showSuccess} />

            {/* ✅ NEW — z-10 wrapper keeps all text/buttons above the confetti layer */}
            <div className="relative z-10 flex flex-col items-center w-full">

              <div className="relative mb-6 mt-2">
                <div className="absolute inset-0 rounded-full bg-emerald-400/25 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200 animate-in zoom-in-50 duration-500">
                  <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2.5} />
                </div>
              </div>

              <DialogTitle className="text-xl font-black text-slate-800">
                Client Onboarded! 🎉
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-1.5 max-w-sm">
                <strong className="text-slate-700">{convertedCustomer.name}</strong> is now a full
                client. Their lead history has been preserved and linked.
              </DialogDescription>

              <div className="mt-6 w-full max-w-xs bg-white border-2 border-emerald-100 rounded-2xl p-4 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-semibold uppercase tracking-wide text-[11px]">Deal Value</span>
                  <span className="font-black text-slate-800">
                    {(convertedCustomer as any).dealValue
                      ? `₹${Number((convertedCustomer as any).dealValue).toLocaleString("en-IN")}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-semibold uppercase tracking-wide text-[11px]">Status</span>
                  <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full font-bold capitalize">
                    {convertedCustomer.status}
                  </Badge>
                </div>
              </div>

              <Button
                type="button"
                onClick={closeAndFinish}
                className="mt-7 w-full max-w-xs rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black py-2.5 shadow-lg shadow-emerald-200"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Hero Header ──────────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-500 px-6 py-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                  <UserCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-white font-black text-lg">
                    Convert Lead to Client
                  </DialogTitle>
                  <DialogDescription className="text-violet-100 text-xs mt-0.5">
                    Onboard{" "}
                    <strong className="text-white">{lead.name}</strong> as a full
                    client. Their lead history will be preserved and linked.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-slate-50">

              {/* ── Lead Summary (read-only) ────────────────────────────────── */}
              <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-violet-300" />
                  <span className="font-black text-white text-sm uppercase tracking-wide">
                    Lead Summary
                  </span>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        Name:
                      </span>
                      <span className="font-bold text-slate-800">{lead.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        Phone:
                      </span>
                      <span className="font-semibold text-slate-700">
                        {(lead as any).phone || "—"}
                      </span>
                    </div>

                    {displayEmail && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                          Email:
                        </span>
                        <span className="text-slate-700">{displayEmail}</span>
                      </div>
                    )}

                    {serviceLabel && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-violet-500" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                          Service:
                        </span>
                        <span className="font-bold text-violet-700">
                          {serviceLabel}
                        </span>
                      </div>
                    )}

                    {(lead as any).stage && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                          Stage:
                        </span>
                        <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold text-xs rounded-full">
                          {(lead as any).stage}
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        Total Amt:
                      </span>
                      <span className="font-black text-violet-700">
                        {leadTotalDisplay > 0
                          ? `₹${leadTotalDisplay.toLocaleString("en-IN")}`
                          : "—"}
                      </span>
                    </div>

                    {leadExpectedDisplay > 0 && (
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                          Expected:
                        </span>
                        <span className="font-black text-amber-700">
                          ₹{leadExpectedDisplay.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}

                    {(lead as any).closureDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                          Closure date:
                        </span>
                        <span className="font-semibold text-slate-700">
                          {(lead as any).closureDate}
                        </span>
                      </div>
                    )}

                    {lead.assignedTo && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                          Sales owner:
                        </span>
                        <span className="font-semibold text-slate-700">
                          {lead.assignedTo}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Client Record Details ───────────────────────────────────── */}
              <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-500 px-5 py-3 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-white" />
                  <span className="font-black text-white text-sm uppercase tracking-wide">
                    Client Details
                  </span>
                </div>
                <div className="p-5 space-y-4">

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="totalValue"
                        className="text-xs font-bold text-slate-500 uppercase tracking-wide"
                      >
                        Total Amount (₹)
                      </Label>
                      <Input
                        id="totalValue"
                        type="number"
                        value={formData.totalValue}
                        onChange={(e) =>
                          setFormData({ ...formData, totalValue: e.target.value })
                        }
                        min="0"
                        step="0.01"
                        className="rounded-xl border-2 border-slate-200 focus:border-violet-400 font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="expectedValue"
                        className="text-xs font-bold text-slate-500 uppercase tracking-wide"
                      >
                        Expected Amount (₹)
                      </Label>
                      <Input
                        id="expectedValue"
                        type="number"
                        value={formData.expectedValue}
                        onChange={(e) =>
                          setFormData({ ...formData, expectedValue: e.target.value })
                        }
                        min="0"
                        step="0.01"
                        className="rounded-xl border-2 border-amber-200 focus:border-amber-400 font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="status"
                        className="text-xs font-bold text-slate-500 uppercase tracking-wide"
                      >
                        Client Status
                      </Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v: Customer["status"]) =>
                          setFormData({ ...formData, status: v })
                        }
                      >
                        <SelectTrigger className="rounded-xl border-2 border-slate-200 focus:border-violet-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="prospect">Prospect</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="address"
                      className="text-xs font-bold text-slate-500 uppercase tracking-wide"
                    >
                      Address
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="Client's business address"
                      className="rounded-xl border-2 border-slate-200 focus:border-violet-400"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="city"
                        className="text-xs font-bold text-slate-500 uppercase tracking-wide"
                      >
                        City
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        className="rounded-xl border-2 border-slate-200 focus:border-violet-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="state"
                        className="text-xs font-bold text-slate-500 uppercase tracking-wide"
                      >
                        State
                      </Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) =>
                          setFormData({ ...formData, state: e.target.value })
                        }
                        className="rounded-xl border-2 border-slate-200 focus:border-violet-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="zipCode"
                        className="text-xs font-bold text-slate-500 uppercase tracking-wide"
                      >
                        PIN Code
                      </Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) =>
                          setFormData({ ...formData, zipCode: e.target.value })
                        }
                        className="rounded-xl border-2 border-slate-200 focus:border-violet-400"
                      />
                    </div>
                  </div>

                  <div className="h-0.5 bg-slate-100 rounded-full" />

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Tags
                    </Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          className="bg-violet-100 text-violet-800 border-2 border-violet-200 font-bold px-2.5 flex items-center gap-1 rounded-full"
                        >
                          {tag}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-red-600 ml-0.5"
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Add tag (e.g. VIP, Retainer, Follow-up)"
                        className="rounded-xl border-2 border-slate-200 focus:border-violet-400"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addTag}
                        className="rounded-xl border-2 border-slate-200 font-bold hover:border-violet-400 hover:text-violet-700"
                      >
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400">
                      Service tags are added automatically. Add more for easy
                      filtering.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="notes"
                      className="text-xs font-bold text-slate-500 uppercase tracking-wide"
                    >
                      Remarks
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={3}
                      placeholder="Scope notes, special requirements, payment terms..."
                      className="rounded-xl border-2 border-slate-200 focus:border-violet-400 resize-none"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeAndFinish}
                  disabled={isSubmitting}
                  className="rounded-xl border-2 border-slate-200 font-bold px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white font-black px-6 shadow-lg shadow-violet-200"
                >
                  {isSubmitting ? "Converting..." : "Convert to Client"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}