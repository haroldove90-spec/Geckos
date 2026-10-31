import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Student, PaymentRecord, StudentCategory, PaymentType, ExtraPaymentCategory, PaymentMethod, PaymentStatus, Comunicado } from '../types';

export const DEFAULT_SUPABASE_CONFIG = {
  projectName: 'geckos@appdesignsoftware.com',
  projectId: 'avchpdtkogejgnomkxua',
  url: 'https://avchpdtkogejgnomkxua.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2Y2hwZHRrb2dlamdub21reHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NTY2NTYsImV4cCI6MjEwNzUzMjY1Nn0.sGIiPEmI8k5mPIeqb96JFGJj6u4AuhVyhwtTW5HjAKk',
};

// Clean url if user passed rest/v1 or trailing slashes
const sanitizeSupabaseUrl = (url: string) => {
  if (!url) return '';
  let cleaned = url.trim().replace(/\/rest\/v1\/?$/, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
};

// Singleton client instance
let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (url?: string, anonKey?: string): SupabaseClient => {
  let targetUrl = url;
  let targetKey = anonKey;

  if (!targetUrl || !targetKey) {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('geckops_supabase_config') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url && parsed.anonKey) {
          targetUrl = parsed.url;
          targetKey = parsed.anonKey;
        }
      }
    } catch {
      // fallback
    }
  }

  const cleanUrl = sanitizeSupabaseUrl(targetUrl || DEFAULT_SUPABASE_CONFIG.url);
  const cleanKey = (targetKey || DEFAULT_SUPABASE_CONFIG.anonKey).trim();

  if (!supabaseInstance) {
    supabaseInstance = createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseInstance;
};

export const reconfigureSupabaseClient = (url: string, anonKey: string): SupabaseClient => {
  const targetUrl = sanitizeSupabaseUrl(url || DEFAULT_SUPABASE_CONFIG.url);
  const targetKey = (anonKey || DEFAULT_SUPABASE_CONFIG.anonKey).trim();
  supabaseInstance = createClient(targetUrl, targetKey);
  return supabaseInstance;
};

// Mapper: Supabase row -> Student
export const mapRowToStudent = (row: any): Student => {
  return {
    id: row.id || `std-${Date.now()}`,
    fullName: row.full_name || row.fullName || '',
    birthDate: row.birth_date || row.birthDate || '',
    category: (row.category || 'Infantil') as StudentCategory,
    jerseyNumber: Number(row.jersey_number ?? row.jerseyNumber ?? 0),
    branch: (row.branch || 'Femenil') as 'Femenil' | 'Varonil',
    campus: row.campus || 'Tlalnepantla',
    whatsapp: row.whatsapp || '',
    allergies: row.allergies || 'Ninguna reportada',
    chronicCondition: row.chronic_condition || row.chronicCondition || 'Ninguna',
    emergencyPhone: row.emergency_phone || row.emergencyPhone || '',
    monthlyFee: Number(row.monthly_fee ?? row.monthlyFee ?? 750),
    dueDay: Number(row.due_day ?? row.dueDay ?? 5),
    tutorName: row.tutor_name || row.tutorName || '',
    tutorPhone: row.tutor_phone || row.tutorPhone || '',
    tutorEmail: row.tutor_email || row.tutorEmail || '',
    currentBalance: Number(row.current_balance ?? row.currentBalance ?? 0),
    status: (row.status || 'al_corriente') as 'al_corriente' | 'adeudo' | 'en_revision',
    joinedDate: row.joined_date || row.joinedDate || new Date().toISOString().split('T')[0],
    registrationType: (row.registration_type || row.registrationType || 'minor') as 'adult' | 'minor',
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : row.isActive !== undefined ? Boolean(row.isActive) : true,
    photoUrl: row.photo_url || row.photoUrl || '',
    password: row.password || '',
    username: row.username || '',
    email: row.email || row.tutor_email || '',
    assignedCoachId: row.assigned_coach_id || row.assignedCoachId || '',
    assignedCoachName: row.assigned_coach_name || row.assignedCoachName || '',
  };
};

