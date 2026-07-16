'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('sme_company');
    if (stored) {
      try {
        setCompany(JSON.parse(stored));
      } catch {
        localStorage.removeItem('sme_company');
      }
    }
    setLoading(false);
  }, []);

  const login = (companyData) => {
    setCompany(companyData);
    localStorage.setItem('sme_company', JSON.stringify(companyData));
    router.push('/dashboard');
  };

  const logout = () => {
    setCompany(null);
    localStorage.removeItem('sme_company');
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ company, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
