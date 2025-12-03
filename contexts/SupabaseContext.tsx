// contexts/SupabaseContext.tsx
import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { SupabaseClient, createSupabaseClient } from '../lib/supabaseClient';
import SupabaseConfigScreen from '../components/SupabaseConfigScreen';
import LocalConnectionSettings from '../components/LocalConnectionSettings';
import { localDb } from '../services/DatabaseService';

interface SupabaseContextType {
  supabase: any; // Changed to any to support both SupabaseClient and localDb
  isConfigured: boolean;
  connectionType: 'supabase' | 'local';
  configureSupabase: (url: string, key: string) => void;
  checkConnection: () => Promise<boolean>;
  setConnectionType: (type: 'supabase' | 'local') => void;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export const SupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [supabase, setSupabase] = useState<any | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [connectionType, setConnectionType] = useState<'supabase' | 'local'>('supabase');

  useEffect(() => {
    // Check localStorage for saved preference
    const savedType = localStorage.getItem('connectionType') as 'supabase' | 'local';
    if (savedType) {
      setConnectionType(savedType);
    }

    if (savedType === 'local') {
      const savedConfig = localStorage.getItem('localDbConfig');
      if (savedConfig) {
        // Attempt to connect automatically
        const config = JSON.parse(savedConfig);
        localDb.connect({ ...config, port: parseInt(config.port) }).then(result => {
          if (result.success) {
            setSupabase(localDb);
            setIsConfigured(true);
          }
        });
      }
    } else {
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
    }
  }, []);

  const configureSupabase = (url: string, key: string) => {
    try {
      const client = createSupabaseClient(url, key);
      setSupabase(client);
      setIsConfigured(true);
      setConnectionType('supabase');
      // Save to localStorage
      localStorage.setItem('supabaseUrl', url);
      localStorage.setItem('supabaseKey', key);
      localStorage.setItem('connectionType', 'supabase');
    } catch (error) {
      console.error("Failed to configure Supabase:", error);
      alert("Failed to connect to Supabase. Please check the URL and Key.");
    }
  };

  const handleLocalConnect = () => {
    setSupabase(localDb);
    setIsConfigured(true);
    setConnectionType('local');
  };

  const checkConnection = async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.from('products').select('id').limit(1);
      return !error;
    } catch (error) {
      return false;
    }
  };

  const updateConnectionType = (type: 'supabase' | 'local') => {
    setConnectionType(type);
    localStorage.setItem('connectionType', type);
  };

  const value = useMemo(() => ({
    supabase,
    isConfigured,
    connectionType,
    configureSupabase,
    checkConnection,
    setConnectionType: updateConnectionType
  }), [supabase, isConfigured, connectionType]);

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setConnectionType('supabase')}
            className={`px-4 py-2 rounded-md ${connectionType === 'supabase' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Supabase Cloud
          </button>
          <button
            onClick={() => setConnectionType('local')}
            className={`px-4 py-2 rounded-md ${connectionType === 'local' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Local Database
          </button>
        </div>

        {connectionType === 'supabase' ? (
          <SupabaseConfigScreen onConfigured={configureSupabase} />
        ) : (
          <LocalConnectionSettings onConnect={handleLocalConnect} />
        )}
      </div>
    );
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
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
