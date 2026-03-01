import React, { createContext, useState, useCallback } from 'react';
import { CheckinFormData, SupplementItem, PedItem } from '../types';

const INITIAL_FORM: CheckinFormData = {
  weight_lbs: '',
  body_temp: '',
  mood_rating: 5,
  mood_notes: '',
  stress_level: 3,
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
  water_oz: 0,
  steps: '',
  training_done: false,
  training_type: [],
  workout_notes: '',
  workout_description: '',
  rpe: '',
  performance_rating: '',
  cardio_minutes: '',
  estimated_calories_burned: '',
  sleep_hours: 7,
  sleep_quality: 3,
  supplement_compliance: false,
  supplements_json: [],
  ped_log_json: [],
  side_effects_notes: '',
  progress_photo_urls: [],
  general_notes: '',
  bjj_done: false,
  bjj_type: 'gi',
  bjj_rounds: '',
  bjj_round_min: '',
  bjj_rest_min: '',
  bjj_drill_min: '',
  bjj_intensity: 'moderate',
};

export const TOTAL_STEPS = 6;

interface CheckinContextType {
  form: CheckinFormData;
  step: number;
  setStep: (s: number) => void;
  updateForm: (partial: Partial<CheckinFormData>) => void;
  resetForm: () => void;
  restoreForm: (data: CheckinFormData) => void;
}

export const CheckinContext = createContext<CheckinContextType>({
  form: INITIAL_FORM,
  step: 0,
  setStep: () => {},
  updateForm: () => {},
  resetForm: () => {},
  restoreForm: () => {},
});

export function CheckinProvider({ children }: { children: React.ReactNode }) {
  const [form, setForm] = useState<CheckinFormData>(INITIAL_FORM);
  const [step, setStep] = useState(0);

  const updateForm = useCallback((partial: Partial<CheckinFormData>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setStep(0);
  }, []);

  const restoreForm = useCallback((data: CheckinFormData) => {
    setForm(data);
  }, []);

  return (
    <CheckinContext.Provider
      value={{ form, step, setStep, updateForm, resetForm, restoreForm }}
    >
      {children}
    </CheckinContext.Provider>
  );
}
