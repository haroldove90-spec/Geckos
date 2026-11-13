import { BillingCycle, PaymentRecord, Student, SystemNotification } from '../types';

export interface OverdueInfo {
  isOverdue: boolean;
  daysOverdue: number;
  dueDateStr: string;
  periodKey: string;
  periodTitle: string;
  amountDue: number;
}

export interface DuplicateGroup {
  key: string;
  reason: string;
  payments: PaymentRecord[];
}

export interface StudentEffectiveBilling {
  effectiveStatus: Student['status'];
  effectiveBalance: number;
  paidCurrentPeriod: number;
  expectedMonthlyFee: number;
  hasPaidCurrentPeriod: boolean;
  hasPendingMonthly: boolean;
  hasAnyApprovedMonthly: boolean;
  missingCurrentMonthPayment: boolean;
  currentPeriod: string;
}

const SPANISH_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export const getLocalTodayStr = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getCurrentPeriodKey = (): string => getLocalTodayStr().substring(0, 7);

export const getCurrentMonthConceptLabel = (): string => {
  const now = new Date();
  const monthName = SPANISH_MONTHS[now.getMonth()] || 'noviembre';
  const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `Mensualidad ${capitalized} ${now.getFullYear()}`;
};

/**
 * Determina si un pago corresponde al periodo YYYY-MM indicado,
 * priorizando el mes/año indicado en el concepto (ej. "Mensualidad Noviembre 2026")
 * y usando la fecha de pago (paymentDate) como respaldo si el concepto es genérico.
 */
export const doesPaymentMatchPeriod = (
  payment: PaymentRecord,
  targetPeriod: string
): boolean => {
  if (!targetPeriod || targetPeriod.length < 7) return false;
  const [targetYear, targetMonthStr] = targetPeriod.split('-');
  const targetMonthIdx = parseInt(targetMonthStr, 10) - 1;
  const targetMonthName = SPANISH_MONTHS[targetMonthIdx];

  const conceptLower = (payment.concept || '').toLowerCase();
  const mentionedMonthIdx = SPANISH_MONTHS.findIndex((m) => conceptLower.includes(m));

  if (mentionedMonthIdx !== -1 && targetMonthName) {
    if (mentionedMonthIdx !== targetMonthIdx) return false;
    const yearMatch = conceptLower.match(/\b(20\d{2})\b/);
    if (yearMatch && yearMatch[1] !== targetYear) return false;
    return true;
  }

  return (payment.paymentDate || '').startsWith(targetPeriod);
};

/**
 * Calcula el estado de cuenta REAL de un alumno cruzando sus pagos aprobados y pendientes
 * contra su cuota mensual y el periodo actual, evitando mostrar "Al corriente" cuando no ha pagado.
 */
export const getStudentEffectiveBilling = (
  student: Student,
  payments: PaymentRecord[],
  cycles: BillingCycle[] = []
): StudentEffectiveBilling => {
  const currentPeriod = getCurrentPeriodKey();
  const monthlyPayments = (payments || []).filter(
    (p) => p.studentId === student.id && p.paymentType !== 'extra'
  );
  const approvedMonthly = monthlyPayments.filter((p) => p.status === 'aprobado');
  const pendingMonthly = monthlyPayments.filter((p) => p.status === 'pendiente');

  // Pagos aprobados que corresponden al periodo actual (o al ciclo vigente del periodo)
  const matchingCycles = (cycles || []).filter((c) => c.period === currentPeriod);
  const approvedCurrent = approvedMonthly.filter(
    (p) =>
      doesPaymentMatchPeriod(p, currentPeriod) ||
      matchingCycles.some(
        (c) =>
          c.title &&
          (p.concept || '').toLowerCase().includes(c.title.trim().toLowerCase())
      )
  );

  const paidCurrentPeriod = approvedCurrent.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const expectedMonthlyFee = Math.max(0, Number(student.monthlyFee) || 0);
  const periodUnpaid =
    expectedMonthlyFee > 0 ? Math.max(0, expectedMonthlyFee - paidCurrentPeriod) : 0;
  const dbBalance = Math.max(0, Number(student.currentBalance) || 0);

  // El adeudo real nunca puede ser menor al faltante del periodo actual si aún no cubre su cuota
  const effectiveBalance = Math.max(dbBalance, periodUnpaid);
  const hasPendingMonthly = pendingMonthly.length > 0;
  const hasPaidCurrentPeriod =
    expectedMonthlyFee > 0
      ? paidCurrentPeriod >= expectedMonthlyFee
      : approvedCurrent.length > 0;
  const hasAnyApprovedMonthly = approvedMonthly.length > 0;

  let effectiveStatus: Student['status'] = 'al_corriente';
  if (hasPendingMonthly && (effectiveBalance > 0 || student.status === 'en_revision')) {
    effectiveStatus = 'en_revision';
  } else if (effectiveBalance > 0 || (student.status === 'adeudo' && !hasPaidCurrentPeriod)) {
    effectiveStatus = 'adeudo';
  }

  return {
    effectiveStatus,
    effectiveBalance,
    paidCurrentPeriod,
    expectedMonthlyFee,
    hasPaidCurrentPeriod,
    hasPendingMonthly,
    hasAnyApprovedMonthly,
    missingCurrentMonthPayment:
      !hasPaidCurrentPeriod && !hasPendingMonthly && effectiveBalance > 0,
    currentPeriod,
  };
};

