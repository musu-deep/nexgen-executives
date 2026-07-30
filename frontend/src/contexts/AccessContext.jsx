import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "./AuthContext";

const AccessContext = createContext({
  loading: true,
  profile: null,
  permissions: [],
  can: () => false,
  refreshAccess: async () => {},
});

export function AccessProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshAccess = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get("/access/me");
      setProfile(response.data);
    } catch {
      setProfile({ permissions: [], roles: [], assignments: [], groups: [], delegations: [] });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refreshAccess();
  }, [authLoading, refreshAccess]);

  const permissions = profile?.permissions || [];
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const can = useCallback(
    (permission) => !permission || permissionSet.has("*") || permissionSet.has(permission),
    [permissionSet],
  );

  return (
    <AccessContext.Provider value={{ loading, profile, permissions, can, refreshAccess }}>
      {children}
    </AccessContext.Provider>
  );
}

export const useAccess = () => useContext(AccessContext);
