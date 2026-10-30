import { Student, PaymentRecord, BillingCycle, SystemNotification, SupabaseConfig, Comunicado } from '../types';
import { INITIAL_STUDENTS, INITIAL_PAYMENTS, INITIAL_CYCLES, INITIAL_NOTIFICATIONS } from '../data/mockData';
import { DEFAULT_SUPABASE_CONFIG } from './supabaseClient';

const STORAGE_KEYS = {
  CLEARED_FLAG: 'geckops_sample_data_cleared',
  STUDENTS: 'geckops_students_data',
  PAYMENTS: 'geckops_payments_data',
  CYCLES: 'geckops_billing_cycles_data',
  NOTIFICATIONS: 'geckops_notifications_data',
  COMUNICADOS: 'geckops_comunicados_data',
  SUPABASE_CONFIG: 'geckops_supabase_config',
  SEDES: 'geckops_sedes',
};

export const DEFAULT_SEDES = ['Tlalnepantla', 'Cuautitlán Izcalli'];

// Known sample IDs to ensure they are never resurrected
const KNOWN_SAMPLE_STUDENT_IDS = new Set(['std-1', 'std-2', 'std-3', 'std-4', 'std-5', 'std-6']);
const KNOWN_SAMPLE_PAYMENT_IDS = new Set(['pay-001', 'pay-002', 'pay-003', 'pay-004', 'pay-005', 'pay-006', 'pay-007']);

export const getStoredSedes = (): string[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.SEDES);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fallback
    }
  }
  return DEFAULT_SEDES;
};

export const saveSedes = (sedes: string[]): void => {
  localStorage.setItem(STORAGE_KEYS.SEDES, JSON.stringify(sedes));
};

export const isSampleDataCleared = (): boolean => {
  // Always true by default so sample data is never re-introduced
  const flag = localStorage.getItem(STORAGE_KEYS.CLEARED_FLAG);
  if (flag === null) {
    localStorage.setItem(STORAGE_KEYS.CLEARED_FLAG, 'true');
    return true;
  }
  return flag === 'true';
};

export const getStoredStudents = (): Student[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  if (saved) {
    try {
      const parsed: Student[] = JSON.parse(saved);
      // Filter out any remnant sample student IDs
      const cleaned = parsed.filter((s) => !KNOWN_SAMPLE_STUDENT_IDS.has(s.id));
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
    }
  }
  return INITIAL_STUDENTS; // Empty array
};

export const saveStudents = (students: Student[]): void => {
  // Never save known sample students
  const filtered = students.filter((s) => !KNOWN_SAMPLE_STUDENT_IDS.has(s.id));
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(filtered));
};

export const getStoredPayments = (): PaymentRecord[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
  if (saved) {
    try {
      const parsed: PaymentRecord[] = JSON.parse(saved);
      // Filter out any remnant sample payments
      const cleaned = parsed.filter((p) => !KNOWN_SAMPLE_PAYMENT_IDS.has(p.id));
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
    }
  }
  return INITIAL_PAYMENTS; // Empty array
};

export const savePayments = (payments: PaymentRecord[]): void => {
  const filtered = payments.filter((p) => !KNOWN_SAMPLE_PAYMENT_IDS.has(p.id));
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(filtered));
};

export const getStoredCycles = (): BillingCycle[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.CYCLES);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return INITIAL_CYCLES; // Empty array
};

export const saveCycles = (cycles: BillingCycle[]): void => {
  localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(cycles));
};

export const getStoredNotifications = (): SystemNotification[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return INITIAL_NOTIFICATIONS; // Empty array
};

export const saveNotifications = (notifs: SystemNotification[]): void => {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
};

export const getSupabaseConfig = (): SupabaseConfig => {
  const saved = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    } catch {
      // fallback
    }
  }
  // Default to configured user credentials
  return {
    url: DEFAULT_SUPABASE_CONFIG.url,
    anonKey: DEFAULT_SUPABASE_CONFIG.anonKey,
    connected: true,
    lastSync: new Date().toISOString(),
  };
};

export const saveSupabaseConfig = (config: SupabaseConfig): void => {
  localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
};

/**
 * Permanently wipes sample data from the browser and sets the persistence flag
 * so the browser will NEVER reload sample data on subsequent visits.
 */
export const wipeAllSampleData = (): { success: boolean; message: string } => {
  localStorage.setItem(STORAGE_KEYS.CLEARED_FLAG, 'true');
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));

  return {
    success: true,
    message: 'Todos los registros de muestra fueron eliminados permanentemente del sistema.',
  };
};

export const restoreSampleData = (): void => {
  // Purged per user request
};

export const getStoredComunicados = (): Comunicado[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.COMUNICADOS);
  if (saved) {
    try {
      const parsed: Comunicado[] = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
};

export const saveStoredComunicados = (comunicados: Comunicado[]): void => {
  localStorage.setItem(STORAGE_KEYS.COMUNICADOS, JSON.stringify(comunicados));
};
