import React, { useState } from 'react';
import { PaymentRecord, Student, ExtraPaymentCategory } from '../../types';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Eye,
  Trophy,
  Shirt,
  ClipboardList,
  Bus,
  Tag,
  CreditCard,
  Plus,
} from 'lucide-react';

interface Props {
  currentStudent: Student;
  payments: PaymentRecord[];
  onViewDigitalReceipt: (payment: PaymentRecord) => void;
  onNavigateToPay: () => void;
}

const getExtraBadge = (cat?: ExtraPaymentCategory) => {
  switch (cat) {
    case 'torneo':
      return { label: 'Torneo', icon: Trophy, bg: 'bg-amber-100 text-amber-900 border-amber-200' };
    case 'inscripcion':
      return { label: 'Inscripción', icon: ClipboardList, bg: 'bg-blue-100 text-blue-900 border-blue-200' };
    case 'uniforme':
      return { label: 'Uniforme', icon: Shirt, bg: 'bg-purple-100 text-purple-900 border-purple-200' };
    case 'arbitraje':
      return { label: 'Arbitraje', icon: Clock, bg: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
    case 'transporte':
      return { label: 'Transporte', icon: Bus, bg: 'bg-orange-100 text-orange-900 border-orange-200' };
    default:
      return { label: 'Pago Extra', icon: Tag, bg: 'bg-neutral-100 text-neutral-900 border-neutral-200' };
  }
};

export const PaymentHistory: React.FC<Props> = ({
  currentStudent,
  payments,
  onViewDigitalReceipt,
  onNavigateToPay,
}) => {
  const [filter, setFilter] = useState<'all' | 'aprobado' | 'pendiente' | 'rechazado'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mensualidad' | 'extra'>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const studentPayments = payments.filter((p) => p.studentId === currentStudent.id);

  const filtered = studentPayments.filter((p) => {
    const matchesStatus = filter === 'all' || p.status === filter;
    const isExtra = p.paymentType === 'extra';
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'extra' && isExtra) ||
      (typeFilter === 'mensualidad' && !isExtra);

    return matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-extrabold text-neutral-900 tracking-tight truncate">
            Historial de Pagos & Comprobantes
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Registro completo de mensualidades y pagos extras para {currentStudent.fullName}.
          </p>
        </div>

        <button
          onClick={onNavigateToPay}
          className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-[#000000] hover:bg-[#363435] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Reportar Nuevo Pago / Extra</span>
        </button>
      </div>

      {/* Filter Tabs Bar */}
      <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs">
        {/* Row 1: Status Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex p-1 bg-neutral-100 rounded-xl w-full sm:max-w-md">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Todos ({studentPayments.length})
            </button>
            <button
              onClick={() => setFilter('aprobado')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filter === 'aprobado'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Aprobados
            </button>
            <button
              onClick={() => setFilter('pendiente')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filter === 'pendiente'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              En Revisión
            </button>
            <button
              onClick={() => setFilter('rechazado')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filter === 'rechazado'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Rechazados
            </button>
          </div>

          {/* Row 2: Type Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Todos los Tipos
            </button>
            <button
              onClick={() => setTypeFilter('mensualidad')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                typeFilter === 'mensualidad'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Mensualidades</span>
            </button>
            <button
              onClick={() => setTypeFilter('extra')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                typeFilter === 'extra'
                  ? 'bg-purple-900 text-white'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Pagos Extras</span>
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-xs text-neutral-400">
          <Clock className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
          <p className="font-semibold text-neutral-700">No hay pagos registrados con este filtro</p>
          <p className="mt-1">Los pagos reportados aparecerán aquí con su respectivo estatus y acuse.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((payment) => {
            const isApproved = payment.status === 'aprobado';
            const isPending = payment.status === 'pendiente';
            const isRejected = payment.status === 'rechazado';
            const isExtra = payment.paymentType === 'extra';
            const extraMeta = isExtra ? getExtraBadge(payment.extraCategory) : null;
            const ExtraIcon = extraMeta?.icon || Tag;

            return (
              <div
                key={payment.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 transition shadow-2xs ${
                  isRejected
                    ? 'border-rose-200 bg-rose-50/20'
                    : isPending
                    ? isExtra
                      ? 'border-purple-200 bg-purple-50/20'
                      : 'border-amber-200 bg-amber-50/20'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-neutral-900 text-sm sm:text-base">
                        {payment.concept}
                      </span>

                      {/* Extra payment badge */}
                      {isExtra && extraMeta && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${extraMeta.bg}`}
                        >
                          <ExtraIcon className="w-3 h-3" />
                          <span>{extraMeta.label}</span>
                        </span>
                      )}

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPending
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isApproved ? 'Aprobado' : isPending ? 'En Revisión' : 'Rechazado'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 pt-1">
                      <span>Método: <strong className="text-neutral-700">{payment.method}</strong></span>
                      <span>Ref: <strong className="text-neutral-700 font-mono">{payment.referenceNumber}</strong></span>
                      <span>Fecha de Pago: <strong className="text-neutral-700">{payment.paymentDate}</strong></span>
                      {payment.receiptFolio && (
                        <span>Folio Acuse: <strong className="text-neutral-700 font-mono">{payment.receiptFolio}</strong></span>
                      )}
                    </div>

                    {payment.notes && (
                      <p className="text-[11px] text-neutral-500 pt-0.5">
                        <span className="font-medium text-neutral-600">Nota enviada:</span> {payment.notes}
                      </p>
                    )}

                    {isRejected && payment.rejectionReason && (
                      <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-rose-700">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Motivo de Rechazo por el Head Coach:</span>
                        </div>
                        <p className="text-neutral-700 text-xs pl-5">
                          {payment.rejectionReason}
                        </p>
                        <div className="pt-1 pl-5">
                          <button
                            onClick={onNavigateToPay}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Volver a cargar comprobante corregido</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100 gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-lg sm:text-xl font-mono font-extrabold text-neutral-900 tabular-nums">
                        ${payment.amount} <span className="text-xs font-sans text-neutral-500 font-normal">MXN</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block">
                        Reportado: {payment.reportedDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewImage(payment.receiptUrl)}
                        title="Ver comprobante"
                        className="px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Comprobante</span>
                      </button>

                      {isApproved && (
                        <button
                          onClick={() => onViewDigitalReceipt(payment)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Acuse Digital</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Preview Image */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-neutral-200 text-[#363435]">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-900 text-sm">Comprobante de Pago Subido</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="my-3 rounded-xl overflow-hidden bg-neutral-100 max-h-[360px] flex items-center justify-center border border-neutral-200">
              <img src={previewImage} alt="Comprobante" className="max-h-[350px] w-full object-contain" />
            </div>
            <button
              onClick={() => setPreviewImage(null)}
              className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
