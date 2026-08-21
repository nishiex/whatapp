"use client"

import { useCRM } from "@/contexts/crm-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckSquare, Calendar, User, AlertTriangle, Phone, Mail, MessageSquare, FileText } from "lucide-react"
import type { Task } from "@/types/crm"

interface TaskDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
}

export function TaskDetailDialog({ open, onOpenChange, task }: TaskDetailDialogProps) {
  const { customers, leads, deals, updateTask } = useCRM()

  if (!task) return null

  const getRelatedEntity = () => {
    if (task.relatedTo.type === "customer") {
      return customers.find((c) => c.id === task.relatedTo.id)
    } else if (task.relatedTo.type === "lead") {
      return leads.find((l) => l.id === task.relatedTo.id)
    } else if (task.relatedTo.type === "deal") {
      return deals.find((d) => d.id === task.relatedTo.id)
    }
    return null
  }

  const relatedEntity = getRelatedEntity()

  const handleToggleComplete = () => {
    const newStatus = task.status === "completed" ? "pending" : "completed"
    updateTask(task.id, {
      status: newStatus,
      completedAt: newStatus === "completed" ? new Date() : undefined,
    })
  }

  const getStatusBadge = (status: Task["status"]) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      "in-progress": "bg-blue-100 text-blue-800 hover:bg-blue-100",
      completed: "bg-green-100 text-green-800 hover:bg-green-100",
      cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
    }
    return variants[status] || variants.pending
  }

  const getPriorityBadge = (priority: Task["priority"]) => {
    const variants = {
      low: "bg-gray-100 text-gray-800 hover:bg-gray-100",
      medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      high: "bg-red-100 text-red-800 hover:bg-red-100",
    }
    return variants[priority] || variants.medium
  }

  const isOverdue = task.status !== "completed" && new Date(task.dueDate) < new Date()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <CheckSquare className="h-5 w-5 text-primary" />
            {task.title}
          </DialogTitle>
          <DialogDescription>Complete task details and related information</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Task Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Checkbox checked={task.status === "completed"} onCheckedChange={handleToggleComplete} />
                  <div className="flex-1">
                    <div
                      className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                    >
                      {task.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getStatusBadge(task.status)}>{task.status.replace("-", " ")}</Badge>
                      <Badge className={getPriorityBadge(task.priority)}>{task.priority}</Badge>
                      <Badge variant="outline" className="capitalize">
                        {task.type.replace("-", " ")}
                      </Badge>
                    </div>
                  </div>
                </div>

                {task.description && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Description</div>
                    <div className="text-sm bg-muted p-3 rounded-md">{task.description}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Due Date</div>
                      <div className={`text-sm ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                        {task.dueDate.toLocaleDateString()}
                        {isOverdue && (
                          <div className="flex items-center gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            Overdue
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Assigned To</div>
                      <div className="text-sm">Admin User</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Created</div>
                      <div className="text-sm">{task.createdAt.toLocaleDateString()}</div>
                    </div>
                  </div>
                  {task.completedAt && (
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Completed</div>
                        <div className="text-sm">{task.completedAt.toLocaleDateString()}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Related Entity */}
            {relatedEntity && (
              <Card>
                <CardHeader>
                  <CardTitle>Related {task.relatedTo.type}</CardTitle>
                  <CardDescription>Information about the related entity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {task.relatedTo.type === "customer" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{(relatedEntity as any).name}</div>
                          <div className="text-sm text-muted-foreground">{(relatedEntity as any).company}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{(relatedEntity as any).email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{(relatedEntity as any).phone}</span>
                      </div>
                    </div>
                  )}

                  {task.relatedTo.type === "lead" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{(relatedEntity as any).name}</div>
                          <div className="text-sm text-muted-foreground">
                            {(relatedEntity as any).company || "No Company"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{(relatedEntity as any).email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{(relatedEntity as any).phone}</span>
                      </div>
                    </div>
                  )}

                  {task.relatedTo.type === "deal" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{(relatedEntity as any).title}</div>
                          <div className="text-sm text-muted-foreground">
                            ${(relatedEntity as any).value.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Task Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${task.status === "completed" ? "text-green-600" : "text-blue-600"}`}
                  >
                    {task.status === "completed" ? "✓" : "○"}
                  </div>
                  <div className="text-sm text-muted-foreground capitalize">{task.status.replace("-", " ")}</div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Priority</span>
                    <Badge className={getPriorityBadge(task.priority)}>{task.priority}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Badge variant="outline" className="capitalize">
                      {task.type.replace("-", " ")}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Time Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{task.createdAt.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Due Date</span>
                  <span className={`text-sm ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                    {task.dueDate.toLocaleDateString()}
                  </span>
                </div>
                {task.completedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <span className="text-sm text-green-600">{task.completedAt.toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Days Open</span>
                  <span className="text-sm">
                    {Math.ceil(
                      ((task.completedAt || new Date()).getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24),
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

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
                  onClick={handleToggleComplete}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {task.status === "completed" ? "Mark Incomplete" : "Mark Complete"}
                </Button>
                {relatedEntity && task.relatedTo.type !== "deal" && (
                  <>
                    <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                      <Phone className="mr-2 h-4 w-4" />
                      Call {task.relatedTo.type}
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      WhatsApp Message
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Follow-up
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
