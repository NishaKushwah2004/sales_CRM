import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { AuthContext } from "./auth-context";
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api
      .get("/auth/me")
      .then((response) => {
        if (active) setUser(response.data.data.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const value = useMemo(
    () => ({
      user,
      loading,
      async login(email, password) {
        const response = await api.post("/auth/login", { email, password });
        setUser(response.data.data.user);
        return response.data.data.user;
      },
      async logout() {
        await api.post("/auth/logout");
        setUser(null);
      },
    }),
    [user, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
