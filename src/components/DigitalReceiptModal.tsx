import React from 'react';
import { PaymentRecord, Student } from '../types';
import { Printer, CheckCircle2, ShieldCheck, Download, X, QrCode } from 'lucide-react';

interface Props {
  payment: PaymentRecord;
  student?: Student | null;
  onClose: () => void;
}

export const DigitalReceiptModal: React.FC<Props> = ({
  payment,
  student,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200 print:p-0 print:bg-white">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-neutral-200 text-[#363435] relative print:shadow-none print:border-none print:max-w-none print:w-full">
        {/* Header Actions (hidden on print) */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 print:hidden">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Pago Conciliado y Validado</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-600" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="mt-6 space-y-6">
          {/* Logo del negocio de tamaño completo (sin encapsular) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b-2 border-neutral-900">
            <img
              src="https://avchpdtkogejgnomkxua.supabase.co/storage/v1/object/public/iconos/geckoslogo.png"
              alt="Gecko´s Veoleibol"
              className="h-14 sm:h-16 w-auto object-contain"
            />
            <div className="text-center sm:text-right">
              <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 block">
                Acuse Digital Oficial
              </span>
              <span className="font-mono text-base font-extrabold text-neutral-900">
                {payment.receiptFolio || 'GCK-2026-VAL'}
              </span>
              <span className="text-[11px] text-neutral-500 block">
                Fecha de Emisión: {payment.reviewedDate || payment.reportedDate}
              </span>
            </div>
          </div>

          {/* Datos del Alumno y Pago */}
          <div className="space-y-4 text-xs">
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Alumno:</span>
                <span className="font-bold text-neutral-900 text-sm">{payment.studentName}</span>
              </div>
              {student && (
                <div className="flex justify-between items-center text-neutral-600">
                  <span>Categoría & Camiseta:</span>
                  <span className="font-semibold text-neutral-800">
                    {student.category} · #{student.jerseyNumber}
                  </span>
                </div>
              )}
              {student && (
                <div className="flex justify-between items-center text-neutral-600">
                  <span>Tutor Registrado:</span>
                  <span>{student.tutorName}</span>
                </div>
              )}
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100">
              <div className="p-3 flex justify-between items-center bg-neutral-50/50">
                <span className="text-neutral-500">Tipo de Acreditación:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  payment.paymentType === 'extra'
                    ? 'bg-purple-100 text-purple-900 border border-purple-200'
                    : 'bg-neutral-200 text-neutral-800'
                }`}>
                  {payment.paymentType === 'extra' ? 'Pago Extraordinario / Evento' : 'Mensualidad Regular'}
                </span>
              </div>
              <div className="p-3 flex justify-between bg-neutral-50/50">
                <span className="text-neutral-500">Concepto Acreditado:</span>
                <span className="font-bold text-neutral-900">{payment.concept}</span>
              </div>
              {payment.eventName && (
                <div className="p-3 flex justify-between">
                  <span className="text-neutral-500">Torneo o Evento:</span>
                  <span className="font-semibold text-neutral-800">{payment.eventName}</span>
                </div>
              )}
              <div className="p-3 flex justify-between">
                <span className="text-neutral-500">Método de Pago:</span>
                <span className="font-semibold text-neutral-800">{payment.method}</span>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-neutral-500">Folio / Referencia SPEI:</span>
                <span className="font-mono font-semibold text-neutral-800">{payment.referenceNumber}</span>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-neutral-500">Fecha de Operación:</span>
                <span className="text-neutral-800">{payment.paymentDate}</span>
              </div>
              {payment.notes && (
                <div className="p-3 flex justify-between text-neutral-600">
                  <span className="text-neutral-500">Observaciones:</span>
                  <span className="italic">{payment.notes}</span>
                </div>
              )}
              <div className="p-4 flex justify-between items-center bg-neutral-900 text-white rounded-b-xl">
                <span className="font-semibold">Importe Total Validado:</span>
                <span className="font-mono text-xl font-extrabold tabular-nums">
                  ${payment.amount}.00 MXN
                </span>
              </div>
            </div>
          </div>

          {/* Sello de Autenticidad & QR */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-neutral-900 block">Validado por Head Coach Oficial</span>
                <span className="font-mono text-[10px]">HASH: 98f4c1e7-geckops-2026</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-neutral-400 block">Geckos Voleibol</span>
              <span className="text-[10px] text-neutral-400">Comprobante Fiscal Interno</span>
            </div>
          </div>
        </div>

        {/* Footer actions on screen */}
        <div className="mt-6 pt-4 border-t border-neutral-100 flex gap-2 print:hidden">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs transition"
          >
            Cerrar Acuse
          </button>
        </div>
      </div>
    </div>
  );
};
