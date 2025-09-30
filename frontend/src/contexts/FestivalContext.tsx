import React, { createContext, useContext, useState, useEffect } from 'react';

interface FestivalContextType {
  festivalMode: boolean;
  setFestivalMode: (mode: boolean) => void;
}

const FestivalContext = createContext<FestivalContextType | undefined>(undefined);

export const FestivalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [festivalMode, setFestivalModeState] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('festivalMode');
    if (stored) {
      setFestivalModeState(JSON.parse(stored));
    }
  }, []);

  const setFestivalMode = (mode: boolean) => {
    setFestivalModeState(mode);
    localStorage.setItem('festivalMode', JSON.stringify(mode));
    document.body.classList.toggle('festival-mode', mode);
  };

  return (
    <FestivalContext.Provider value={{ festivalMode, setFestivalMode }}>
      {children}
    </FestivalContext.Provider>
  );
};

export const useFestival = () => {
  const context = useContext(FestivalContext);
  if (!context) {
    throw new Error('useFestival must be used within a FestivalProvider');
  }
  return context;
};
