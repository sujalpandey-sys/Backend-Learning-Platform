import React from 'react';
import { getStatusBadgeConfig, getPriorityBadgeConfig } from '../../utils/format';

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = getStatusBadgeConfig(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const config = getPriorityBadgeConfig(priority);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${config.bg}`}
    >
      {config.label}
    </span>
  );
};

