import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Shield, Activity, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { formatDateTime } from '../utils/format';
import { taskService } from '../services/tasks';
import { HealthReadyResponse } from '../types';

export const ProfilePage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { success, error: toastError } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [health, setHealth] = useState<HealthReadyResponse | null>(null);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refreshProfile();
      const healthData = await taskService.checkHealthReady();
      setHealth(healthData);
      success('Profile & system diagnostics refreshed.');
    } catch {
      toastError('Failed to refresh data from server.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    taskService
      .checkHealthReady()
      .then(setHealth)
      .catch(() => null);
  }, []);

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            User Account & System
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authenticated identity details and backend infrastructure status.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          isLoading={isRefreshing}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Refresh
        </Button>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-2xl flex items-center justify-center shadow-md">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {user?.full_name || 'Platform Member'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {user?.is_active ? 'Active User' : 'Inactive'}
              </span>
              <span className="text-xs text-slate-400 font-mono">User ID: #{user?.id}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email Address
              </p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Full Name
              </p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                {user?.full_name || 'Not provided'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Account Created
              </p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                {formatDateTime(user?.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Profile Last Updated
              </p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                {formatDateTime(user?.updated_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Backend Infrastructure Diagnostics */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Backend Infrastructure Health
          </h3>
        </div>

        {health ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400 font-semibold uppercase">API Readiness</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 capitalize">
                {health.status} ({health.environment})
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400 font-semibold uppercase">Database Status</p>
              <p
                className={`text-sm font-bold mt-1 capitalize ${
                  health.database === 'healthy'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-500'
                }`}
              >
                {health.database}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400 font-semibold uppercase">Redis Cache</p>
              <p
                className={`text-sm font-bold mt-1 capitalize ${
                  health.redis === 'healthy'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-500'
                }`}
              >
                {health.redis}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Checking `/health/ready` endpoint...</p>
        )}
      </div>
    </div>
  );
};
