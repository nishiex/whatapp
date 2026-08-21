'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ListTodo,
  Search,
  RefreshCw,
} from 'lucide-react';

import ProjectList from '@/components/projects/ProjectList';
import ProjectForm from '@/components/projects/ProjectForm';
import { getToken } from '@/lib/auth';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://crm-api.vasifytech.com/api';

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>(
    'projects'
  );

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (activeTab === 'projects') {
      fetchProjects();
    }
  }, [activeTab]);

  const fetchProjects = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/projects`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (res.ok) {
        const data = await res.json();

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.projects)
          ? data.projects
          : [];

        setProjects(list);
      } else {
        console.error('Failed to fetch projects:', await res.text());
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: projects.length,
    inProgress: projects.filter(
      (p) => p.status === 'In Progress'
    ).length,
    delivered: projects.filter(
      (p) => p.status === 'Delivered'
    ).length,
    onHold: projects.filter(
      (p) => p.status === 'On Hold'
    ).length,
  };

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Projects
          </h1>

          <p className="text-sm text-gray-500 mt-0.5">
            Manage and track all client projects
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'projects' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus size={17} />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center gap-6">

          <button
            onClick={() => setActiveTab('projects')}
            className={`relative flex items-center gap-2 px-1 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'projects'
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <TrendingUp size={16} />
            Projects

            {activeTab === 'projects' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`relative flex items-center gap-2 px-1 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <ListTodo size={16} />
            Ongoing Tasks

            {activeTab === 'tasks' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

        </div>
      </div>

      {/* ============================================================
          PROJECTS TAB
      ============================================================ */}
      {activeTab === 'projects' && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            <StatCard
              title="Total Projects"
              value={stats.total}
              icon={TrendingUp}
              iconColor="text-blue-600"
              bg="bg-blue-50 border-blue-100"
            />

            <StatCard
              title="In Progress"
              value={stats.inProgress}
              icon={AlertCircle}
              iconColor="text-yellow-600"
              bg="bg-yellow-50 border-yellow-100"
            />

            <StatCard
              title="Delivered"
              value={stats.delivered}
              icon={CheckCircle2}
              iconColor="text-green-600"
              bg="bg-green-50 border-green-100"
            />

            <StatCard
              title="On Hold"
              value={stats.onHold}
              icon={Clock}
              iconColor="text-red-500"
              bg="bg-red-50 border-red-100"
            />

          </div>

          {/* Project list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />

              <p className="text-gray-500 text-sm">
                Loading projects...
              </p>
            </div>
          ) : (
            <ProjectList
              projects={projects}
              onUpdate={fetchProjects}
            />
          )}
        </>
      )}

      {/* ============================================================
          ONGOING TASKS TAB
      ============================================================ */}
      {activeTab === 'tasks' && (
        <OngoingTasks />
      )}

      {/* New project modal */}
      {showForm && (
        <ProjectForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            fetchProjects();
          }}
        />
      )}

    </div>
  );
}

/* ================================================================
   STAT CARD
================================================================ */

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  bg,
}: {
  title: string;
  value: number;
  icon: any;
  iconColor: string;
  bg: string;
}) {
  return (
    <div
      className={`${bg} border rounded-xl p-5 flex items-center justify-between`}
    >
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {title}
        </p>

        <p className="text-3xl font-bold text-gray-900 mt-1">
          {value}
        </p>
      </div>

      <div className="bg-white p-2.5 rounded-lg shadow-sm">
        <Icon size={22} className={iconColor} />
      </div>
    </div>
  );
}

/* ================================================================
   ONGOING TASKS
================================================================ */

function OngoingTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/tasks`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!res.ok) {
        console.error(
          'Failed to fetch tasks:',
          await res.text()
        );

        setTasks([]);
        return;
      }

      const data = await res.json();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.tasks)
        ? data.tasks
        : [];

      /*
       * Only show tasks that are currently active.
       */
      const activeTasks = list.filter((task: any) => {
        const status = String(
          task.status || ''
        ).toLowerCase();

        return (
          status === 'in progress' ||
          status === 'in_progress' ||
          status === 'ongoing' ||
          status === 'review' ||
          status === 'pending'
        );
      });

      setTasks(activeTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    const query = search.toLowerCase();

    return (
      String(task.title || task.task_title || '')
        .toLowerCase()
        .includes(query) ||
      String(
        task.project_name ||
          task.project?.title ||
          task.project_title ||
          ''
      )
        .toLowerCase()
        .includes(query) ||
      String(
        task.assigned_to_name ||
          task.developer_name ||
          task.assigned_developer ||
          ''
      )
        .toLowerCase()
        .includes(query)
    );
  });

  const inProgressCount = tasks.filter((task) => {
    const status = String(task.status || '').toLowerCase();

    return (
      status === 'in progress' ||
      status === 'in_progress'
    );
  }).length;

  const reviewCount = tasks.filter((task) => {
    return String(task.status || '').toLowerCase() === 'review';
  }).length;

  const pendingCount = tasks.filter((task) => {
    return String(task.status || '').toLowerCase() === 'pending';
  }).length;

  return (
    <div className="space-y-6">

      {/* Task stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <StatCard
          title="Active Tasks"
          value={tasks.length}
          icon={ListTodo}
          iconColor="text-blue-600"
          bg="bg-blue-50 border-blue-100"
        />

        <StatCard
          title="In Progress"
          value={inProgressCount}
          icon={Clock}
          iconColor="text-yellow-600"
          bg="bg-yellow-50 border-yellow-100"
        />

        <StatCard
          title="In Review"
          value={reviewCount}
          icon={CheckCircle2}
          iconColor="text-purple-600"
          bg="bg-purple-50 border-purple-100"
        />

        <StatCard
          title="Pending"
          value={pendingCount}
          icon={AlertCircle}
          iconColor="text-orange-600"
          bg="bg-orange-50 border-orange-100"
        />

      </div>

      {/* Search + refresh */}
      <div className="flex items-center gap-3">

        <div className="relative flex-1">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search task, project, developer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
        </div>

        <button
          onClick={fetchTasks}
          className="flex items-center justify-center w-10 h-10 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          title="Refresh tasks"
        >
          <RefreshCw size={16} className="text-gray-500" />
        </button>

      </div>

      {/* Task table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />

          <p className="text-gray-500 text-sm">
            Loading ongoing tasks...
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1000px]">

              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70">

                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Task
                  </th>

                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Project
                  </th>

                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Developer
                  </th>

                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>

                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Priority
                  </th>

                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Due Date
                  </th>

                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Progress
                  </th>

                </tr>
              </thead>

              <tbody>

                {filteredTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <ListTodo
                        size={35}
                        className="mx-auto text-gray-300 mb-3"
                      />

                      <p className="text-sm font-medium text-gray-600">
                        No ongoing tasks
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        Active tasks will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task, index) => {

                    const title =
                      task.title ||
                      task.task_title ||
                      'Untitled Task';

                    const projectName =
                      task.project_name ||
                      task.project?.title ||
                      task.project_title ||
                      '—';

                    const developer =
                      task.assigned_to_name ||
                      task.developer_name ||
                      task.assigned_developer ||
                      task.assigned_user_name ||
                      'Unassigned';

                    const status =
                      task.status || 'Pending';

                    const priority =
                      task.priority || 'Medium';

                    const dueDate =
                      task.due_date ||
                      task.end_date ||
                      task.deadline;

                    const progress = Math.min(
                      100,
                      Math.max(
                        0,
                        Number(
                          task.progress_percentage ??
                            task.progress ??
                            0
                        )
                      )
                    );

                    return (
                      <tr
                        key={task.id || index}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >

                        {/* Task */}
                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2">

                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />

                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {title}
                              </p>

                              {task.description && (
                                <p className="text-xs text-gray-400 mt-0.5 max-w-[250px] truncate">
                                  {task.description}
                                </p>
                              )}
                            </div>

                          </div>

                        </td>

                        {/* Project */}
                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-700">
                            {projectName}
                          </span>
                        </td>

                        {/* Developer */}
                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-700">
                            {developer}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
                              String(status).toLowerCase() ===
                              'review'
                                ? 'bg-purple-50 text-purple-700 border-purple-100'
                                : String(status).toLowerCase() ===
                                  'pending'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                : 'bg-blue-50 text-blue-700 border-blue-100'
                            }`}
                          >
                            {status}
                          </span>

                        </td>

                        {/* Priority */}
                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                              String(priority).toLowerCase() ===
                              'critical'
                                ? 'bg-red-50 text-red-700'
                                : String(priority).toLowerCase() ===
                                  'high'
                                ? 'bg-orange-50 text-orange-700'
                                : String(priority).toLowerCase() ===
                                  'low'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {priority}
                          </span>

                        </td>

                        {/* Due date */}
                        <td className="px-5 py-4">

                          <span className="text-sm text-gray-600">
                            {dueDate
                              ? new Date(
                                  dueDate
                                ).toLocaleDateString(
                                  'en-IN',
                                  {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  }
                                )
                              : '—'}
                          </span>

                        </td>

                        {/* Progress */}
                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2 min-w-[110px]">

                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{
                                  width: `${progress}%`,
                                }}
                              />
                            </div>

                            <span className="text-xs font-medium text-gray-600 w-8">
                              {progress}%
                            </span>

                          </div>

                        </td>

                      </tr>
                    );
                  })
                )}

              </tbody>

            </table>

          </div>

          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {filteredTasks.length} active task
            {filteredTasks.length !== 1 ? 's' : ''}
          </div>

        </div>
      )}

    </div>
  );
}