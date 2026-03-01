import { useEffect, useRef, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckinContext } from '../providers/CheckinProvider';
import { useAuth } from './useAuth';
import { CheckinFormData } from '../types';

export function useCheckinDraft() {
  const { form, restoreForm, step, setStep } = useContext(CheckinContext);
  const { client } = useAuth();
  const restored = useRef(false);

  const draftKey = client
    ? `fbf-draft-${client.id}-${new Date().toISOString().split('T')[0]}`
    : null;

  // Restore draft on mount
  useEffect(() => {
    if (!draftKey || restored.current) return;
    restored.current = true;

    AsyncStorage.getItem(draftKey).then((saved) => {
      if (saved) {
        try {
          const { form: savedForm, step: savedStep } = JSON.parse(saved);
          if (savedForm) restoreForm(savedForm);
          if (typeof savedStep === 'number') setStep(savedStep);
        } catch {
          // ignore corrupt draft
        }
      }
    });
  }, [draftKey, restoreForm, setStep]);

  // Save draft on changes
  useEffect(() => {
    if (!draftKey) return;
    const timeout = setTimeout(() => {
      AsyncStorage.setItem(draftKey, JSON.stringify({ form, step }));
    }, 500);
    return () => clearTimeout(timeout);
  }, [form, step, draftKey]);

  const clearDraft = async () => {
    if (draftKey) await AsyncStorage.removeItem(draftKey);
  };

  const hasDraft = async () => {
    if (!draftKey) return false;
    const saved = await AsyncStorage.getItem(draftKey);
    return !!saved;
  };

  return { clearDraft, hasDraft };
}
