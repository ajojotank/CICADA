import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredAdmin = false,
}) => {
  const { user, isLoading, isAdmin } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="p-8 rounded-lg bg-white dark:bg-gray-800 shadow-md">
          <h1 className="text-2xl font-bold mb-2">Checking authentication...</h1>
          <p className="text-gray-700 dark:text-gray-300">Please wait.</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to home if not admin but admin route is required
  if (requiredAdmin && !isAdmin) {
    return <Navigate to="/home" replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
};

export default ProtectedRoute;