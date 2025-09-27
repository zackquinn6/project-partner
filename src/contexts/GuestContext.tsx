import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';

interface GuestData {
  projectRuns: ProjectRun[];
  preferences: Record<string, any>;
  temporaryId: string;
}

interface GuestContextType {
  isGuest: boolean;
  guestData: GuestData;
  setGuestMode: (enabled: boolean) => void;
  addGuestProjectRun: (projectRun: Omit<ProjectRun, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateGuestProjectRun: (projectRun: ProjectRun) => void;
  deleteGuestProjectRun: (projectRunId: string) => void;
  setGuestPreference: (key: string, value: any) => void;
  clearGuestData: () => void;
  transferGuestDataToUser: (userId: string) => Promise<GuestData>;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const useGuest = () => {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
};

interface GuestProviderProps {
  children: ReactNode;
}

export const GuestProvider: React.FC<GuestProviderProps> = ({ children }) => {
  const [isGuest, setIsGuest] = useState(false);
  const [guestData, setGuestData] = useState<GuestData>(() => {
    // Try to load guest data from localStorage
    const saved = localStorage.getItem('guestData');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse guest data:', e);
      }
    }
    return {
      projectRuns: [],
      preferences: {},
      temporaryId: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  });

  // Save guest data to localStorage whenever it changes
  useEffect(() => {
    if (isGuest) {
      localStorage.setItem('guestData', JSON.stringify(guestData));
    }
  }, [guestData, isGuest]);

  const setGuestMode = (enabled: boolean) => {
    setIsGuest(enabled);
    if (!enabled) {
      localStorage.removeItem('guestData');
    }
  };

  const addGuestProjectRun = (projectRun: Omit<ProjectRun, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProjectRun: ProjectRun = {
      ...projectRun,
      id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setGuestData(prev => ({
      ...prev,
      projectRuns: [...prev.projectRuns, newProjectRun]
    }));
  };

  const updateGuestProjectRun = (projectRun: ProjectRun) => {
    setGuestData(prev => ({
      ...prev,
      projectRuns: prev.projectRuns.map(run => 
        run.id === projectRun.id 
          ? { ...projectRun, updatedAt: new Date() }
          : run
      )
    }));
  };

  const deleteGuestProjectRun = (projectRunId: string) => {
    setGuestData(prev => ({
      ...prev,
      projectRuns: prev.projectRuns.filter(run => run.id !== projectRunId)
    }));
  };

  const setGuestPreference = (key: string, value: any) => {
    setGuestData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
  };

  const clearGuestData = () => {
    setGuestData({
      projectRuns: [],
      preferences: {},
      temporaryId: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    localStorage.removeItem('guestData');
  };

  const transferGuestDataToUser = async (userId: string): Promise<GuestData> => {
    const dataToTransfer = { ...guestData };
    clearGuestData();
    setGuestMode(false);
    return dataToTransfer;
  };

  const value = {
    isGuest,
    guestData,
    setGuestMode,
    addGuestProjectRun,
    updateGuestProjectRun,
    deleteGuestProjectRun,
    setGuestPreference,
    clearGuestData,
    transferGuestDataToUser
  };

  return (
    <GuestContext.Provider value={value}>
      {children}
    </GuestContext.Provider>
  );
};