// Mapper: Student -> Supabase row
export const mapStudentToRow = (student: Student): any => {
  return {
    id: student.id,
    full_name: student.fullName,
    birth_date: student.birthDate || null,
    category: student.category,
    jersey_number: student.jerseyNumber,
    branch: student.branch,
    campus: student.campus,
    whatsapp: student.whatsapp,
    allergies: student.allergies || 'Ninguna reportada',
    chronic_condition: student.chronicCondition || 'Ninguna',
    emergency_phone: student.emergencyPhone || student.whatsapp,
    monthly_fee: student.monthlyFee,
    due_day: student.dueDay,
    tutor_name: student.tutorName,
    tutor_phone: student.tutorPhone,
    tutor_email: student.tutorEmail || student.email || '',
    current_balance: student.currentBalance,
    status: student.status,
    joined_date: student.joinedDate,
    registration_type: student.registrationType || 'minor',
    is_active: student.isActive !== false,
    photo_url: student.photoUrl || null,
    password: student.password || null,
    username: student.username || null,
    email: student.email || student.tutorEmail || null,
    assigned_coach_id: student.assignedCoachId || null,
    assigned_coach_name: student.assignedCoachName || null,
  };
};

// Mapper: Supabase row -> PaymentRecord
export const mapRowToPayment = (row: any): PaymentRecord => {
  return {
    id: row.id,
    studentId: row.student_id || row.studentId,
    studentName: row.student_name || row.studentName,
    paymentType: (row.payment_type || row.paymentType || 'mensualidad') as PaymentType,
    extraCategory: (row.extra_category || row.extraCategory) as ExtraPaymentCategory | undefined,
    eventName: row.event_name || row.eventName,
    concept: row.concept,
    amount: Number(row.amount),
    paymentDate: row.payment_date || row.paymentDate,
    reportedDate: row.reported_date || row.reportedDate,
    method: (row.method || 'Transferencia SPEI') as PaymentMethod,
    referenceNumber: row.reference_number || row.referenceNumber || '',
    receiptUrl: row.receipt_url || row.receiptUrl || '',
    status: (row.status || 'pendiente') as PaymentStatus,
    reviewedDate: row.reviewed_date || row.reviewedDate,
    reviewedBy: row.reviewed_by || row.reviewedBy,
    rejectionReason: row.rejection_reason || row.rejectionReason,
    receiptFolio: row.receipt_folio || row.receiptFolio,
    notes: row.notes,
  };
};

export const mapPaymentToRow = (payment: PaymentRecord): any => {
  return {
    id: payment.id,
    student_id: payment.studentId,
    student_name: payment.studentName,
    payment_type: payment.paymentType || 'mensualidad',
    extra_category: payment.extraCategory || null,
    event_name: payment.eventName || null,
    concept: payment.concept,
    amount: payment.amount,
    payment_date: payment.paymentDate,
    reported_date: payment.reportedDate,
    method: payment.method,
    reference_number: payment.referenceNumber,
    receipt_url: payment.receiptUrl,
    status: payment.status,
    reviewed_date: payment.reviewedDate || null,
    reviewed_by: payment.reviewedBy || null,
    rejection_reason: payment.rejectionReason || null,
    receipt_folio: payment.receiptFolio || null,
    notes: payment.notes || null,
  };
};

