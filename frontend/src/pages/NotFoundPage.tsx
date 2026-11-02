import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Page Not Found
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          The view or resource you are looking for doesn't exist or has been relocated.
        </p>
        <Link to="/dashboard">
          <Button leftIcon={<ArrowLeft className="w-4 h-4" />}>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
};

