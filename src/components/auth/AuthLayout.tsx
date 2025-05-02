
import React from "react";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <section className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <section className="w-full max-w-md space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
        <section className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </section>
        <section className="mt-8 space-y-6">{children}</section>
      </section>
    </section>
  );
};

export default AuthLayout;
