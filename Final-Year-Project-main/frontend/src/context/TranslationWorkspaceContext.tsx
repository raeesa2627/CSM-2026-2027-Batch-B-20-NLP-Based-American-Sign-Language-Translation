import React, { createContext, useContext, useState, useCallback } from 'react';
import { TranslationResult } from '../types';

export type TranslationModuleId = 'text' | 'speech' | 'image';

export interface ModuleWorkspaceState {
  inputText: string;
  strategy: string;
  translationResult: TranslationResult | null;
  currentSignIndex: number;
}

const defaultModuleState = (): ModuleWorkspaceState => ({
  inputText: '',
  strategy: 'rag_grounded',
  translationResult: null,
  currentSignIndex: 0,
});

interface TranslationWorkspaceContextType {
  getModuleState: (moduleId: TranslationModuleId) => ModuleWorkspaceState;
  setModuleInputText: (moduleId: TranslationModuleId, text: string) => void;
  setModuleStrategy: (moduleId: TranslationModuleId, strategy: string) => void;
  setModuleTranslation: (moduleId: TranslationModuleId, result: TranslationResult | null) => void;
  setModuleSignIndex: (moduleId: TranslationModuleId, index: number) => void;
  clearModule: (moduleId: TranslationModuleId) => void;
}

const TranslationWorkspaceContext = createContext<TranslationWorkspaceContextType | undefined>(undefined);

export const TranslationWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modules, setModules] = useState<Record<TranslationModuleId, ModuleWorkspaceState>>({
    text: {
      ...defaultModuleState(),
      inputText: 'HELLO, WHAT YOUR NAME?', // initial default for text workspace
    },
    speech: defaultModuleState(),
    image: defaultModuleState(),
  });

  const getModuleState = useCallback((moduleId: TranslationModuleId): ModuleWorkspaceState => {
    return modules[moduleId] || defaultModuleState();
  }, [modules]);

  const setModuleInputText = useCallback((moduleId: TranslationModuleId, text: string) => {
    setModules(prev => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || defaultModuleState()),
        inputText: text,
      },
    }));
  }, []);

  const setModuleStrategy = useCallback((moduleId: TranslationModuleId, strategy: string) => {
    setModules(prev => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || defaultModuleState()),
        strategy,
      },
    }));
  }, []);

  // When a new translation is set, always initialize progress at item 1 (index 0)
  const setModuleTranslation = useCallback((moduleId: TranslationModuleId, result: TranslationResult | null) => {
    setModules(prev => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || defaultModuleState()),
        translationResult: result,
        currentSignIndex: 0, // Fresh translations always start at the first item
      },
    }));
  }, []);

  // Updates playback index within a specific module without affecting any other module
  const setModuleSignIndex = useCallback((moduleId: TranslationModuleId, index: number) => {
    setModules(prev => {
      const current = prev[moduleId] || defaultModuleState();
      const signsCount = current.translationResult?.signs?.length || 0;
      const boundedIndex = signsCount > 0 ? Math.max(0, Math.min(index, signsCount - 1)) : 0;
      
      if (current.currentSignIndex === boundedIndex) {
        return prev;
      }
      return {
        ...prev,
        [moduleId]: {
          ...current,
          currentSignIndex: boundedIndex,
        },
      };
    });
  }, []);

  const clearModule = useCallback((moduleId: TranslationModuleId) => {
    setModules(prev => ({
      ...prev,
      [moduleId]: defaultModuleState(),
    }));
  }, []);

  return (
    <TranslationWorkspaceContext.Provider
      value={{
        getModuleState,
        setModuleInputText,
        setModuleStrategy,
        setModuleTranslation,
        setModuleSignIndex,
        clearModule,
      }}
    >
      {children}
    </TranslationWorkspaceContext.Provider>
  );
};

export const useTranslationWorkspace = (moduleId: TranslationModuleId) => {
  const context = useContext(TranslationWorkspaceContext);
  if (!context) {
    throw new Error('useTranslationWorkspace must be used within a TranslationWorkspaceProvider');
  }

  const state = context.getModuleState(moduleId);

  const setInputText = useCallback((text: string) => {
    context.setModuleInputText(moduleId, text);
  }, [context, moduleId]);

  const setStrategy = useCallback((strategy: string) => {
    context.setModuleStrategy(moduleId, strategy);
  }, [context, moduleId]);

  const setTranslation = useCallback((result: TranslationResult | null) => {
    context.setModuleTranslation(moduleId, result);
  }, [context, moduleId]);

  const setSignIndex = useCallback((index: number) => {
    context.setModuleSignIndex(moduleId, index);
  }, [context, moduleId]);

  const clear = useCallback(() => {
    context.clearModule(moduleId);
  }, [context, moduleId]);

  return {
    ...state,
    setInputText,
    setStrategy,
    setTranslation,
    setSignIndex,
    clear,
  };
};
