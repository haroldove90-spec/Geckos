export type UserRole = 'head_coach' | 'coach_assistant' | 'parent' | 'player';

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  email?: string;
  phone?: string;
  role: 'head_coach' | 'coach_assistant' | 'player' | 'parent';
  campus?: string;
  assignedStudentId?: string;
  isActive: boolean;
  avatarUrl?: string; // Fotografía de perfil en base64 o URL
  createdAt?: string;
}

export type StudentCategory =
  | 'Sub 23'
  | 'Juvenil'
  | 'Infantil'
  | 'Mini'
  | 'Sub-13'
  | 'Sub-15'
  | 'Sub-18'
  | 'Libre Femenil'
  | 'Libre Varonil';

export interface Student {
  id: string;
  fullName: string;
  birthDate?: string;
  category: StudentCategory;
  jerseyNumber: number;
  branch: 'Femenil' | 'Varonil';
  campus?: string; // Sede: Tlalnepantla, Cuautitlán Izcalli, etc.
  whatsapp?: string;
  allergies?: string;
  chronicCondition?: string;
  emergencyPhone?: string;
  monthlyFee: number;
  dueDay: number; // day of the month, e.g., 5 or 10
  tutorName: string;
  tutorPhone: string;
  tutorEmail: string;
  currentBalance: number; // 0 if up to date, >0 if owes
  status: 'al_corriente' | 'adeudo' | 'en_revision';
  joinedDate: string;
  registrationType?: 'adult' | 'minor';
  isActive?: boolean; // true = activo, false = inactivo / desactivado
  photoUrl?: string; // Fotografía del alumno
  password?: string; // Contraseña personal elegida en el registro
  username?: string; // Nombre de usuario elegido en el registro
  email?: string; // Correo electrónico del atleta
}


export type PaymentMethod = 'Transferencia SPEI' | 'Depósito OXXO' | 'Efectivo en Cancha' | 'Tarjeta Débito/Crédito';

export type PaymentStatus = 'pendiente' | 'aprobado' | 'rechazado';

export type PaymentType = 'mensualidad' | 'extra';

export type ExtraPaymentCategory =
  | 'torneo'
  | 'inscripcion'
  | 'uniforme'
  | 'arbitraje'
  | 'transporte'
  | 'otro';

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  paymentType?: PaymentType;
  extraCategory?: ExtraPaymentCategory;
  eventName?: string;
  concept: string; // e.g. "Torneo: Copa Cuautitlán 2026" or "Mensualidad Octubre 2026"
  amount: number;
  paymentDate: string;
  reportedDate: string;
  method: PaymentMethod;
  referenceNumber: string;
  receiptUrl: string; // Base64 or image url
  status: PaymentStatus;
  reviewedDate?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  receiptFolio?: string; // e.g. "GCK-2026-1042" or "GCK-EXT-2026-1005"
  notes?: string;
}

export interface BillingCycle {
  id: string;
  title: string; // "Mensualidad Octubre 2026"
  period: string;
  dueDate: string;
  defaultFee: number;
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  targetRole: 'all' | 'parents' | 'players' | 'admin';
  studentId?: string;
  title: string;
  message: string;
  date: string;
  type: 'reminder' | 'payment_approved' | 'payment_rejected' | 'new_payment_submitted' | 'announcement';
  read: boolean;
}

export type ComunicadoTargetType =
  | 'all'
  | 'all_students'
  | 'student'
  | 'all_coaches'
  | 'coach';

export interface Comunicado {
  id: string;
  title: string;
  content: string;
  date: string;
  targetType: ComunicadoTargetType;
  targetId?: string; // studentId or coachId when specific
  targetName?: string; // e.g., "Juan López" or "Valeria Gómez"
  pdfUrl?: string; // Base64 data URI or public URL
  pdfName?: string; // e.g. "Reglamento_Interno_2026.pdf"
  pdfSize?: string; // e.g. "1.4 MB"
  authorName?: string;
  createdAt?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
  lastSync?: string;
}
