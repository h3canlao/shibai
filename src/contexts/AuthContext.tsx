import React, { createContext, useContext, useState, useEffect } from "react";
import userService from "../services/userService";

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  token: string | null;
  loading: boolean;
  login: (token: string, refreshToken: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    const storedToken = localStorage.getItem("token");
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const testUser = localStorage.getItem("user");
    
    // Check for test user first (for testing)
    if (isAuthenticated === "true" && testUser) {
      try {
        const userData = JSON.parse(testUser);
        setUser(userData);
        setToken(storedToken);
        setIsAuthenticated(true);
        setLoading(false);
        return;
      } catch (error) {
        console.error("Error parsing test user:", error);
      }
    }
    
    // If we have a token but no test user, try to create a basic user object
    if (storedToken && !testUser) {
      console.log('🔄 No test user found, creating basic user from token');
      const basicUser = {
        id: 'temp-user-id',
        email: 'user@example.com',
        userName: 'User',
        fullName: 'User'
      };
      setUser(basicUser);
      setToken(storedToken);
      setIsAuthenticated(true);
      setLoading(false);
      return;
    }
    
    // Check for real token
    if (!storedToken) {
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Checking auth with token:', storedToken?.substring(0, 20) + '...');
      const userData = await userService.getProfile();
      console.log('✅ User profile loaded:', userData);
      setUser(userData);
      setToken(storedToken);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: error instanceof Error && 'response' in error ? (error as any).response?.status : 'No status',
        data: error instanceof Error && 'response' in error ? (error as any).response?.data : 'No data'
      });
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("isAuthenticated");
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (token: string, refreshToken?: string) => {
    localStorage.setItem("token", token);
    setToken(token);
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
    setIsAuthenticated(true);
    checkAuth();
  };

  const logout = async () => {
    try {
      await userService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("isAuthenticated");
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, token, loading, login, logout, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
