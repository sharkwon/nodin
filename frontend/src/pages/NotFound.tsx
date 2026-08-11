import { Link, useLocation } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();
  return (
    <div className="container-editorial py-20 flex flex-col items-center justify-center text-center">
      <h1 className="text-display text-foreground">404</h1>
      <p className="mt-4 text-h3 text-muted-foreground">Page not found</p>
      <p className="mt-2 text-body-sm text-muted-foreground">{location.pathname}</p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-1 text-body-sm text-accent hover:text-foreground transition-colors"
      >
        ← Back to home
      </Link>
    </div>
  );
}
