import React, { createContext, useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface CreatePostContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const CreatePostContext = createContext<CreatePostContextType | undefined>(undefined);

export const CreatePostProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const openModal = () => {
    if (location.pathname !== '/home') {
      navigate('/home');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <CreatePostContext.Provider value={{ isModalOpen, openModal, closeModal }}>
      {children}
    </CreatePostContext.Provider>
  );
};

export const useCreatePost = () => {
  const context = useContext(CreatePostContext);
  if (!context) {
    throw new Error('useCreatePost must be used within a CreatePostProvider');
  }
  return context;
};
