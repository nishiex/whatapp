
"use client"

import { useCRM } from "@/contexts/crm-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  User,
  DollarSign,
  Calendar,
  TrendingUp,
  Package,
  FileText,
  Phone,
  Mail,
  MessageSquare,
} from "lucide-react"
import type { Deal } from "@/types/crm"

interface DealDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal: Deal | null
}

const formatDate = (value: unknown) => {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value as string)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function DealDetailDialog({ open, onOpenChange, deal }: DealDetailDialogProps) {
  const { customers, tasks } = useCRM()

  if (!deal) return null

  const customer = customers.find((c) => c.id === deal.customerId)
  const dealTasks = tasks.filter(
    (task) => task.relatedTo.type === "deal" && task.relatedTo.id === deal.id,
  )

  const getStageColor = (stage: Deal["stage"]) => {
    const colors: Record<Deal["stage"], string> = {
      prospecting: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      qualification: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      proposal: "bg-purple-100 text-purple-800 hover:bg-purple-100",
      negotiation: "bg-orange-100 text-orange-800 hover:bg-orange-100",
      "closed-won": "bg-green-100 text-green-800 hover:bg-green-100",
      "closed-lost": "bg-red-100 text-red-800 hover:bg-red-100",
    }
    return colors[stage] ?? colors.prospecting
  }

  const getStageProgress = (stage: Deal["stage"]) => {
    const stages: Deal["stage"][] = [
      "prospecting",
      "qualification",
      "proposal",
      "negotiation",
      "closed-won",
    ]
    const currentIndex = stages.indexOf(stage)
    return currentIndex >= 0 ? ((currentIndex + 1) / stages.length) * 100 : 0
  }

  const handleCallCustomer = () => {
    if (!customer?.phone) return
    window.open(`tel:${customer.phone}`, "_self")
  }

  const handleEmailCustomer = () => {
    if (!customer?.email) return
    window.location.href = `mailto:${customer.email}`
  }

  const handleWhatsAppCustomer = () => {
    const number = (customer as any)?.whatsappNumber || customer?.phone
    if (!number) return
    const text = encodeURIComponent(
      `Hi ${customer?.name || ""}, following up regarding deal "${deal.title}".`,
    )
    window.open(`https://wa.me/${number}?text=${text}`, "_blank", "noopener,noreferrer")
  }

  const handleScheduleMeeting = () => {
    console.log("Schedule meeting for deal:", deal.id)
  }

  const handleCreateInvoice = () => {
    console.log("Create invoice for deal:", deal.id)
  }

  const daysInStage =
    deal.updatedAt instanceof Date
      ? Math.max(
          0,
          Math.ceil(
            (new Date().getTime() - deal.updatedAt.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : "—"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            {deal.title}
          </DialogTitle>
          <DialogDescription>
            Complete deal overview and progress tracking
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deal Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Deal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Deal Title
                    </div>
                    <div className="text-sm font-medium">{deal.title}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Stage
                    </div>
                    <Badge className={getStageColor(deal.stage)}>
                      {deal.stage.replace("-", " ")}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Deal Value
                      </div>
                      <div className="text-lg font-bold">
                        ₹{deal.value.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Probability
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={deal.probability} className="flex-1" />
                      <span className="text-sm font-medium">
                        {deal.probability}%
                      </span>
                    </div>
                  </div>
                </div>

                {customer && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Customer
                      </div>
                      <div className="text-sm">
                        {customer.name}
                        {customer.company ? ` - ${customer.company}` : ""}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Expected Close
                      </div>
                      <div className="text-sm">
                        {formatDate(deal.expectedCloseDate)}
                      </div>
                    </div>
                  </div>
                  {deal.actualCloseDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Actual Close
                        </div>
                        <div className="text-sm">
                          {formatDate(deal.actualCloseDate)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {deal.products?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Products/Services
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {deal.products.map((product) => (
                          <Badge key={product} variant="outline" className="text-xs">
                            {product}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {deal.notes && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Notes
                    </div>
                    <div className="text-sm bg-muted p-3 rounded-md">
                      {deal.notes}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deal Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Deal Progress</CardTitle>
                <CardDescription>
                  Track the deal through sales stages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Progress value={getStageProgress(deal.stage)} className="flex-1" />
                    <span className="text-sm font-medium">
                      {Math.round(getStageProgress(deal.stage))}%
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      "prospecting",
                      "qualification",
                      "proposal",
                      "negotiation",
                      "closed-won",
                    ].map((stage, index) => {
                      const stageOrder: Deal["stage"][] = [
                        "prospecting",
                        "qualification",
                        "proposal",
                        "negotiation",
                        "closed-won",
                      ]
                      const isActive = deal.stage === stage
                      const isPassed = stageOrder.indexOf(deal.stage) > index
                      return (
                        <div key={stage} className="text-center">
                          <div
                            className={`w-3 h-3 rounded-full mx-auto mb-1 ${
                              isActive
                                ? "bg-primary"
                                : isPassed
                                  ? "bg-green-500"
                                  : "bg-muted"
                            }`}
                          />
                          <span
                            className={`text-xs capitalize ${
                              isActive
                                ? "font-medium text-primary"
                                : isPassed
                                  ? "text-green-600"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {stage.replace("-", " ")}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest tasks and interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dealTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-md"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          task.priority === "high"
                            ? "bg-red-500"
                            : task.priority === "medium"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{task.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {task.type} • Due: {formatDate(task.dueDate)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {dealTasks.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No recent activity
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ₹{deal.value.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Deal Value</div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{formatDate(deal.createdAt)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="text-sm">{formatDate(deal.updatedAt)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Days in Stage</span>
                  <span className="text-sm">{daysInStage}</span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            {customer && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Customer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {customer.company}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{customer.phone}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start bg-transparent"
                  onClick={handleCallCustomer}
                  disabled={!customer?.phone}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Call Customer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start bg-transparent"
                  onClick={handleEmailCustomer}
                  disabled={!customer?.email}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start bg-transparent"
                  onClick={handleWhatsAppCustomer}
                  disabled={!customer?.phone && !(customer as any)?.whatsappNumber}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  WhatsApp Message
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start bg-transparent"
                  onClick={handleScheduleMeeting}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Meeting
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start bg-transparent"
                  onClick={handleCreateInvoice}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Create Invoice
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
