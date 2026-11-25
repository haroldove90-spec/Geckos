import React, { useEffect, useMemo, useState } from 'react';
import { BillingCycle, PaymentRecord, Student, SystemUser } from '../../types';
import {
  FileDown,
  X,
  CheckCircle2,
  AlertTriangle,
  Users,
  CreditCard,
  Loader2,
  Filter,
} from 'lucide-react';
import {
  buildStudentBillingRows,
  exportPaymentsReportPdf,
  PaymentPdfReportMode,
} from '../../utils/paymentsPdfExport';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  payments: PaymentRecord[];
  cycles: BillingCycle[];
  currentUser?: SystemUser | null;
  isCoachScoped?: boolean;
  defaultMode?: PaymentPdfReportMode;
  initialCategoryFilter?: string;
}

export const ExportPaymentsPdfModal: React.FC<Props> = ({
  isOpen,
  onClose,
  students,
  payments,
  cycles,
  currentUser,
  isCoachScoped = false,
  defaultMode = 'all_balances',
  initialCategoryFilter = 'all',
}) => {
  const [mode, setMode] = useState<PaymentPdfReportMode>(defaultMode);
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategoryFilter);
  const [onlyActiveStudents, setOnlyActiveStudents] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setCategoryFilter(initialCategoryFilter);
      setFeedback(null);
    }
  }, [isOpen, defaultMode, initialCategoryFilter]);

  const availableCampuses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.campus && s.campus.trim()) set.add(s.campus.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [students]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [students]);

  const previewStats = useMemo(() => {
    const rows = buildStudentBillingRows(students, payments, cycles, {
      campusFilter,
      categoryFilter,
      onlyActiveStudents,
    });
    const paidRows = rows.filter((r) => r.status === 'al_corriente');
    const debtRows = rows.filter((r) => r.status === 'adeudo' || r.pendingBalance > 0);
    const allowedIds = new Set(rows.map((r) => r.student.id));
    const filteredPaymentsCount = payments.filter((p) => allowedIds.has(p.studentId)).length;

    const activeRows =
      mode === 'paid_only'
        ? paidRows
        : mode === 'debt_only'
        ? debtRows
        : rows;

    const totalCollected = activeRows.reduce((sum, r) => sum + r.paidCurrentPeriod, 0);
    const totalPending = activeRows.reduce((sum, r) => sum + r.pendingBalance, 0);

    return {
      totalStudents: rows.length,
      paidCount: paidRows.length,
      debtCount: debtRows.length,
      paymentsCount: filteredPaymentsCount,
      selectedCount: mode === 'payments_history' ? filteredPaymentsCount : activeRows.length,
      totalCollected,
      totalPending,
    };
  }, [students, payments, cycles, campusFilter, categoryFilter, onlyActiveStudents, mode]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setFeedback(null);
    try {
      const res = await exportPaymentsReportPdf({
        mode,
        students,
        payments,
        cycles,
        campusFilter,
        categoryFilter,
        onlyActiveStudents,
        generatedBy: currentUser,
        isCoachScoped,
      });
      setFeedback({
        type: 'ok',
        text: `PDF descargado: ${res.filename} (${res.recordCount} registro${res.recordCount === 1 ? '' : 's'}).`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'err',
        text: err?.message || 'No se pudo generar el archivo PDF. Inténtalo de nuevo.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const reportOptions: {
    id: PaymentPdfReportMode;
    title: string;
    subtitle: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    accentClass: string;
  }[] = [
    {
      id: 'all_balances',
      title: 'Reporte Completo (Pagados y Adeudos)',
      subtitle: 'Todos los alumnos con cuota, monto pagado, adeudo pendiente y estatus.',
      count: previewStats.totalStudents,
      icon: Users,
      accentClass: 'text-neutral-800 bg-neutral-100',
    },
    {
      id: 'debt_only',
      title: 'Solo Adeudos / Faltantes por Pagar',
      subtitle: 'Alumnos pendientes de pago, abonos parciales y días de retraso.',
      count: previewStats.debtCount,
      icon: AlertTriangle,
      accentClass: 'text-rose-700 bg-rose-50',
    },
    {
      id: 'paid_only',
      title: 'Solo Alumnos Pagados (Al Corriente)',
      subtitle: 'Listado de alumnos que ya liquidaron su mensualidad actual.',
      count: previewStats.paidCount,
      icon: CheckCircle2,
      accentClass: 'text-emerald-700 bg-emerald-50',
    },
    {
      id: 'payments_history',
      title: 'Historial de Pagos Registrados',
      subtitle: 'Detalle de comprobantes (mensualidades y pagos extras), métodos y folios.',
      count: previewStats.paymentsCount,
      icon: CreditCard,
      accentClass: 'text-amber-800 bg-amber-50',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 border border-neutral-200 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto animate-scaleUp">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-neutral-900 text-amber-400 shrink-0">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-neutral-900">
                Exportar Reporte de Pagos y Adeudos (PDF)
              </h3>
              <p className="text-xs text-neutral-500">
                Elige el tipo de reporte y filtros antes de descargar el documento oficial.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Tipo de Reporte */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-neutral-700">
            1. Selecciona qué deseas exportar
          </label>
          <div className="grid grid-cols-1 gap-2">
            {reportOptions.map((opt) => {
              const Icon = opt.icon;
              const active = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setMode(opt.id);
                    setFeedback(null);
                  }}
                  className={`w-full p-3 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    active
                      ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900/15'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${opt.accentClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                        {opt.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-neutral-200/80 text-neutral-800 shrink-0 tabular-nums">
                        {opt.count}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{opt.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtros Opcionales */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
            <Filter className="w-3.5 h-3.5 text-neutral-500" />
            <span>2. Filtros opcionales</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                Sede de Entrenamiento
              </label>
              <select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 focus:outline-none focus:border-neutral-900"
              >
                <option value="all">Todas las Sedes</option>
                {availableCampuses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                Categoría
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 focus:outline-none focus:border-neutral-900"
              >
                <option value="all">Todas las Categorías</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer pt-0.5">
            <input
              type="checkbox"
              checked={onlyActiveStudents}
              onChange={(e) => setOnlyActiveStudents(e.target.checked)}
              className="accent-neutral-900 rounded"
            />
            <span className="font-medium">Incluir únicamente alumnos activos</span>
          </label>
        </div>

        {/* Resumen previo al PDF */}
        {mode !== 'payments_history' && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
              <span className="text-[10px] font-bold uppercase text-neutral-400 block">
                En reporte
              </span>
              <span className="text-sm font-extrabold text-neutral-900 tabular-nums">
                {previewStats.selectedCount} alumnos
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                Pagado mes
              </span>
              <span className="text-sm font-extrabold text-emerald-800 font-mono tabular-nums">
                ${previewStats.totalCollected.toLocaleString('es-MX')}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-[10px] font-bold uppercase text-rose-700 block">
                Por cobrar
              </span>
              <span className="text-sm font-extrabold text-rose-800 font-mono tabular-nums">
                ${previewStats.totalPending.toLocaleString('es-MX')}
              </span>
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
              feedback.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            className="px-5 py-2.5 rounded-xl bg-[#000000] hover:bg-[#363435] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Generando PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-amber-400" />
                <span>Descargar PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
