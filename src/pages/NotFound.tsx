import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <section className="flex items-center min-h-screen px-4 py-12 sm:px-6 md:px-8 lg:px-12 xl:px-16">
      <section className="w-full space-y-6 text-center">
        <section className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl animate-bounce text-cicada-primary">
            404
          </h1>
          <p className="text-muted-foreground">
            Looks like you've ventured into the unknown digital realm.
          </p>
        </section>
        <Link
          to="/"
          className="inline-flex h-10 items-center rounded-md bg-cicada-secondary px-8 text-sm font-medium text-white shadow transition-colors hover:bg-cicada-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cicada-primary disabled:pointer-events-none disabled:opacity-50 dark:bg-cicada-secondary dark:text-white dark:hover:bg-cicada-primary dark:focus-visible:ring-cicada-primary"
        >
          Return to CICADA
        </Link>
      </section>
    </section>
  );
};

export default NotFound;