const diffDaysBetween = (earlierDateStr: string, laterDateStr: string): number => {
  const d1 = new Date(`${earlierDateStr}T00:00:00`);
  const d2 = new Date(`${laterDateStr}T00:00:00`);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const ms = d2.getTime() - d1.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

/**
 * Determina si un alumno tiene una fecha límite de pago vencida.
 * Considera tanto los pagos reales registrados como los ciclos de cobro activos y su día de corte (dueDay).
 */
export const getStudentOverdueInfo = (
  student: Student,
  cycles: BillingCycle[],
  payments: PaymentRecord[]
): OverdueInfo => {
  const todayStr = getLocalTodayStr();
  const currentPeriod = todayStr.substring(0, 7); // YYYY-MM

  const billing = getStudentEffectiveBilling(student, payments, cycles);
  const amountDue = billing.effectiveBalance;

  // Si realmente cubrió su periodo y no tiene adeudo, no está vencido
  if (billing.effectiveStatus === 'al_corriente' && amountDue <= 0) {
    return {
      isOverdue: false,
      daysOverdue: 0,
      dueDateStr: '',
      periodKey: currentPeriod,
      periodTitle: '',
      amountDue: 0,
    };
  }

  // Si ya subió comprobante y está pendiente de validación, no alertar como moroso vencido
  if (billing.hasPendingMonthly) {
    return {
      isOverdue: false,
      daysOverdue: 0,
      dueDateStr: '',
      periodKey: currentPeriod,
      periodTitle: '',
      amountDue,
    };
  }

  // 1. Revisar si existe algún ciclo vencido (dueDate < todayStr) posterior o igual al ingreso del alumno
  const expiredCycles = (cycles || [])
    .filter(
      (c) =>
        c.dueDate &&
        c.dueDate < todayStr &&
        (!student.joinedDate || c.dueDate >= student.joinedDate.substring(0, 7) + '-01')
    )
    .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));

  if (expiredCycles.length > 0 && amountDue > 0) {
    const latestExpired = expiredCycles[0];
    const cyclePeriod = latestExpired.period || latestExpired.dueDate.substring(0, 7);
    const paidForCycle = (payments || []).some(
      (p) =>
        p.studentId === student.id &&
        p.paymentType !== 'extra' &&
        p.status === 'aprobado' &&
        doesPaymentMatchPeriod(p, cyclePeriod)
    );
    if (!paidForCycle) {
      const days = diffDaysBetween(latestExpired.dueDate, todayStr);
      if (days > 0) {
        return {
          isOverdue: true,
          daysOverdue: days,
          dueDateStr: latestExpired.dueDate,
          periodKey: cyclePeriod,
          periodTitle: latestExpired.title || `Periodo ${latestExpired.period}`,
          amountDue,
        };
      }
    }
  }

  // 2. Revisar contra el día de corte mensual del alumno (dueDay) para el mes en curso
  const clampedDueDay = Math.min(28, Math.max(1, student.dueDay || 5));
  const currentMonthDueDate = `${currentPeriod}-${String(clampedDueDay).padStart(2, '0')}`;

  if (todayStr > currentMonthDueDate && (amountDue > 0 || billing.effectiveStatus === 'adeudo')) {
    const days = diffDaysBetween(currentMonthDueDate, todayStr);
    if (days > 0) {
      const monthLabel = new Date(`${currentMonthDueDate}T00:00:00`).toLocaleDateString('es-MX', {
        month: 'long',
        year: 'numeric',
      });
      return {
        isOverdue: true,
        daysOverdue: days,
        dueDateStr: currentMonthDueDate,
        periodKey: currentPeriod,
        periodTitle: `Mensualidad ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`,
        amountDue,
      };
    }
  }

  return {
    isOverdue: false,
    daysOverdue: 0,
    dueDateStr: currentMonthDueDate,
    periodKey: currentPeriod,
    periodTitle: '',
    amountDue: 0,
  };
};

/**
 * Genera notificaciones automáticas (sin duplicar por alumno y periodo)
 * para aquellos alumnos cuya fecha límite de pago ya venció.
 */
