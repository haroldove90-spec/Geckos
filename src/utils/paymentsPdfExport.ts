import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BillingCycle, PaymentRecord, Student, SystemUser } from '../types';
import {
  getCurrentMonthConceptLabel,
  getLocalTodayStr,
  getPaymentPartialMeta,
  getStudentEffectiveBilling,
  getStudentOverdueInfo,
} from './billingUtils';
import { CLUB_LOGO_URL } from './browserNotifications';

export type PaymentPdfReportMode =
  | 'all_balances'
  | 'paid_only'
  | 'debt_only'
  | 'payments_history';

export interface ExportPaymentsPdfOptions {
  mode: PaymentPdfReportMode;
  students: Student[];
  payments: PaymentRecord[];
  cycles: BillingCycle[];
  campusFilter?: string; // 'all' or campus name
  categoryFilter?: string; // 'all' or category name
  onlyActiveStudents?: boolean;
  generatedBy?: SystemUser | null;
  isCoachScoped?: boolean;
}

export interface StudentBillingRow {
  student: Student;
  status: Student['status'];
  statusLabel: string;
  monthlyFee: number;
  paidCurrentPeriod: number;
  pendingBalance: number;
  isPartial: boolean;
  isOverdue: boolean;
  daysOverdue: number;
  dueDateLabel: string;
  lastApprovedPayment?: PaymentRecord;
  pendingCount: number;
}

