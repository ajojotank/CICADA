import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AuthButton from "@/components/auth/AuthButton";
import AuthLayout from "@/components/auth/AuthLayout";
import ThemeToggle from "@/components/common/ThemeToggle";
import { Provider } from "@supabase/supabase-js";

const Login = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (providerName: string) => {
    try {
      // Convert provider name to lowercase for Supabase provider format
      const provider = providerName.toLowerCase() as Provider;
      await login(provider);
      // Note: No need to navigate here as the AuthCallback component will handle redirection
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const googleIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24" height="24">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.41 1.49 8.4 3.61l6.25-6.26C34.34 2.78 29.64 0 24 0 14.75 0 6.94 5.84 3.35 14.16l7.87 6.12C13 14.17 17.99 9.5 24 9.5z"/>
      <path fill="#34A853" d="M24 48c6.07 0 11.76-2.34 16.01-6.13l-7.38-6.07C30.5 37.88 27.45 39 24 39c-5.96 0-11.03-4.01-12.84-9.44l-8.01 6.18C7.74 44.16 15.26 48 24 48z"/>
      <path fill="#FBBC05" d="M3.16 14.6C1.14 18.73 0 23.26 0 28c0 4.74 1.14 9.27 3.16 13.4l8.01-6.18C9.52 31.63 9.5 24.92 11.17 19.72l-8.01-6.12z"/>
      <path fill="#4285F4" d="M48 24c0-1.6-.14-3.15-.41-4.64H24v9.14h13.71c-.63 3.19-2.5 5.9-5.3 7.72l7.38 6.07C44.91 37.52 48 31.3 48 24z"/>
    </svg>
  );  

  const facebookIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );  

  const githubIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495 .998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );  

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* Theme toggle */}
      <section className="absolute top-4 right-4">
        <ThemeToggle />
      </section>

      {/* Back to Home */}
      <section className="absolute top-4 left-4">
        <a
          href="/home"
          className="text-l text-cicada-secondary hover:underline font-medium"
        >
          ← Back to Home
        </a>
      </section>

      <AuthLayout
        title="Welcome back"
        subtitle="Sign in to your account to continue"
      >
        <section className="space-y-3">
          <AuthButton
            provider="Google"
            icon={googleIcon}
            onClick={() => handleLogin("google")}
            disabled={isLoading}
          />
          <AuthButton
            provider="Facebook"
            icon={facebookIcon}
            onClick={() => handleLogin("facebook")}
            disabled={isLoading}
          />
          <AuthButton
            provider="Github"
            icon={githubIcon}
            onClick={() => handleLogin("github")}
            disabled={isLoading}
          />
        </section>
      </AuthLayout>
    </section>
  );
};

export default Login;