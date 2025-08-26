import React, { createContext, useContext, useState, useEffect } from 'react';

interface PersonalityProfile {
  name: string;
  tagline: string;
  description: string;
  traits: any;
}

interface TempQuizData {
  personalityProfile: PersonalityProfile | null;
  profileAnswers: {
    skillLevel: string;
    avoidProjects: string[];
    physicalCapability: string;
    homeOwnership: string;
    homeBuildYear: string;
    homeState: string;
    preferredLearningMethods: string[];
    ownedTools: any[];
    fullName: string;
    nickname: string;
  } | null;
  hasUnsavedData: boolean;
}

interface TempQuizContextType {
  tempData: TempQuizData;
  saveTempPersonalityProfile: (profile: PersonalityProfile) => void;
  saveTempProfileAnswers: (answers: any) => void;
  clearTempData: () => void;
  hasUnsavedData: boolean;
}

const TempQuizContext = createContext<TempQuizContextType | undefined>(undefined);

export const TempQuizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tempData, setTempData] = useState<TempQuizData>({
    personalityProfile: null,
    profileAnswers: null,
    hasUnsavedData: false
  });

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('tempQuizData');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTempData(parsed);
      } catch (error) {
        console.error('Error parsing temp quiz data from localStorage:', error);
      }
    }
  }, []);

  // Save to localStorage whenever tempData changes
  useEffect(() => {
    if (tempData.hasUnsavedData) {
      localStorage.setItem('tempQuizData', JSON.stringify(tempData));
    }
  }, [tempData]);

  const saveTempPersonalityProfile = (profile: PersonalityProfile) => {
    setTempData(prev => ({
      ...prev,
      personalityProfile: profile,
      hasUnsavedData: true
    }));
  };

  const saveTempProfileAnswers = (answers: any) => {
    setTempData(prev => ({
      ...prev,
      profileAnswers: answers,
      hasUnsavedData: true
    }));
  };

  const clearTempData = () => {
    setTempData({
      personalityProfile: null,
      profileAnswers: null,
      hasUnsavedData: false
    });
    localStorage.removeItem('tempQuizData');
  };

  return (
    <TempQuizContext.Provider value={{
      tempData,
      saveTempPersonalityProfile,
      saveTempProfileAnswers,
      clearTempData,
      hasUnsavedData: tempData.hasUnsavedData
    }}>
      {children}
    </TempQuizContext.Provider>
  );
};

export const useTempQuiz = () => {
  const context = useContext(TempQuizContext);
  if (context === undefined) {
    throw new Error('useTempQuiz must be used within a TempQuizProvider');
  }
  return context;
};