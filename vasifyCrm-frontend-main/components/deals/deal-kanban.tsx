
"use client"

import { useCRM } from "@/contexts/crm-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  DollarSign,
  Calendar,
  User,
} from "lucide-react"
import type { Deal, Customer } from "@/types/crm"

interface DealKanbanProps {
  deals: Deal[]
  customers: Customer[]
  onEditDeal: (deal: Deal) => void
  onViewDeal: (deal: Deal) => void
}

const stages = [
  { id: "prospecting", name: "Prospecting", color: "bg-blue-100 text-blue-800" },
  { id: "qualification", name: "Qualification", color: "bg-yellow-100 text-yellow-800" },
  { id: "proposal", name: "Proposal", color: "bg-purple-100 text-purple-800" },
  { id: "negotiation", name: "Negotiation", color: "bg-orange-100 text-orange-800" },
  { id: "closed-won", name: "Closed Won", color: "bg-green-100 text-green-800" },
  { id: "closed-lost", name: "Closed Lost", color: "bg-red-100 text-red-800" },
] as const

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

export function DealKanban({ deals, customers, onEditDeal, onViewDeal }: DealKanbanProps) {
  const { updateDeal, deleteDeal } = useCRM()

  const handleStageChange = (dealId: string, newStage: Deal["stage"]) => {
    void updateDeal(dealId, { stage: newStage } as Partial<Deal>)
  }

  const handleDelete = (dealId: string) => {
    if (window.confirm("Are you sure you want to delete this deal?")) {
      void deleteDeal(dealId)
    }
  }

  const getDealsByStage = (stageId: string) =>
    deals.filter((deal) => deal.stage === stageId)

  const getStageValue = (stageId: string) =>
    getDealsByStage(stageId).reduce(
      (sum, deal) =>
        sum +
        (typeof deal.value === "number" ? deal.value : Number(deal.value ?? 0) || 0),
      0,
    )

  return (
    <div className="grid grid-cols-6 gap-4 h-[600px] overflow-x-auto">
      {stages.map((stage) => {
        const stageDeals = getDealsByStage(stage.id)
        const stageValue = getStageValue(stage.id)

        return (
          <div key={stage.id} className="flex flex-col min-w-[280px]">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={stage.color}>{stage.name}</Badge>
                    <span className="text-muted-foreground">
                      ({stageDeals.length})
                    </span>
                  </div>
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  ₹{stageValue.toLocaleString()}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-3 pt-0">
                {stageDeals.map((deal) => {
                  const customer = customers.find(
                    (c) => c.id === deal.customerId,
                  )

                  const numericValue =
                    typeof deal.value === "number"
                      ? deal.value
                      : Number(deal.value ?? 0) || 0

                  return (
                    <Card
                      key={deal.id}
                      className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onViewDeal(deal)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm leading-tight">
                            {deal.title}
                          </h4>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => onViewDeal(deal)}>
                                <Eye className="mr-2 h-3 w-3" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onEditDeal(deal)}>
                                <Edit className="mr-2 h-3 w-3" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {stages.map((s) => (
                                <DropdownMenuItem
                                  key={s.id}
                                  onClick={() =>
                                    handleStageChange(deal.id, s.id as Deal["stage"])
                                  }
                                  disabled={s.id === deal.stage}
                                >
                                  Move to {s.name}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(deal.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-3 w-3" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{customer?.name || "Unknown Customer"}</span>
                        </div>

                        <div className="flex items-center gap-1 text-xs">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span className="font-medium">
                            ₹{numericValue.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(deal.expectedCloseDate)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 bg-muted rounded-full h-1">
                              <div
                                className="bg-primary h-1 rounded-full"
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(100, deal.probability ?? 0),
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs">
                              {deal.probability ?? 0}%
                            </span>
                          </div>
                        </div>

                        {deal.products?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {deal.products.slice(0, 2).map((product, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {product}
                              </Badge>
                            ))}
                            {deal.products.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{deal.products.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
                {stageDeals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No deals in this stage
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
