"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useCRM } from "@/contexts/crm-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Task } from "@/types/crm"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  mode: "add" | "edit"
}

export function TaskDialog({ open, onOpenChange, task, mode }: TaskDialogProps) {
  const { addTask, updateTask, customers, leads, deals } = useCRM()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "call" as Task["type"],
    priority: "medium" as Task["priority"],
    status: "pending" as Task["status"],
    assignedTo: "user1",
    relatedToType: "customer" as "customer" | "lead" | "deal",
    relatedToId: "",
  })
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    if (task && mode === "edit") {
      setFormData({
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        status: task.status,
        assignedTo: task.assignedTo,
        relatedToType: task.relatedTo.type,
        relatedToId: task.relatedTo.id,
      })
      setDueDate(task.dueDate)
    } else {
      // Reset form for add mode
      setFormData({
        title: "",
        description: "",
        type: "call",
        priority: "medium",
        status: "pending",
        assignedTo: "user1",
        relatedToType: "customer",
        relatedToId: "",
      })
      setDueDate(undefined)
    }
  }, [task, mode, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!dueDate) {
      alert("Please select a due date")
      return
    }

    if (!formData.relatedToId) {
      alert("Please select a related entity")
      return
    }

    const taskData = {
      ...formData,
      dueDate,
      relatedTo: {
        type: formData.relatedToType,
        id: formData.relatedToId,
      },
      completedAt: formData.status === "completed" ? new Date() : undefined,
    }

    if (mode === "add") {
      addTask(taskData)
    } else if (task) {
      updateTask(task.id, taskData)
    }

    onOpenChange(false)
  }

  const getRelatedEntities = () => {
    switch (formData.relatedToType) {
      case "customer":
        return customers.map((c) => ({ id: c.id, name: `${c.name} - ${c.company}` }))
      case "lead":
        return leads.map((l) => ({ id: l.id, name: `${l.name} - ${l.company || "No Company"}` }))
      case "deal":
        return deals.map((d) => ({ id: d.id, name: d.title }))
      default:
        return []
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add New Task" : "Edit Task"}</DialogTitle>
          <DialogDescription>
            {mode === "add" ? "Create a new task to track activities." : "Update task information and status."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Follow up with customer about proposal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Additional details about this task..."
            />
          </div>

          {/* Task Details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: Task["type"]) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: Task["priority"]) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: Task["status"]) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Related Entity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="relatedToType">Related To</Label>
              <Select
                value={formData.relatedToType}
                onValueChange={(value: "customer" | "lead" | "deal") => {
                  setFormData({ ...formData, relatedToType: value, relatedToId: "" })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="deal">Deal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="relatedToId">Select {formData.relatedToType} *</Label>
              <Select
                value={formData.relatedToId}
                onValueChange={(value) => setFormData({ ...formData, relatedToId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${formData.relatedToType}`} />
                </SelectTrigger>
                <SelectContent>
                  {getRelatedEntities().map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{mode === "add" ? "Add Task" : "Update Task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
