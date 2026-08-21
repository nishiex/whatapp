"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import type { Task } from "@/types/crm"

interface TaskCalendarProps {
  tasks: Task[]
  onEditTask: (task: Task) => void
  onViewTask: (task: Task) => void
  onToggleComplete: (task: Task) => void
}

export function TaskCalendar({ tasks, onEditTask, onViewTask, onToggleComplete }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getTasksForDate = (date: Date | null) => {
    if (!date) return []
    return tasks.filter((task) => {
      const taskDate = new Date(task.dueDate)
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const isToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isOverdue = (task: Task) => {
    return task.status !== "completed" && new Date(task.dueDate) < new Date()
  }

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const days = getDaysInMonth(currentDate)
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {dayNames.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((date, index) => {
            const dayTasks = getTasksForDate(date)
            return (
              <div
                key={index}
                className={`min-h-[120px] p-1 border border-border ${
                  date ? "bg-background" : "bg-muted/20"
                } ${isToday(date) ? "bg-primary/5 border-primary/20" : ""}`}
              >
                {date && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${isToday(date) ? "text-primary" : ""}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-shadow"
                          onClick={() => onViewTask(task)}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                task.status === "completed"
                                  ? "bg-green-500"
                                  : isOverdue(task)
                                    ? "bg-red-500"
                                    : "bg-blue-500"
                              }`}
                            />
                            <Badge className={`${getPriorityColor(task.priority)} text-xs px-1 py-0`}>
                              {task.priority.charAt(0).toUpperCase()}
                            </Badge>
                          </div>
                          <div
                            className={`font-medium line-clamp-2 ${
                              task.status === "completed" ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {task.title}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-xs px-1 py-0 capitalize">
                              {task.type}
                            </Badge>
                            {isOverdue(task) && <AlertTriangle className="h-3 w-3 text-red-500" />}
                          </div>
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">+{dayTasks.length - 3} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
