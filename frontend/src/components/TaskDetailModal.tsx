import React from 'react';
import { Calendar, User, Clock } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { StatusBadge, PriorityBadge } from './ui/Badge';
import { TaskResponse } from '../types';
import { formatDateTime } from '../utils/format';

interface TaskDetailModalProps {
  task: TaskResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (task: TaskResponse) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onEdit,
}) => {
  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Task Details" maxWidth="lg">
      <div className="space-y-6">
        {/* Title and Badges */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <span className="text-xs text-slate-400 font-mono">ID: #{task.id}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{task.title}</h2>
        </div>

        {/* Description */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Description
          </h4>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {task.description || 'No description provided.'}
          </p>
        </div>

        {/* Metadata info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>
              <strong className="text-slate-700 dark:text-slate-300">Due: </strong>
              {formatDateTime(task.due_date)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>
              <strong className="text-slate-700 dark:text-slate-300">Created: </strong>
              {formatDateTime(task.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>
              <strong className="text-slate-700 dark:text-slate-300">Updated: </strong>
              {formatDateTime(task.updated_at)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <span>
              <strong className="text-slate-700 dark:text-slate-300">Owner ID: </strong>
              {task.owner_id}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onClose();
              onEdit(task);
            }}
          >
            Edit Task
          </Button>
        </div>
      </div>
    </Modal>
  );
};
