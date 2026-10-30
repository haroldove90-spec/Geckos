import React, { useState } from 'react';
import { Student, PaymentRecord } from '../../types';
import {
  UserPlus,
  Search,
  Users,
  Phone,
  Mail,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Save,
  CreditCard,
  FileText,
  Eye,
  DollarSign,
  Calendar,
} from 'lucide-react';

interface Props {
  students: Student[];
  payments?: PaymentRecord[];
  onAddStudent: (student: Omit<Student, 'id' | 'joinedDate'>) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
}

export const PlayersManagement: React.FC<Props> = ({
  students,
  payments = [],
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
}) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'balances'>('payments');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'mensualidad' | 'extra'>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    category: 'Sub-15' as Student['category'],
    branch: 'Femenil' as Student['branch'],
    jerseyNumber: 1,
    monthlyFee: 750,
    dueDay: 5,
    tutorName: '',
    tutorPhone: '',
    tutorEmail: '',
    currentBalance: 0,
    status: 'al_corriente' as Student['status'],
  });

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      fullName: '',
      category: 'Sub-15',
      branch: 'Femenil',
      jerseyNumber: 1,
      monthlyFee: 750,
      dueDay: 5,
      tutorName: '',
      tutorPhone: '',
      tutorEmail: '',
      currentBalance: 0,
      status: 'al_corriente',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      fullName: student.fullName,
      category: student.category,
      branch: student.branch,
      jerseyNumber: student.jerseyNumber,
      monthlyFee: student.monthlyFee,
      dueDay: student.dueDay,
      tutorName: student.tutorName,
      tutorPhone: student.tutorPhone,
      tutorEmail: student.tutorEmail,
      currentBalance: student.currentBalance,
      status: student.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.tutorName.trim()) return;

    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        ...formData,
      });
    } else {
      onAddStudent(formData);
    }
    setIsModalOpen(false);
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tutorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tutorPhone.includes(searchTerm);
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.receiptFolio && p.receiptFolio.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'al_corriente' && p.status === 'aprobado') ||
      (statusFilter === 'adeudo' && p.status === 'rechazado') ||
      (statusFilter === 'en_revision' && p.status === 'pendiente') ||
      p.status === statusFilter;
    const isExtra = p.paymentType === 'extra';
    const matchesType =
      paymentTypeFilter === 'all' ||
      (paymentTypeFilter === 'extra' && isExtra) ||
      (paymentTypeFilter === 'mensualidad' && !isExtra);
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-extrabold text-neutral-900 tracking-tight truncate">
            Módulo de Pagos
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Registro y control de pagos reportados por alumnos y asignación de cuotas.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-[#363435] hover:bg-[#000000] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap self-start sm:self-auto shrink-0"
        >
          <UserPlus className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Nueva Cuota / Alumno</span>
        </button>
      </div>

      {/* Tabs Selector: Pagos Registrados vs Control de Cuotas */}
      <div className="flex gap-2 p-1.5 bg-neutral-100 rounded-xl max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-white text-neutral-900 shadow-2xs border border-neutral-200/80'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-[#363435]" />
          <span>Pagos Registrados ({payments.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('balances')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'balances'
              ? 'bg-white text-neutral-900 shadow-2xs border border-neutral-200/80'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-[#363435]" />
          <span>Cuotas y Saldos ({students.length})</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'payments' ? "Buscar por alumno, concepto o folio..." : "Buscar por alumno o papá..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-[#363435] text-neutral-900"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-[#363435] text-neutral-800"
          >
            <option value="all">Todas las Categorías</option>
            <option value="Sub-13">Sub-13</option>
            <option value="Sub-15">Sub-15</option>
            <option value="Sub-18">Sub-18</option>
            <option value="Sub 23">Sub 23</option>
            <option value="Juvenil">Juvenil</option>
            <option value="Infantil">Infantil</option>
            <option value="Mini">Mini</option>
            <option value="Libre Femenil">Libre Femenil</option>
            <option value="Libre Varonil">Libre Varonil</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-[#363435] text-neutral-800"
          >
            <option value="all">Todos los Estados</option>
            <option value="al_corriente">Al Corriente / Aprobado</option>
            <option value="adeudo">Con Adeudo / Rechazado</option>
            <option value="en_revision">En Revisión / Pendiente</option>
          </select>

          {/* Payment Type Filter (when activeTab is payments) */}
          {activeTab === 'payments' && (
            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-[#363435] text-neutral-800"
            >
              <option value="all">Todos los Tipos de Pago</option>
              <option value="mensualidad">Solo Mensualidades</option>
              <option value="extra">Solo Pagos Extras (Torneos, Kits)</option>
            </select>
          )}
        </div>

        <div className="text-[11px] text-neutral-500 flex justify-between items-center pt-1">
          <span>
            {activeTab === 'payments'
              ? `Mostrando ${filteredPayments.length} de ${payments.length} pagos registrados`
              : `Mostrando ${filteredStudents.length} de ${students.length} alumnos registrados`}
          </span>
          {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' || paymentTypeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setStatusFilter('all');
                setPaymentTypeFilter('all');
              }}
              className="text-neutral-700 hover:underline font-semibold"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      </div>

      {/* VISTA 1: TABLA DE PAGOS REGISTRADOS POR ALUMNOS */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
          {filteredPayments.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              <CreditCard className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
              <p className="font-semibold text-neutral-700">No se encontraron pagos registrados</p>
              <p className="mt-1">Los comprobantes que reporten los alumnos aparecerán en este módulo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Alumno & Folio</th>
                    <th className="py-3 px-4">Concepto & Tipo</th>
                    <th className="py-3 px-4">Monto & Método</th>
                    <th className="py-3 px-4">Fecha de Pago</th>
                    <th className="py-3 px-4 text-center">Estado del Pago</th>
                    <th className="py-3 px-4 text-center">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-neutral-50/60 transition">
                      {/* Alumno */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900">{pay.studentName}</div>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          {pay.receiptFolio ? `Folio: ${pay.receiptFolio}` : `Ref: ${pay.referenceNumber}`}
                        </div>
                      </td>

                      {/* Concepto */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-neutral-800">{pay.concept}</span>
                          {pay.paymentType === 'extra' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-purple-100 text-purple-900 border border-purple-200">
                              Extra · {pay.extraCategory || 'Evento'}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          Reportado: {pay.reportedDate}
                        </div>
                      </td>

                      {/* Monto & Método */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-neutral-900 text-sm">
                          ${pay.amount} MXN
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {pay.method}
                        </div>
                      </td>

                      {/* Fecha de pago */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-neutral-800 font-medium">
                          {pay.paymentDate}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            pay.status === 'aprobado'
                              ? 'bg-emerald-50 text-emerald-700'
                              : pay.status === 'rechazado'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {pay.status === 'aprobado' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Validado / Aprobado</span>
                            </>
                          ) : pay.status === 'rechazado' ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>Rechazado</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Pendiente de Revisión</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Comprobante */}
                      <td className="py-3 px-4 text-center">
                        {pay.receiptUrl ? (
                          <button
                            onClick={() => setSelectedReceipt(pay)}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold inline-flex items-center gap-1 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Recibo</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-neutral-400">Sin archivo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: TABLA DE CUOTAS Y ALUMNOS */}
      {activeTab === 'balances' && (
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            <Users className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
            <p className="font-semibold text-neutral-700">No se encontraron jugadores</p>
            <p className="mt-1">Intenta con otro término de búsqueda o registra un nuevo alumno.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Jugador / Alumno</th>
                  <th className="py-3 px-4">Categoría & Camiseta</th>
                  <th className="py-3 px-4">Papá / Tutor Vinculado</th>
                  <th className="py-3 px-4 text-right">Cuota Mensual</th>
                  <th className="py-3 px-4 text-center">Estado de Cuenta</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-neutral-50/60 transition">
                    {/* Alumno */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900">{student.fullName}</div>
                      <div className="text-[11px] text-neutral-400">
                        Ingreso: {student.joinedDate} · Rama {student.branch}
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-neutral-800">{student.category}</span>
                        <span className="px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-800 font-mono text-[10px] font-bold">
                          #{student.jerseyNumber}
                        </span>
                      </div>
                    </td>

                    {/* Tutor */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-neutral-900">{student.tutorName}</div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-neutral-400" />
                          {student.tutorPhone}
                        </span>
                      </div>
                    </td>

                    {/* Cuota */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-bold text-neutral-900 tabular-nums">
                        ${student.monthlyFee} MXN
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        Corte: día {student.dueDay}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          student.status === 'al_corriente'
                            ? 'bg-emerald-50 text-emerald-700'
                            : student.status === 'adeudo'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {student.status === 'al_corriente' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Al corriente</span>
                          </>
                        ) : student.status === 'adeudo' ? (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            <span>Adeuda ${student.currentBalance}</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>En revisión</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(student)}
                          title="Editar alumno"
                          className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setStudentToDelete(student)}
                          title="Eliminar registro"
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Modal: Visualizador de Comprobante / Recibo de Pago */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-[#363435]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#363435]" />
                <h3 className="text-base font-bold text-neutral-900">
                  Comprobante de Pago Reportado
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Alumno</span>
                  <span className="font-bold text-neutral-900 text-sm">{selectedReceipt.studentName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Monto</span>
                  <span className="font-mono font-bold text-neutral-900 text-sm">${selectedReceipt.amount} MXN</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-400 block">Concepto:</span>
                  <span className="font-semibold text-neutral-800">{selectedReceipt.concept}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-400 block">Método:</span>
                  <span className="font-semibold text-neutral-800">{selectedReceipt.method}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-400 block">Fecha de Pago:</span>
                  <span className="font-mono text-neutral-800">{selectedReceipt.paymentDate}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-400 block">Referencia / Folio:</span>
                  <span className="font-mono text-neutral-800">{selectedReceipt.referenceNumber}</span>
                </div>
              </div>

              {/* Vista previa del comprobante */}
              <div className="mt-3 border border-neutral-200 rounded-xl overflow-hidden bg-neutral-100 p-2 text-center">
                <span className="text-[10px] text-neutral-400 block mb-1">Evidencia Digital de Pago:</span>
                {selectedReceipt.receiptUrl.startsWith('data:image') || selectedReceipt.receiptUrl.startsWith('http') ? (
                  <img
                    src={selectedReceipt.receiptUrl}
                    alt="Comprobante"
                    className="max-h-64 mx-auto rounded-lg object-contain shadow-xs bg-white"
                  />
                ) : (
                  <div className="p-6 bg-white rounded-lg text-neutral-500 font-mono text-xs">
                    {selectedReceipt.receiptUrl}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-[#000000] text-white font-bold rounded-xl text-xs hover:bg-[#363435] transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alta / Edición de Alumno */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-[#363435] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">
                {editingStudent ? 'Editar Jugador' : 'Registrar Nuevo Jugador'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              {/* Sección 1: Datos del Jugador */}
              <div className="space-y-3">
                <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider text-[11px] pb-1 border-b border-neutral-100">
                  1. Datos del Jugador
                </h4>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Nombre Completo del Jugador *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sofía Morales Vega"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Categoría *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category: e.target.value as Student['category'],
                        })
                      }
                      className="w-full px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                    >
                      <option value="Sub-13">Sub-13</option>
                      <option value="Sub-15">Sub-15</option>
                      <option value="Sub-18">Sub-18</option>
                      <option value="Libre Femenil">Libre Femenil</option>
                      <option value="Libre Varonil">Libre Varonil</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Rama *
                    </label>
                    <select
                      value={formData.branch}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          branch: e.target.value as Student['branch'],
                        })
                      }
                      className="w-full px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                    >
                      <option value="Femenil">Femenil</option>
                      <option value="Varonil">Varonil</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      # Camiseta
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="0"
                      value={formData.jerseyNumber ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          jerseyNumber: parseInt(e.target.value.replace(/\D/g, '')) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono no-spinner"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Datos del Tutor / Papá */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider text-[11px] pb-1 border-b border-neutral-100">
                  2. Datos del Tutor / Padre de Familia
                </h4>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Nombre del Papá o Tutor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Roberto Morales Cisneros"
                    value={formData.tutorName}
                    onChange={(e) => setFormData({ ...formData, tutorName: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+52 55..."
                      value={formData.tutorPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, tutorPhone: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={formData.tutorEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, tutorEmail: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Cuota y Fechas */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider text-[11px] pb-1 border-b border-neutral-100">
                  3. Asignación de Cuotas
                </h4>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Cuota Mensual ($)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0.00"
                      value={formData.monthlyFee ?? ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setFormData({
                          ...formData,
                          monthlyFee: parseFloat(val) || 0,
                        });
                      }}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono no-spinner"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Día Límite / Corte
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="5"
                      value={formData.dueDay ?? ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFormData({
                          ...formData,
                          dueDay: parseInt(val) || 5,
                        });
                      }}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono no-spinner"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Saldo Actual ($)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0.00"
                      value={formData.currentBalance ?? ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        const bal = parseFloat(val) || 0;
                        setFormData({
                          ...formData,
                          currentBalance: bal,
                          status: bal > 0 ? 'adeudo' : 'al_corriente',
                        });
                      }}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900 font-mono no-spinner"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 font-semibold hover:bg-neutral-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#000000] text-white font-semibold hover:bg-[#363435] transition flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>{editingStudent ? 'Guardar Cambios' : 'Registrar Alumno'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar alumno */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 mb-1">
              ¿Eliminar Alumno?
            </h3>
            <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
              ¿Estás seguro de que deseas eliminar el registro de{' '}
              <span className="font-semibold text-neutral-800">{studentToDelete.fullName}</span>? Sus pagos y comprobantes asociados también serán removidos.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteStudent(studentToDelete.id);
                  setStudentToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition shadow-xs cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
