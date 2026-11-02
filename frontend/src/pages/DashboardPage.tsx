import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  ListTodo,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { taskService } from '../services/tasks';
import { TaskResponse, TaskStatus, TaskPriority } from '../types';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton, EmptyState } from '../components/ui/EmptyState';
import { TaskFormModal } from '../components/TaskFormModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { formatDate } from '../utils/format';
import { getErrorMessage } from '../services/api';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<TaskResponse | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Fetch up to 100 recent tasks to compute accurate stats
      const response = await taskService.listTasks({
        limit: 100,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setTasks(response.items);
      setTotalCount(response.total);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real statistics derived from API data
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;

  const handleCreateTask = async (payload: {
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_date?: string | null;
  }) => {
    try {
      setIsSubmittingTask(true);
      await taskService.createTask(payload);
      success('Task created successfully!');
      setIsCreateOpen(false);
      fetchDashboardData();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsSubmittingTask(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-3 backdrop-blur-md">
              <Activity className="w-3.5 h-3.5 text-indigo-300" />
              SaaS Operational Dashboard
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name || user?.email?.split('@')[0]}!
            </h1>
            <p className="mt-1 text-sm text-indigo-200 max-w-xl">
              Manage your engineering tasks, track execution progress, and stay organized with live FastAPI persistence.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="bg-white text-indigo-900 hover:bg-indigo-50 shadow-md font-semibold"
            >
              New Task
            </Button>
          </div>
        </div>
        {/* Subtle background decoration */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Tasks</p>
            {isLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCount}</h3>
            )}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending</p>
            {isLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pendingCount}</h3>
            )}
          </div>
        </div>

        {/* In Progress */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">In Progress</p>
            {isLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{inProgressCount}</h3>
            )}
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed</p>
            {isLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{completedCount}</h3>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tasks Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent Tasks</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest items created in your task queue
            </p>
          </div>
          <Link
            to="/tasks"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>View All Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="No tasks found"
            description="You don't have any tasks in your platform workspace yet."
            actionLabel="Create First Task"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="py-3.5 px-3 -mx-3 rounded-xl flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                    <span className="text-xs text-slate-400 truncate">
                      Due: {formatDate(task.due_date)}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {task.description}
                    </p>
                  )}
                </div>

                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      <TaskFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTask}
        isLoading={isSubmittingTask}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onEdit={() => {
          setSelectedTask(null);
          navigate('/tasks');
        }}
      />
    </div>
  );
};
