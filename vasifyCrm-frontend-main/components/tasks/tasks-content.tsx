"use client"

import { useState } from "react"
import { useCRM } from "@/contexts/crm-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { TaskDialog } from "./task-dialog"
import { TaskDetailDialog } from "./task-detail-dialog"
import { TaskCalendar } from "./task-calendar"
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  List,
} from "lucide-react"
import type { Task } from "@/types/crm"

export function TasksContent() {
  const { tasks, updateTask, deleteTask, customers, leads, deals } = useCRM()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
    const matchesType = typeFilter === "all" || task.type === typeFilter

    return matchesSearch && matchesStatus && matchesPriority && matchesType
  })

  const handleEdit = (task: Task) => {
    setSelectedTask(task)
    setIsEditDialogOpen(true)
  }

  const handleDelete = (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask(taskId)
    }
  }

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task)
    setIsDetailDialogOpen(true)
  }

  const handleToggleComplete = (task: Task) => {
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

  const getRelatedEntityName = (task: Task) => {
    if (task.relatedTo.type === "customer") {
      const customer = customers.find((c) => c.id === task.relatedTo.id)
      return customer ? `${customer.name} (Customer)` : "Unknown Customer"
    } else if (task.relatedTo.type === "lead") {
      const lead = leads.find((l) => l.id === task.relatedTo.id)
      return lead ? `${lead.name} (Lead)` : "Unknown Lead"
    } else if (task.relatedTo.type === "deal") {
      const deal = deals.find((d) => d.id === task.relatedTo.id)
      return deal ? `${deal.title} (Deal)` : "Unknown Deal"
    }
    return "Unknown"
  }

  const isOverdue = (task: Task) => {
    return task.status !== "completed" && new Date(task.dueDate) < new Date()
  }

  // Calculate stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter((t) => isOverdue(t)).length,
    dueToday: tasks.filter(
      (t) => t.status !== "completed" && new Date(t.dueDate).toDateString() === new Date().toDateString(),
    ).length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-serif">Tasks & Activities</h1>
          <p className="text-muted-foreground">Manage your tasks and track activities</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(value: "list" | "calendar") => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List
                </div>
              </SelectItem>
              <SelectItem value="calendar">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Calendar
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.inProgress}</div>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.completed}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{stats.overdue}</div>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{stats.dueToday}</div>
                <p className="text-xs text-muted-foreground">Due Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      {viewMode === "calendar" ? (
        <TaskCalendar
          tasks={filteredTasks}
          onEditTask={handleEdit}
          onViewTask={handleViewDetails}
          onToggleComplete={handleToggleComplete}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Task Management</CardTitle>
            <CardDescription>Track and manage all your tasks and activities</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">
                {filteredTasks.length} of {tasks.length} tasks
              </div>
            </div>

            {/* Tasks Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Done</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Related To</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchTerm || statusFilter !== "all" || priorityFilter !== "all" || typeFilter !== "all"
                          ? "No tasks found matching your filters."
                          : "No tasks yet. Add your first task!"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow key={task.id} className={`hover:bg-muted/50 ${isOverdue(task) ? "bg-red-50" : ""}`}>
                        <TableCell>
                          <Checkbox
                            checked={task.status === "completed"}
                            onCheckedChange={() => handleToggleComplete(task)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div
                              className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                            >
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">{task.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{getRelatedEntityName(task)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {task.type.replace("-", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityBadge(task.priority)}>{task.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(task.status)}>{task.status.replace("-", " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className={`text-sm ${isOverdue(task) ? "text-red-600 font-medium" : ""}`}>
                            {task.dueDate.toLocaleDateString()}
                            {isOverdue(task) && (
                              <div className="flex items-center gap-1 text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                Overdue
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewDetails(task)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(task)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleComplete(task)}>
                                <CheckSquare className="mr-2 h-4 w-4" />
                                {task.status === "completed" ? "Mark Incomplete" : "Mark Complete"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <TaskDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} task={null} mode="add" />

      <TaskDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} task={selectedTask} mode="edit" />

      <TaskDetailDialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen} task={selectedTask} />
    </div>
  )
}