// API Services
export const supabaseService = {
  // Check Connection
  async testConnection(): Promise<{ connected: boolean; message: string; missingTables?: string[] }> {
    try {
      const client = getSupabaseClient();
      const tablesToCheck = ['system_users', 'students', 'payments', 'sedes'];
      const missingTables: string[] = [];

      for (const t of tablesToCheck) {
        const { error } = await client.from(t).select('id').limit(1);
        if (error) {
          if (
            error.code === '42P01' ||
            error.code === 'PGRST205' ||
            error.message.includes('relation') ||
            error.message.includes('schema cache')
          ) {
            missingTables.push(t);
          } else {
            return {
              connected: false,
              message: `Error en tabla '${t}': ${error.message}`,
            };
          }
        }
      }

      if (missingTables.length > 0) {
        return {
          connected: true,
          message: `Conexión a Supabase establecida, pero faltan crear las siguientes tablas: [${missingTables.join(', ')}]. Abre el modal de Gestión de Datos, copia el script SQL y ejecútalo en el SQL Editor de Supabase.`,
          missingTables,
        };
      }

      return { connected: true, message: '¡Conexión exitosa! Todas las tablas en Supabase están creadas y operativas.' };
    } catch (err: any) {
      return { connected: false, message: err?.message || 'Error de red con Supabase.' };
    }
  },

  // Students: Fetch
  async fetchStudents(): Promise<{ students: Student[] | null; error?: string }> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('students')
        .select('*')
        .order('joined_date', { ascending: false });

      if (error) {
        return { students: null, error: error.message };
      }
      return { students: (data || []).map(mapRowToStudent) };
    } catch (err: any) {
      return { students: null, error: err.message };
    }
  },

  // Students: Upsert (Insert or Update)
  async upsertStudent(student: Student): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getSupabaseClient();
      const row = mapStudentToRow(student);
      const { error } = await client.from('students').upsert(row, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase upsertStudent error:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Students: Delete single
  async deleteStudent(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getSupabaseClient();
      const { error } = await client.from('students').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteStudent error:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Students: Bulk Delete
  async bulkDeleteStudents(ids: string[]): Promise<{ success: boolean; error?: string }> {
    if (ids.length === 0) return { success: true };
    try {
      const client = getSupabaseClient();
      const { error } = await client.from('students').delete().in('id', ids);
      if (error) {
        console.warn('Supabase bulkDeleteStudents error:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Students: Toggle Active/Inactive
  async toggleStudentActive(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('students')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) {
        console.warn('Supabase toggleStudentActive error:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Students: Bulk Toggle Active/Inactive
  async bulkToggleStudentsActive(ids: string[], isActive: boolean): Promise<{ success: boolean; error?: string }> {
    if (ids.length === 0) return { success: true };
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('students')
        .update({ is_active: isActive })
        .in('id', ids);

      if (error) {
        console.warn('Supabase bulkToggleStudentsActive error:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Payments: Fetch
  async fetchPayments(): Promise<{ payments: PaymentRecord[] | null; error?: string }> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('payments')
        .select('*')
        .order('reported_date', { ascending: false });

      if (error) {
        return { payments: null, error: error.message };
      }
      return { payments: (data || []).map(mapRowToPayment) };
    } catch (err: any) {
      return { payments: null, error: err.message };
    }
  },

  // Payments: Upsert
  async upsertPayment(payment: PaymentRecord): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getSupabaseClient();
      const row = mapPaymentToRow(payment);
      const { error } = await client.from('payments').upsert(row, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase upsertPayment error:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Sedes: Fetch
  async fetchSedes(): Promise<{ sedes: string[] | null; error?: string }> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('sedes')
        .select('name')
        .eq('is_active', true);

      if (error) {
        return { sedes: null, error: error.message };
      }
      return { sedes: (data || []).map((d: any) => d.name) };
    } catch (err: any) {
      return { sedes: null, error: err.message };
    }
  },

  // Sedes: Insert
  async addSede(name: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('sedes')
        .upsert({ name, is_active: true }, { onConflict: 'name' });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Comunicados: Fetch
  async fetchComunicados(): Promise<{ comunicados: Comunicado[] | null; error?: string }> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('comunicados')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { comunicados: null, error: error.message };
      }

      const mapped: Comunicado[] = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title || '',
        content: row.content || '',
        date: row.date || '',
        targetType: row.target_type || 'all',
        targetId: row.target_id || undefined,
        targetName: row.target_name || undefined,
        pdfUrl: row.pdf_url || undefined,
        pdfName: row.pdf_name || undefined,
        pdfSize: row.pdf_size || undefined,
        authorName: row.author_name || 'Head Coach',
        createdAt: row.created_at || undefined,
      }));

      return { comunicados: mapped };
    } catch (err: any) {
      return { comunicados: null, error: err.message };
    }
  },

  // Comunicados: Upsert
  async upsertComunicado(com: Comunicado): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getSupabaseClient();
      const row = {
        id: com.id,
        title: com.title,
        content: com.content,
        date: com.date,
        target_type: com.targetType,
        target_id: com.targetId || null,
        target_name: com.targetName || null,
        pdf_url: com.pdfUrl || null,
        pdf_name: com.pdfName || null,
        pdf_size: com.pdfSize || null,
        author_name: com.authorName || 'Head Coach',
      };

      const { error } = await client
        .from('comunicados')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Comunicados: Delete
  async deleteComunicado(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('comunicados')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Wipe All Records in Supabase
  async wipeAllTables(): Promise<{ success: boolean; message: string }> {
    try {
      const client = getSupabaseClient();
      // Delete from child tables first to avoid FK issues
      await client.from('comunicados').delete().neq('id', '___non_existent___');
      await client.from('payments').delete().neq('id', '___non_existent___');
      await client.from('billing_cycles').delete().neq('id', '___non_existent___');
      await client.from('system_notifications').delete().neq('id', '___non_existent___');
      await client.from('students').delete().neq('id', '___non_existent___');

      return {
        success: true,
        message: 'Tablas en Supabase vaciadas con éxito. No quedan registros remotos.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error al vaciar Supabase: ${err.message}`,
      };
    }
  },
};