export const buildOverdueNotifications = (
  students: Student[],
  cycles: BillingCycle[],
  payments: PaymentRecord[],
  existingNotifications: SystemNotification[]
): SystemNotification[] => {
  const existingIds = new Set(existingNotifications.map((n) => n.id));
  const created: SystemNotification[] = [];
  const nowStamp = new Date().toISOString().replace('T', ' ').substring(0, 16);

  for (const student of students) {
    if (student.isActive === false) continue;

    const info = getStudentOverdueInfo(student, cycles, payments);
    if (!info.isOverdue) continue;

    const deterministicId = `notif-overdue-${student.id}-${info.periodKey}`;
    if (existingIds.has(deterministicId)) continue;

    const recipientName =
      student.registrationType === 'minor' && student.tutorName
        ? student.tutorName
        : student.fullName;

    created.push({
      id: deterministicId,
      targetRole: student.registrationType === 'adult' ? 'players' : 'parents',
      studentId: student.id,
      title: `Fecha Límite Vencida · ${info.periodTitle}`,
      message: `Hola ${recipientName}: la fecha límite de pago (${info.dueDateStr}) para ${student.fullName} venció hace ${info.daysOverdue} día(s). Saldo pendiente por cubrir: $${info.amountDue} MXN. Por favor sube tu comprobante en tu portal.`,
      date: nowStamp,
      type: 'reminder',
      read: false,
    });

    existingIds.add(deterministicId);
  }

  return created;
};

/**
 * Detecta posibles pagos duplicados en el historial:
 * 1) Mismo alumno + misma referencia no vacía.
 * 2) Mismo alumno + mismo concepto + mismo monto + misma fecha (no rechazados).
 * Conserva el registro principal (aprobado o más antiguo) y marca los duplicados adicionales.
 */
export const findDuplicatePayments = (
  payments: PaymentRecord[]
): {
  duplicateIds: Set<string>;
  duplicateGroups: DuplicateGroup[];
} => {
  const duplicateIds = new Set<string>();
  const duplicateGroups: DuplicateGroup[] = [];

  const sorted = [...payments].sort((a, b) => {
    if (a.status === 'aprobado' && b.status !== 'aprobado') return -1;
    if (b.status === 'aprobado' && a.status !== 'aprobado') return 1;
    return (a.reportedDate || '').localeCompare(b.reportedDate || '');
  });

  const byRef = new Map<string, PaymentRecord[]>();
  for (const p of sorted) {
    const cleanRef = (p.referenceNumber || '').trim().toLowerCase();
    if (!cleanRef || cleanRef === 'n/a' || cleanRef === '-') continue;
    const key = `ref:${p.studentId}:${cleanRef}`;
    const list = byRef.get(key) || [];
    list.push(p);
    byRef.set(key, list);
  }

  byRef.forEach((group, key) => {
    if (group.length > 1) {
      duplicateGroups.push({
        key,
        reason: `Misma referencia "${group[0].referenceNumber}"`,
        payments: group,
      });
      group.slice(1).forEach((dup) => duplicateIds.add(dup.id));
    }
  });

  const bySignature = new Map<string, PaymentRecord[]>();
  for (const p of sorted) {
    if (p.status === 'rechazado') continue;
    const cleanConcept = (p.concept || '').trim().toLowerCase();
    const key = `sig:${p.studentId}:${cleanConcept}:${p.amount}:${p.paymentDate}`;
    const list = bySignature.get(key) || [];
    list.push(p);
    bySignature.set(key, list);
  }

  bySignature.forEach((group, key) => {
    if (group.length > 1) {
      const newDups = group.slice(1).filter((dup) => !duplicateIds.has(dup.id));
      if (newDups.length > 0) {
        duplicateGroups.push({
          key,
          reason: `Mismo concepto, monto ($${group[0].amount}) y fecha (${group[0].paymentDate})`,
          payments: group,
        });
        newDups.forEach((dup) => duplicateIds.add(dup.id));
      }
    }
  });

  return { duplicateIds, duplicateGroups };
};

/**
 * Calcula si un pago mensual es parcial respecto a la cuota o saldo esperado.
 */
export const getPaymentPartialMeta = (
  payment: PaymentRecord,
  student?: Student | null
): {
  isPartial: boolean;
  expectedAmount: number;
  remainingAfterPayment: number;
} => {
  if (payment.paymentType === 'extra') {
    return {
      isPartial: false,
      expectedAmount: payment.amount,
      remainingAfterPayment: 0,
    };
  }

  const expected =
    payment.expectedAmount && payment.expectedAmount > 0
      ? payment.expectedAmount
      : student?.monthlyFee && student.monthlyFee > 0
      ? Math.max(student.monthlyFee, student.currentBalance || 0)
      : payment.amount;

  const isPartial =
    Boolean(payment.isPartial) || (expected > 0 && payment.amount > 0 && payment.amount < expected);

  const remainingAfterPayment =
    typeof payment.remainingBalance === 'number'
      ? Math.max(0, payment.remainingBalance)
      : isPartial
      ? Math.max(0, expected - payment.amount)
      : 0;

  return {
    isPartial,
    expectedAmount: expected,
    remainingAfterPayment,
  };
};
