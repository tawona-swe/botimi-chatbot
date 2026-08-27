"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [vendor, setVendor] = useState(null);
  const [teamMember, setTeamMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    if (api.isAuthenticated()) {
      api.getMe()
        .then((data) => {
          setVendor(data.vendor);
          setTeamMember(data.teamMember || null);
        })
        .catch(() => {
          api.setToken(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email, password, companyName, name, industry) => {
    setError(null);
    try {
      const data = await api.signup(email, password, companyName, name, industry);
      api.setToken(data.token);
      setVendor(data.vendor);
      setTeamMember(null);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const data = await api.login(email, password);
      api.setToken(data.token);
      setVendor(data.vendor);
      setTeamMember(data.teamMember || null);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const loginWithGoogleCredential = useCallback(async (credential) => {
    setError(null);
    try {
      const data = await api.googleSignIn(credential);
      api.setToken(data.token);
      setVendor(data.vendor);
      setTeamMember(null);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors
    }
    api.setToken(null);
    setVendor(null);
    setTeamMember(null);
  }, []);

  const refreshVendor = useCallback(async () => {
    try {
      const data = await api.getMe();
      setVendor(data.vendor);
      setTeamMember(data.teamMember || null);
    } catch {
      // Ignore refresh errors
    }
  }, []);

  return (
    <AuthContext.Provider value={{ vendor, teamMember, loading, error, signup, login, loginWithGoogleCredential, logout, refreshVendor, isAuthenticated: !!vendor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export default AuthContext;
