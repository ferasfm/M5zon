// contexts/SupabaseContext.tsx
import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { SupabaseClient, createSupabaseClient } from '../lib/supabaseClient';
import SupabaseConfigScreen from '../components/SupabaseConfigScreen';

interface SupabaseContextType {
  supabase: SupabaseClient | null;
  isConfigured: boolean;
  configureSupabase: (url: string, key: string) => void;
  checkConnection: () => Promise<boolean>;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export const SupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check localStorage for saved credentials on initial load
    const savedUrl = localStorage.getItem('supabaseUrl');
    const savedKey = localStorage.getItem('supabaseKey');
    if (savedUrl && savedKey) {
      try {
        const client = createSupabaseClient(savedUrl, savedKey);
        setSupabase(client);
        setIsConfigured(true);
      } catch (error) {
        console.error("Failed to initialize Supabase from localStorage:", error);
        localStorage.removeItem('supabaseUrl');
        localStorage.removeItem('supabaseKey');
      }
    }
  }, []);

  const configureSupabase = (url: string, key: string) => {
    try {
      const client = createSupabaseClient(url, key);
      setSupabase(client);
      setIsConfigured(true);
      // Save to localStorage
      localStorage.setItem('supabaseUrl', url);
      localStorage.setItem('supabaseKey', key);
    } catch (error) {
        console.error("Failed to configure Supabase:", error);
        alert("Failed to connect to Supabase. Please check the URL and Key.");
    }
  };

  const checkConnection = async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.from('products').select('count').limit(1);
      return !error;
    } catch (error) {
      return false;
    }
  };
  
  const value = useMemo(() => ({ supabase, isConfigured, configureSupabase, checkConnection }), [supabase, isConfigured]);

  return (
    <SupabaseContext.Provider value={value}>
      {isConfigured ? children : <SupabaseConfigScreen onConfigured={configureSupabase} />}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = (): SupabaseContextType => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
