'use client';

import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, AlertTriangle, Flag } from 'lucide-react';

// const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://crm-backend-53w9.onrender.com/api';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://crm-api.vasifytech.com/api';
// const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function TaskMilestone({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'Medium',
    status: 'Pending',
    due_date: '',
  });

  useEffect(() => {
    if (!projectId) return;
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
        headers: {
          Authorization:
            typeof window !== 'undefined'
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    // normalize due_date to YYYY-MM-DD or null
    let dueDateStr = null;
    if (taskForm.due_date) {
      const d = new Date(taskForm.due_date);
      dueDateStr = Number.isNaN(d.getTime())
        ? taskForm.due_date
        : d.toISOString().split('T')[0];
    }

    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description || null,
      assigned_to: taskForm.assigned_to || null,
      priority: taskForm.priority || 'Medium',
      status: taskForm.status || 'Pending',
      due_date: dueDateStr,
      parent_task_id: null,
    };

    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            typeof window !== 'undefined'
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowTaskForm(false);
        setTaskForm({
          title: '',
          description: '',
          assigned_to: '',
          priority: 'Medium',
          status: 'Pending',
          due_date: '',
        });
        fetchTasks();
      } else {
        const err = await response.json().catch(() => null);
        console.error('Failed to create task:', err || response.statusText);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    // normalize due_date if present
    const payload = { ...updates };
    if (payload.due_date) {
      const d = new Date(payload.due_date);
      payload.due_date = Number.isNaN(d.getTime())
        ? payload.due_date
        : d.toISOString().split('T')[0];
    }

    try {
      const response = await fetch(
        `${API_BASE}/projects/${projectId}/tasks/${taskId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              typeof window !== 'undefined'
                ? `Bearer ${localStorage.getItem('token')}`
                : '',
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        fetchTasks();
      } else {
        const err = await response.json().catch(() => null);
        console.error('Failed to update task:', err || response.statusText);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'In Progress':
        return <Clock className="text-blue-600" size={20} />;
      case 'Blocked':
        return <AlertTriangle className="text-red-600" size={20} />;
      default:
        return <Clock className="text-gray-400" size={20} />;
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Low: 'text-gray-600',
      Medium: 'text-blue-600',
      High: 'text-orange-600',
      Critical: 'text-red-600',
    };
    return colors[priority] || colors.Medium;
  };

  const groupedTasks = {
    Pending: tasks.filter((t) => t.status === 'Pending'),
    'In Progress': tasks.filter((t) => t.status === 'In Progress'),
    Blocked: tasks.filter((t) => t.status === 'Blocked'),
    Completed: tasks.filter((t) => t.status === 'Completed'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Tasks & Milestones</h3>
          <p className="text-sm text-gray-600 mt-1">
            {tasks.filter((t) => t.status === 'Completed').length} of{' '}
            {tasks.length} tasks completed
          </p>
        </div>
        <button
          onClick={() => setShowTaskForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={18} />
          New Task
        </button>
      </div>

      {/* Task Form */}
      {showTaskForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-bold mb-4">Create New Task</h4>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, title: e.target.value })
                }
                required
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Priority
                </label>
                <select
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, priority: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Status
                </label>
                <select
                  value={taskForm.status}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, due_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowTaskForm(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tasks by Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(groupedTasks).map(([status, statusTasks]) => (
          <div key={status} className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h4 className="font-bold text-gray-900">{status}</h4>
              <p className="text-sm text-gray-600">{statusTasks.length} tasks</p>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {statusTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 text-sm">
                        {task.title}
                      </h5>
                      {task.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <Flag
                      size={16}
                      className={getPriorityColor(task.priority)}
                    />
                  </div>

                  {task.assigned_to_name && (
                    <div className="text-xs text-gray-600 mb-2">
                      👤 {task.assigned_to_name}
                    </div>
                  )}

                  {task.due_date && (
                    <div className="text-xs text-gray-600 mb-2">
                      📅 {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  )}

                  <select
                    value={task.status}
                    onChange={(e) =>
                      handleUpdateTask(task.id, { status: e.target.value })
                    }
                    className="w-full text-xs px-2 py-1 border rounded mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              ))}
              {statusTasks.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
