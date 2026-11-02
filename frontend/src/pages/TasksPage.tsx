import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  ArrowUpDown,
  Trash2,
  Edit2,
  CheckCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ListTodo,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { taskService } from '../services/tasks';
import {
  TaskResponse,
  TaskStatus,
  TaskPriority,
  TaskQueryParams,
} from '../types';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState, Skeleton } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { TaskFormModal } from '../components/TaskFormModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { formatDate } from '../utils/format';
import { getErrorMessage } from '../services/api';

export const TasksPage: React.FC = () => {
  const { success, error: toastError } = useToast();

  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters and Pagination
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'due_date' | 'title' | 'priority' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);
  const pageSize = 8;

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<TaskResponse | null>(null);
  const [viewingTask, setViewingTask] = useState<TaskResponse | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: TaskQueryParams = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter as TaskStatus;
      }
      if (priorityFilter !== 'all') {
        params.priority = priorityFilter as TaskPriority;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const res = await taskService.listTasks(params);
      setTasks(res.items);
      setTotal(res.total);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, priorityFilter, searchTerm, sortBy, sortOrder, toastError]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateOrUpdate = async (payload: {
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_date?: string | null;
  }) => {
    try {
      setIsActionLoading(true);
      if (editingTask) {
        await taskService.updateTask(editingTask.id, payload);
        success(`Task #${editingTask.id} updated successfully!`);
      } else {
        await taskService.createTask(payload);
        success('New task created successfully!');
      }
      setIsFormOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTaskId) return;
    try {
      setIsActionLoading(true);
      await taskService.deleteTask(deletingTaskId);
      success(`Task #${deletingTaskId} deleted successfully!`);
      setDeletingTaskId(null);
      fetchTasks();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleComplete = async (task: TaskResponse) => {
    try {
      const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
      await taskService.updateTask(task.id, { status: nextStatus });
      success(
        nextStatus === 'completed'
          ? `Task #${task.id} marked completed!`
          : `Task #${task.id} moved back to pending.`
      );
      fetchTasks();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Task Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create, filter, update and manage your team’s operational workflow.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTask(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shadow-md"
        >
          Create Task
        </Button>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks by title..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent Priority</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as 'created_at' | 'updated_at' | 'due_date' | 'title' | 'priority' | 'status'
                )
              }
              className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="created_at">Sort: Created Date</option>
              <option value="due_date">Sort: Due Date</option>
              <option value="title">Sort: Title</option>
              <option value="priority">Sort: Priority</option>
              <option value="status">Sort: Status</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Switch to ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tasks Table / Card List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={ListTodo}
              title="No tasks match criteria"
              description="Try adjusting your search terms or filter selections, or create a brand new task."
              actionLabel="Create Task"
              onAction={() => {
                setEditingTask(null);
                setIsFormOpen(true);
              }}
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Mark complete toggle checkbox */}
                  <button
                    onClick={() => handleToggleComplete(task)}
                    title={
                      task.status === 'completed'
                        ? 'Mark task as incomplete'
                        : 'Mark task as completed'
                    }
                    className={`mt-0.5 p-1 rounded-lg border transition-colors shrink-0 ${
                      task.status === 'completed'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-700 text-transparent hover:border-indigo-500'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                      <span className="text-xs text-slate-400">
                        Due: {formatDate(task.due_date)}
                      </span>
                    </div>

                    <h3
                      className={`text-sm font-semibold truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 ${
                        task.status === 'completed'
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                      onClick={() => setViewingTask(task)}
                    >
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => setViewingTask(task)}
                    title="View Details"
                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setEditingTask(task);
                      setIsFormOpen(true);
                    }}
                    title="Edit Task"
                    className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeletingTaskId(task.id)}
                    title="Delete Task"
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <strong className="text-slate-900 dark:text-slate-100">{tasks.length}</strong> of{' '}
            <strong className="text-slate-900 dark:text-slate-100">{total}</strong> total tasks
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <TaskFormModal
        isOpen={isFormOpen}
        task={editingTask}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleCreateOrUpdate}
        isLoading={isActionLoading}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={!!viewingTask}
        task={viewingTask}
        onClose={() => setViewingTask(null)}
        onEdit={(task) => {
          setViewingTask(null);
          setEditingTask(task);
          setIsFormOpen(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deletingTaskId}
        onClose={() => setDeletingTaskId(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to permanently delete task #${deletingTaskId}? This action cannot be undone.`}
        confirmText="Delete Task"
        isDestructive
        isLoading={isActionLoading}
      />
    </div>
  );
};
