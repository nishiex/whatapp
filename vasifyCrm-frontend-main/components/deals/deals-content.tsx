

"use client"

import { useMemo, useState } from "react"
import { useCRM } from "@/contexts/crm-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DealDialog } from "./deal-dialog"
import { DealDetailDialog } from "./deal-detail-dialog"
import { DealKanban } from "./deal-kanban"
import {
  Plus,
  Search,
  BarChart3,
  DollarSign,
  TrendingUp,
  Target,
} from "lucide-react"
import type { Deal } from "@/types/crm"

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

export function DealsContent() {
  const { deals, customers } = useCRM()
  const [searchTerm, setSearchTerm] = useState("")
  const [customerFilter, setCustomerFilter] = useState<string>("all")
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban")

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredDeals = useMemo(
    () =>
      deals.filter((deal) => {
        const customer = customers.find((c) => c.id === deal.customerId)
        const matchesSearch =
          !normalizedSearch ||
          deal.title.toLowerCase().includes(normalizedSearch) ||
          (customer &&
            customer.name.toLowerCase().includes(normalizedSearch)) ||
          deal.products.some((product) =>
            product.toLowerCase().includes(normalizedSearch),
          )

        const matchesCustomer =
          customerFilter === "all" || deal.customerId === customerFilter

        return matchesSearch && matchesCustomer
      }),
    [deals, customers, normalizedSearch, customerFilter],
  )

  const handleEdit = (deal: Deal) => {
    setSelectedDeal(deal)
    setIsEditDialogOpen(true)
  }

  const handleViewDetails = (deal: Deal) => {
    setSelectedDeal(deal)
    setIsDetailDialogOpen(true)
  }

  const stats = useMemo(() => {
    const numericValue = (v: Deal["value"]) =>
      typeof v === "number" ? v : Number(v ?? 0) || 0

    const total = deals.length
    const totalValue = deals.reduce(
      (sum, deal) => sum + numericValue(deal.value),
      0,
    )
    const wonDeals = deals.filter((d) => d.stage === "closed-won")
    const wonValue = wonDeals.reduce(
      (sum, deal) => sum + numericValue(deal.value),
      0,
    )

    const closedDeals = deals.filter((d) =>
      ["closed-won", "closed-lost"].includes(d.stage),
    )
    const winRate =
      closedDeals.length > 0
        ? (wonDeals.length / closedDeals.length) * 100
        : 0

    const avgDealSize = total > 0 ? totalValue / total : 0

    return {
      total,
      totalValue,
      wonValue,
      avgDealSize,
      winRate,
    }
  }, [deals])

  const stageStats = useMemo(
    () => ({
      prospecting: deals.filter((d) => d.stage === "prospecting").length,
      qualification: deals.filter((d) => d.stage === "qualification").length,
      proposal: deals.filter((d) => d.stage === "proposal").length,
      negotiation: deals.filter((d) => d.stage === "negotiation").length,
      "closed-won": deals.filter((d) => d.stage === "closed-won").length,
      "closed-lost": deals.filter((d) => d.stage === "closed-lost").length,
    }),
    [deals],
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-serif">Deals Pipeline</h1>
          <p className="text-muted-foreground">
            Track and manage your sales opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={viewMode}
            onValueChange={(value: "kanban" | "table") => setViewMode(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kanban">Kanban</SelectItem>
              <SelectItem value="table">Table</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Deal
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Deals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  ₹{stats.totalValue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Pipeline Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <div>
                <div className="text-2xl font-bold">
                  ₹{stats.wonValue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Won (All Time)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {stats.winRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Overview</CardTitle>
          <CardDescription>
            Manage deals across different stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {filteredDeals.length} of {deals.length} deals
            </div>
          </div>

          {/* Pipeline Stages Overview */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            {Object.entries(stageStats).map(([stage, count]) => (
              <div key={stage} className="text-center">
                <div className="text-lg font-bold">{count}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {stage.replace("-", " ")}
                </div>
              </div>
            ))}
          </div>

          {/* Kanban View */}
          {viewMode === "kanban" && (
            <DealKanban
              deals={filteredDeals}
              customers={customers}
              onEditDeal={handleEdit}
              onViewDeal={handleViewDetails}
            />
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Deal</th>
                      <th className="text-left p-4 font-medium">Customer</th>
                      <th className="text-left p-4 font-medium">Stage</th>
                      <th className="text-left p-4 font-medium">Value</th>
                      <th className="text-left p-4 font-medium">Probability</th>
                      <th className="text-left p-4 font-medium">
                        Expected Close
                      </th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeals.map((deal) => {
                      const customer = customers.find(
                        (c) => c.id === deal.customerId,
                      )
                      const numericValue =
                        typeof deal.value === "number"
                          ? deal.value
                          : Number(deal.value ?? 0) || 0
                      const probabilitySafe = Math.max(
                        0,
                        Math.min(100, deal.probability ?? 0),
                      )

                      return (
                        <tr
                          key={deal.id}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="p-4">
                            <div className="font-medium">{deal.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {deal.products.slice(0, 2).join(", ")}
                              {deal.products.length > 2 && "..."}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium">
                              {customer?.name || "Unknown"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {customer?.company}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="capitalize">
                              {deal.stage.replace("-", " ")}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="font-medium">
                              ₹{numericValue.toLocaleString()}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-12 bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${probabilitySafe}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-sm">{probabilitySafe}%</span>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              {formatDate(deal.expectedCloseDate)}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(deal)}
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(deal)}
                              >
                                Edit
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DealDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        deal={null}
        mode="add"
      />

      <DealDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        deal={selectedDeal}
        mode="edit"
      />

      <DealDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        deal={selectedDeal}
      />
    </div>
  )
}
