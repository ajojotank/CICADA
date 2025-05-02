import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the code and state parameters from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        if (queryParams.get('error')) {
          const errorDescription = queryParams.get('error_description');
          setError(errorDescription || 'Authentication error');
          return;
        }

        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (data?.session) {
          // If session exists, redirect to the main app
          navigate('/');
        } else {
          // If no session, redirect to login
          navigate('/login');
        }
      } catch (err) {
        console.error('Error during auth callback:', err);
        setError('Failed to complete authentication');
        // Redirect to login after a delay
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="p-8 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-red-200 dark:border-red-900 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">Authentication Error</h1>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-md mb-4">
            <p className="text-gray-800 dark:text-gray-300">{error}</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-cicada-secondary hover:bg-cicada-primary text-white py-2.5 px-4 rounded-md transition-colors duration-200"
          >
            <ArrowLeft size={18} />
            <span>Return to login</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="p-8 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-cicada-secondary/20 dark:border-cicada-primary/20 max-w-md w-full">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-cicada-secondary/20 dark:bg-cicada-primary/20 flex items-center justify-center mb-4">
            <Loader2 size={32} className="text-cicada-secondary dark:text-cicada-primary animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-cicada-secondary dark:text-cicada-primary mb-2">Completing authentication</h1>
          <div className="h-1 w-48 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-cicada-secondary dark:bg-cicada-primary animate-pulse rounded-full"></div>
          </div>
        </div>
        <p className="text-gray-700 dark:text-gray-300 text-center">Please wait while we sign you in to your account...</p>
      </div>
    </div>
  );
};

export default AuthCallback;