const formatMxn = (amount: number): string => {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `$${safe.toLocaleString('es-MX', {
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { mode: 'cors', signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const buildStudentBillingRows = (
  students: Student[],
  payments: PaymentRecord[],
  cycles: BillingCycle[],
  options?: {
    campusFilter?: string;
    categoryFilter?: string;
    onlyActiveStudents?: boolean;
  }
): StudentBillingRow[] => {
  const campusFilter = options?.campusFilter || 'all';
  const categoryFilter = options?.categoryFilter || 'all';
  const onlyActive = options?.onlyActiveStudents !== false;

  const filteredStudents = students.filter((s) => {
    if (onlyActive && s.isActive === false) return false;
    if (campusFilter !== 'all' && (s.campus || 'Sin sede') !== campusFilter) return false;
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    return true;
  });

  const rows: StudentBillingRow[] = filteredStudents.map((student) => {
    const billing = getStudentEffectiveBilling(student, payments, cycles);
    const overdue = getStudentOverdueInfo(student, cycles, payments);
    const studentPayments = payments
      .filter((p) => p.studentId === student.id)
      .sort((a, b) => (b.paymentDate || b.reportedDate || '').localeCompare(a.paymentDate || a.reportedDate || ''));

    const lastApprovedPayment = studentPayments.find((p) => p.status === 'aprobado');
    const pendingCount = studentPayments.filter((p) => p.status === 'pendiente').length;
    const isPartial =
      billing.paidCurrentPeriod > 0 &&
      billing.effectiveBalance > 0 &&
      billing.effectiveStatus !== 'al_corriente';

    let statusLabel = 'Al corriente';
    if (billing.effectiveStatus === 'en_revision') {
      statusLabel = 'En revisión';
    } else if (billing.effectiveStatus === 'adeudo') {
      if (isPartial) {
        statusLabel = overdue.isOverdue
          ? `Abono parcial (${overdue.daysOverdue}d atraso)`
          : 'Abono parcial';
      } else if (overdue.isOverdue) {
        statusLabel = `Adeudo vencido (${overdue.daysOverdue}d)`;
      } else {
        statusLabel = 'Adeudo pendiente';
      }
    }

    const dueDateLabel = overdue.dueDateStr
      ? overdue.dueDateStr
      : `Día ${student.dueDay || 5} del mes`;

    return {
      student,
      status: billing.effectiveStatus,
      statusLabel,
      monthlyFee: billing.expectedMonthlyFee,
      paidCurrentPeriod: billing.paidCurrentPeriod,
      pendingBalance: billing.effectiveBalance,
      isPartial,
      isOverdue: overdue.isOverdue,
      daysOverdue: overdue.daysOverdue,
      dueDateLabel,
      lastApprovedPayment,
      pendingCount,
    };
  });

  // Ordenar: primero adeudos (mayor adeudo / más días), luego en revisión, luego al corriente; alfabético como desempate
  const statusWeight = (st: Student['status']): number => {
    if (st === 'adeudo') return 0;
    if (st === 'en_revision') return 1;
    return 2;
  };

  return rows.sort((a, b) => {
    const wDiff = statusWeight(a.status) - statusWeight(b.status);
    if (wDiff !== 0) return wDiff;
    if (b.pendingBalance !== a.pendingBalance) return b.pendingBalance - a.pendingBalance;
    return a.student.fullName.localeCompare(b.student.fullName, 'es');
  });
};

export const exportPaymentsReportPdf = async (
  opts: ExportPaymentsPdfOptions
): Promise<{ filename: string; recordCount: number }> => {
  const {
    mode,
    students,
    payments,
    cycles,
    campusFilter = 'all',
    categoryFilter = 'all',
    onlyActiveStudents = true,
    generatedBy,
    isCoachScoped = false,
  } = opts;

  const isLandscape = true;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  const todayStr = getLocalTodayStr();
  const nowFormatted = new Date().toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const periodLabel = getCurrentMonthConceptLabel();

  const logoDataUrl = await fetchImageAsDataUrl(CLUB_LOGO_URL);

  const reportTitles: Record<PaymentPdfReportMode, string> = {
    all_balances: 'Reporte General de Pagos y Adeudos',
    paid_only: 'Reporte de Alumnos al Corriente (Pagados)',
    debt_only: 'Reporte de Alumnos con Adeudo / Faltantes por Pagar',
    payments_history: 'Historial Detallado de Pagos Registrados',
  };

  const filePrefixes: Record<PaymentPdfReportMode, string> = {
    all_balances: 'Geckos_Pagos_y_Adeudos',
    paid_only: 'Geckos_Alumnos_Pagados',
    debt_only: 'Geckos_Alumnos_Con_Adeudo',
    payments_history: 'Geckos_Historial_Pagos',
  };

  // --- ENCABEZADO INSTITUCIONAL ---
  doc.setFillColor(24, 24, 27); // #18181b
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setFillColor(245, 158, 11); // #f59e0b
  doc.rect(0, 30, pageWidth, 1.4, 'F');

  let titleStartX = margin;
  if (logoDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 4.5, 26, 21, 2.5, 2.5, 'F');
    try {
      doc.addImage(logoDataUrl, 'PNG', margin + 1.5, 5.5, 23, 19, undefined, 'FAST');
    } catch {
      // ignore image decode error
    }
    titleStartX = margin + 30;
  }

  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CLUB GECKOS VOLEIBOL · CONTROL DE COBRANZA', titleStartX, 10.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(reportTitles[mode], titleStartX, 18.2);

  const scopeParts: string[] = [
    `Periodo: ${periodLabel}`,
    campusFilter !== 'all' ? `Sede: ${campusFilter}` : 'Sede: Todas',
    categoryFilter !== 'all' ? `Categoría: ${categoryFilter}` : 'Categoría: Todas',
  ];
  if (isCoachScoped && generatedBy?.name) {
    scopeParts.push(`Entrenador: ${generatedBy.name}`);
  }
  if (!onlyActiveStudents) {
    scopeParts.push('Incluye inactivos');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 212, 216);
  doc.text(scopeParts.join('   |   '), titleStartX, 24.5);

  // Metadatos a la derecha
  doc.setTextColor(228, 228, 231);
  doc.setFontSize(8);
  doc.text(`Emitido: ${nowFormatted}`, pageWidth - margin, 11, { align: 'right' });
  if (generatedBy?.name) {
    doc.text(`Generado por: ${generatedBy.name}`, pageWidth - margin, 16.5, { align: 'right' });
  }

  const allRows = buildStudentBillingRows(students, payments, cycles, {
    campusFilter,
    categoryFilter,
    onlyActiveStudents,
  });

  // Helper para dibujar tarjetas KPI
  const drawKpiCards = (
    cards: { label: string; value: string; accent: [number, number, number] }[],
    startY: number
  ): number => {
    const gap = 3.5;
    const usableW = pageWidth - margin * 2;
    const cardW = (usableW - gap * (cards.length - 1)) / cards.length;
    const cardH = 16.5;

    cards.forEach((card, idx) => {
      const x = margin + idx * (cardW + gap);
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(x, startY, cardW, cardH, 2, 2, 'FD');

      doc.setFillColor(card.accent[0], card.accent[1], card.accent[2]);
      doc.rect(x, startY, 1.8, cardH, 'F');

      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.text(card.label.toUpperCase(), x + 4.5, startY + 5.8);

      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.text(card.value, x + 4.5, startY + 12.8);
    });

    return startY + cardH + 6;
  };

  let recordCount = 0;

  if (mode === 'payments_history') {
    const allowedStudentIds = new Set(allRows.map((r) => r.student.id));
    const filteredPayments = payments
      .filter((p) => {
        if (campusFilter !== 'all' || categoryFilter !== 'all' || onlyActiveStudents) {
          return allowedStudentIds.has(p.studentId);
        }
        return true;
      })
      .sort((a, b) =>
        (b.paymentDate || b.reportedDate || '').localeCompare(a.paymentDate || a.reportedDate || '')
      );

    recordCount = filteredPayments.length;

    const approvedTotal = filteredPayments
      .filter((p) => p.status === 'aprobado')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const pendingTotal = filteredPayments
      .filter((p) => p.status === 'pendiente')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const approvedCount = filteredPayments.filter((p) => p.status === 'aprobado').length;
    const pendingCount = filteredPayments.filter((p) => p.status === 'pendiente').length;
    const rejectedCount = filteredPayments.filter((p) => p.status === 'rechazado').length;

    const tableStartY = drawKpiCards(
      [
        { label: 'Total Registros', value: String(filteredPayments.length), accent: [54, 52, 53] },
        {
          label: `Aprobados (${approvedCount})`,
          value: `${formatMxn(approvedTotal)} MXN`,
          accent: [16, 185, 129],
        },
        {
          label: `En Revisión (${pendingCount})`,
          value: `${formatMxn(pendingTotal)} MXN`,
          accent: [245, 158, 11],
        },
        { label: 'Rechazados', value: String(rejectedCount), accent: [225, 29, 72] },
      ],
      36
    );

    const studentMap = new Map(students.map((s) => [s.id, s]));

    const bodyRows = filteredPayments.map((p, idx) => {
      const st = studentMap.get(p.studentId);
      const partial = getPaymentPartialMeta(p, st);
      const typeLabel =
        p.paymentType === 'extra'
          ? 'Pago Extra'
          : partial.isPartial
          ? 'Abono Parcial'
          : 'Mensualidad';
      const statusText =
        p.status === 'aprobado'
          ? 'Aprobado'
          : p.status === 'pendiente'
          ? 'En revisión'
          : 'Rechazado';
      const pendingAfter =
        partial.isPartial && partial.remainingAfterPayment > 0
          ? `${formatMxn(partial.remainingAfterPayment)}`
          : '-';

      return [
        String(idx + 1),
        p.studentName || st?.fullName || '-',
        st?.campus || '-',
        typeLabel,
        p.concept || '-',
        p.paymentDate || '-',
        p.method || '-',
        p.referenceNumber || p.receiptFolio || '-',
        formatMxn(Number(p.amount) || 0),
        pendingAfter,
        statusText,
      ];
    });

    autoTable(doc, {
      startY: tableStartY,
      margin: { left: margin, right: margin, bottom: 14 },
      head: [
        [
          '#',
          'Alumno',
          'Sede',
          'Tipo',
          'Concepto',
          'Fecha',
          'Método',
          'Referencia / Folio',
          'Monto',
          'Restante',
          'Estatus',
        ],
      ],
      body:
        bodyRows.length > 0
          ? bodyRows
          : [['-', 'No hay pagos registrados con los filtros seleccionados.', '', '', '', '', '', '', '', '', '']],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.8,
        cellPadding: 2.2,
        textColor: [31, 41, 55],
        lineColor: [229, 231, 235],
        lineWidth: 0.2,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [39, 39, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.8,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        5: { halign: 'center', cellWidth: 21 },
        8: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
        9: { halign: 'right', cellWidth: 19 },
        10: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 10) {
          const val = String(data.cell.raw || '');
          if (val === 'Aprobado') {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fillColor = [236, 253, 245];
          } else if (val === 'En revisión') {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fillColor = [255, 251, 235];
          } else if (val === 'Rechazado') {
            data.cell.styles.textColor = [190, 18, 60];
            data.cell.styles.fillColor = [255, 241, 242];
          }
        }
      },
    });
  } else {
    const targetRows =
      mode === 'paid_only'
        ? allRows.filter((r) => r.status === 'al_corriente')
        : mode === 'debt_only'
        ? allRows.filter((r) => r.status === 'adeudo' || r.pendingBalance > 0)
        : allRows;

    recordCount = targetRows.length;

    const paidCount = allRows.filter((r) => r.status === 'al_corriente').length;
    const reviewCount = allRows.filter((r) => r.status === 'en_revision').length;
    const debtCount = allRows.filter((r) => r.status === 'adeudo').length;
    const totalCollected = targetRows.reduce((sum, r) => sum + r.paidCurrentPeriod, 0);
    const totalPending = targetRows.reduce((sum, r) => sum + r.pendingBalance, 0);
    const totalExpected = targetRows.reduce((sum, r) => sum + r.monthlyFee, 0);

    const kpiCards =
      mode === 'paid_only'
        ? [
            { label: 'Alumnos al Corriente', value: String(targetRows.length), accent: [16, 185, 129] as [number, number, number] },
            { label: 'Total Recaudado', value: `${formatMxn(totalCollected)} MXN`, accent: [5, 150, 105] as [number, number, number] },
            { label: 'Cuotas Esperadas', value: `${formatMxn(totalExpected)} MXN`, accent: [54, 52, 53] as [number, number, number] },
            { label: 'Pendiente en Lista', value: `${formatMxn(totalPending)} MXN`, accent: [245, 158, 11] as [number, number, number] },
          ]
        : mode === 'debt_only'
        ? [
            { label: 'Alumnos con Adeudo', value: String(targetRows.length), accent: [225, 29, 72] as [number, number, number] },
            {
              label: 'Con Fecha Vencida',
              value: String(targetRows.filter((r) => r.isOverdue).length),
              accent: [190, 18, 60] as [number, number, number],
            },
            { label: 'Abonado Parcialmente', value: `${formatMxn(totalCollected)} MXN`, accent: [245, 158, 11] as [number, number, number] },
            { label: 'Total Pendiente por Cobrar', value: `${formatMxn(totalPending)} MXN`, accent: [225, 29, 72] as [number, number, number] },
          ]
        : [
            { label: 'Total Alumnos', value: String(targetRows.length), accent: [54, 52, 53] as [number, number, number] },
            { label: 'Al Corriente', value: String(paidCount), accent: [16, 185, 129] as [number, number, number] },
            { label: 'En Revisión', value: String(reviewCount), accent: [245, 158, 11] as [number, number, number] },
            { label: 'Con Adeudo', value: String(debtCount), accent: [225, 29, 72] as [number, number, number] },
            { label: 'Recaudado Mes', value: `${formatMxn(totalCollected)}`, accent: [5, 150, 105] as [number, number, number] },
            { label: 'Por Cobrar', value: `${formatMxn(totalPending)}`, accent: [225, 29, 72] as [number, number, number] },
          ];

    const tableStartY = drawKpiCards(kpiCards, 36);

    const bodyRows = targetRows.map((row, idx) => {
      const contactPhone = row.student.tutorPhone || row.student.whatsapp || '-';
      const lastPayInfo = row.lastApprovedPayment
        ? `${row.lastApprovedPayment.paymentDate || '-'} (${row.lastApprovedPayment.method})`
        : row.pendingCount > 0
        ? 'Comprobante en revisión'
        : 'Sin pago registrado';

      return [
        String(idx + 1),
        row.student.fullName,
        row.student.campus || '-',
        row.student.category || '-',
        contactPhone,
        formatMxn(row.monthlyFee),
        formatMxn(row.paidCurrentPeriod),
        formatMxn(row.pendingBalance),
        row.dueDateLabel,
        lastPayInfo,
        row.statusLabel,
      ];
    });

    if (targetRows.length > 0) {
      bodyRows.push([
        '',
        `TOTALES (${targetRows.length} alumnos)`,
        '',
        '',
        '',
        formatMxn(totalExpected),
        formatMxn(totalCollected),
        formatMxn(totalPending),
        '',
        '',
        '',
      ]);
    }

    autoTable(doc, {
      startY: tableStartY,
      margin: { left: margin, right: margin, bottom: 14 },
      head: [
        [
          '#',
          'Alumno',
          'Sede',
          'Categoría',
          'WhatsApp / Tutor',
          'Cuota Mes',
          'Pagado',
          'Adeudo',
          'Fecha Límite',
          'Último Pago Aprobado',
          'Estatus',
        ],
      ],
      body:
        bodyRows.length > 0
          ? bodyRows
          : [['-', 'No se encontraron alumnos para este criterio de reporte.', '', '', '', '', '', '', '', '', '']],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.7,
        cellPadding: 2.2,
        textColor: [31, 41, 55],
        lineColor: [229, 231, 235],
        lineWidth: 0.2,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [39, 39, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.7,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        5: { halign: 'right', cellWidth: 19 },
        6: { halign: 'right', cellWidth: 19 },
        7: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
        8: { halign: 'center', cellWidth: 22 },
        10: { halign: 'center', fontStyle: 'bold', cellWidth: 32 },
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;

        // Fila de totales al final
        if (targetRows.length > 0 && data.row.index === targetRows.length) {
          data.cell.styles.fillColor = [243, 244, 246];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [17, 24, 39];
          return;
        }

        // Resaltar columna de adeudo si > $0
        if (data.column.index === 7) {
          const rowItem = targetRows[data.row.index];
          if (rowItem && rowItem.pendingBalance > 0) {
            data.cell.styles.textColor = [190, 18, 60];
          } else {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }

        // Resaltar columna de estatus
        if (data.column.index === 10) {
          const rowItem = targetRows[data.row.index];
          if (!rowItem) return;
          if (rowItem.status === 'al_corriente') {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fillColor = [236, 253, 245];
          } else if (rowItem.status === 'en_revision' || rowItem.isPartial) {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fillColor = [255, 251, 235];
          } else {
            data.cell.styles.textColor = [190, 18, 60];
            data.cell.styles.fillColor = [255, 241, 242];
          }
        }
      },
    });
  }

  // --- PIE DE PÁGINA EN TODAS LAS HOJAS ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(115, 115, 115);
    doc.text(
      `Geckos Voleibol · Reporte oficial de pagos y adeudos (${periodLabel})`,
      margin,
      pageHeight - 6
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6, {
      align: 'right',
    });
  }

  const campusSlug =
    campusFilter !== 'all'
      ? `_${campusFilter.replace(/[^a-zA-Z0-9]+/g, '_')}`
      : '';
  const filename = `${filePrefixes[mode]}${campusSlug}_${todayStr}.pdf`;

  doc.save(filename);
  return { filename, recordCount };
};
