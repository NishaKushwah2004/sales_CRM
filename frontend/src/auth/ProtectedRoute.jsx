import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
        Loading session...
      </main>
    );
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
