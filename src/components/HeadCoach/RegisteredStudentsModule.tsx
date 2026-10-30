import React, { useState } from 'react';
import { Student, StudentCategory } from '../../types';
import {
  Users,
  Search,
  Filter,
  Printer,
  FileText,
  MapPin,
  HeartPulse,
  Phone,
  Calendar,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Eye,
  X,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  CheckCircle2,
  Download,
  CheckSquare,
  Square,
  MinusSquare,
  AlertTriangle,
  UserX,
  Save,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { exportStudentsToPDF } from '../../utils/pdfExport';

interface Props {
  students: Student[];
  sedes: string[];
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onBulkDeleteStudents: (ids: string[]) => void;
  onToggleStudentActive: (id: string, active: boolean) => void;
  onBulkToggleStudentsActive: (ids: string[], active: boolean) => void;
  onAddSede: (newSede: string) => void;
  onNavigateToRegistration?: () => void;
}

export const RegisteredStudentsModule: React.FC<Props> = ({
  students,
  sedes,
  onUpdateStudent,
  onDeleteStudent,
  onBulkDeleteStudents,
  onToggleStudentActive,
  onBulkToggleStudentsActive,
  onAddSede,
  onNavigateToRegistration,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // New Sede input state within edit modal
  const [newSedeInput, setNewSedeInput] = useState('');
  const [isAddingSede, setIsAddingSede] = useState(false);

  const showFeedback = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Filtered Students
  const filtered = students.filter((s) => {
    const matchSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tutorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.whatsapp && s.whatsapp.includes(searchTerm)) ||
      (s.campus && s.campus.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchCampus = campusFilter === 'all' || s.campus === campusFilter;
    const matchCategory = categoryFilter === 'all' || s.category === categoryFilter;
    const matchBranch = branchFilter === 'all' || s.branch === branchFilter;
    
    const isStudentActive = s.isActive !== false;
    const matchActive =
      activeStatusFilter === 'all' ||
      (activeStatusFilter === 'active' && isStudentActive) ||
      (activeStatusFilter === 'inactive' && !isStudentActive);

    return matchSearch && matchCampus && matchCategory && matchBranch && matchActive;
  });

  // Selection Logic
  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selectedIds.includes(s.id));
  const someFilteredSelected = filtered.some((s) => selectedIds.includes(s.id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      // Unselect only filtered items
      const filteredIdSet = new Set(filtered.map((s) => s.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      // Select all filtered items
      const newIds = new Set([...selectedIds, ...filtered.map((s) => s.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // PDF Export
  const handleExportAllPDF = () => {
    if (filtered.length === 0) {
      showFeedback('No hay registros para exportar con los filtros actuales', 'info');
      return;
    }
    exportStudentsToPDF(filtered, 'Padrón Oficial de Alumnos Registrados');
    showFeedback(`PDF descargado con ${filtered.length} alumnos`);
  };

  const handleExportSelectedPDF = () => {
    const selectedStudents = students.filter((s) => selectedIds.includes(s.id));
    if (selectedStudents.length === 0) return;
    exportStudentsToPDF(selectedStudents, `Padrón Seleccionado (${selectedStudents.length} Alumnos)`);
    showFeedback(`PDF generado con ${selectedStudents.length} alumnos seleccionados`);
  };

  // Bulk Actions
  const handleBulkDeactivate = () => {
    onBulkToggleStudentsActive(selectedIds, false);
    showFeedback(`${selectedIds.length} alumno(s) desactivado(s) correctamente`);
    setSelectedIds([]);
  };

  const handleBulkActivate = () => {
    onBulkToggleStudentsActive(selectedIds, true);
    showFeedback(`${selectedIds.length} alumno(s) activado(s) correctamente`);
    setSelectedIds([]);
  };

  const handleConfirmBulkDelete = () => {
    onBulkDeleteStudents(selectedIds);
    showFeedback(`${selectedIds.length} alumno(s) eliminado(s) permanentemente`);
    setSelectedIds([]);
    setIsBulkDeleting(false);
  };

  // Single Actions
  const handleSaveEditedStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    onUpdateStudent(editingStudent);
    showFeedback(`Datos de ${editingStudent.fullName} actualizados con éxito`);
    setEditingStudent(null);
  };

  const handleConfirmSingleDelete = () => {
    if (!studentToDelete) return;
    onDeleteStudent(studentToDelete.id);
    setSelectedIds((prev) => prev.filter((id) => id !== studentToDelete.id));
    showFeedback(`Alumno ${studentToDelete.fullName} eliminado`);
    setStudentToDelete(null);
  };

  const handleToggleSingleActive = (student: Student) => {
    const newActiveState = student.isActive === false;
    onToggleStudentActive(student.id, newActiveState);
    showFeedback(
      `Alumno ${student.fullName} ${newActiveState ? 'activado' : 'desactivado'}`
    );
  };

  const handleAddNewSede = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSedeInput.trim();
    if (!clean) return;
    onAddSede(clean);
    if (editingStudent) {
      setEditingStudent({ ...editingStudent, campus: clean });
    }
    setNewSedeInput('');
    setIsAddingSede(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className="fixed top-20 right-5 z-50 bg-[#363435] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border border-amber-400 text-xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">{feedbackMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
              Alumnos Registrados
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#363435] text-white text-xs font-bold font-mono">
              {filtered.length} atletas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Padrón completo de alumnos, sedes, contactos de emergencia y expediente médico. Control total de edición, borrado, activación y exportación PDF.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportAllPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#000000] hover:bg-[#363435] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            title="Descargar padrón en formato PDF oficial"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Exportar PDF Completo</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition"
            title="Imprimir vista de padrón"
          >
            <Printer className="w-4 h-4 text-neutral-500" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* ENCABEZADO DE IMPRESIÓN PARA NAVEGADOR (Solo visible al imprimir window.print) */}
      <div className="hidden print:block pb-4 mb-4 border-b-2 border-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-neutral-900">Geckos Voleibol Club</h2>
            <p className="text-xs text-neutral-600">Padrón Oficial de Alumnos Registrados · Temporada 2026</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-600">Generado el: {new Date().toLocaleDateString('es-MX')}</p>
            <p className="text-[10px] text-neutral-400">Total: {filtered.length} atletas</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-3 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Búsqueda */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por alumno, tutor, WhatsApp o sede..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-[#363435] text-neutral-900"
            />
          </div>

          {/* Sede */}
          <select
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-[#363435] text-neutral-800"
          >
            <option value="all">Todas las Sedes</option>
            {sedes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Categoría */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-[#363435] text-neutral-800"
          >
            <option value="all">Todas las Categorías</option>
            <option value="Sub 23">Sub 23</option>
            <option value="Juvenil">Juvenil</option>
            <option value="Infantil">Infantil</option>
            <option value="Mini">Mini</option>
            <option value="Sub-13">Sub-13</option>
            <option value="Sub-15">Sub-15</option>
            <option value="Sub-18">Sub-18</option>
            <option value="Libre Femenil">Libre Femenil</option>
            <option value="Libre Varonil">Libre Varonil</option>
          </select>

          {/* Rama */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-[#363435] text-neutral-800"
          >
            <option value="all">Ambas Ramas</option>
            <option value="Femenil">Femenil</option>
            <option value="Varonil">Varonil</option>
          </select>

          {/* Estado de Actividad */}
          <select
            value={activeStatusFilter}
            onChange={(e) => setActiveStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-[#363435] text-neutral-800"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Solo Activos</option>
            <option value="inactive">Solo Desactivados / Inactivos</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-neutral-500 pt-1 gap-2">
          <div className="flex items-center gap-3">
            <span>Mostrando <strong>{filtered.length}</strong> de <strong>{students.length}</strong> registros totales</span>
            {selectedIds.length > 0 && (
              <span className="font-bold text-[#363435] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                {selectedIds.length} seleccionados
              </span>
            )}
          </div>
          {(searchTerm || campusFilter !== 'all' || categoryFilter !== 'all' || branchFilter !== 'all' || activeStatusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCampusFilter('all');
                setCategoryFilter('all');
                setBranchFilter('all');
                setActiveStatusFilter('all');
              }}
              className="text-[#363435] font-semibold hover:underline cursor-pointer"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      </div>

      {/* BARRA FLOTANTE DE ACCIONES MASIVAS CUANDO HAY SELECCIÓN */}
      {selectedIds.length > 0 && (
        <div className="bg-[#363435] text-white p-3 sm:p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-neutral-700 animate-in fade-in slide-in-from-bottom-2 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-neutral-900 flex items-center justify-center font-bold text-sm">
              {selectedIds.length}
            </div>
            <div>
              <div className="text-xs font-bold">
                {selectedIds.length === 1 ? '1 alumno seleccionado' : `${selectedIds.length} alumnos seleccionados`}
              </div>
              <div className="text-[10px] text-neutral-300">
                Aplica acciones grupales a los registros marcados
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportSelectedPDF}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>Exportar PDF Seleccionados</span>
            </button>

            <button
              onClick={handleBulkActivate}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Activar</span>
            </button>

            <button
              onClick={handleBulkDeactivate}
              className="px-3 py-1.5 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <PowerOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Desactivar</span>
            </button>

            <button
              onClick={() => setIsBulkDeleting(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>

            <button
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-xs transition cursor-pointer"
              title="Deseleccionar todos"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tabla de Alumnos Registrados */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden w-full max-w-full">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-400 px-4">
            <Users className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
            <h3 className="font-bold text-neutral-800 text-base">No hay alumnos registrados en el sistema</h3>
            <p className="mt-1 text-neutral-500 max-w-md mx-auto">
              Los registros de muestra han sido eliminados por completo. Utiliza el formulario de registro en la pantalla de inicio para inscribir a los nuevos alumnos reales del club.
            </p>
            {onNavigateToRegistration && (
              <button
                onClick={onNavigateToRegistration}
                className="mt-4 px-4 py-2 bg-[#000000] hover:bg-[#363435] text-white font-bold rounded-xl text-xs transition inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Ir al Formulario de Registro</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/90 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                  {/* Master Checkbox */}
                  <th className="py-3 px-3 text-center w-10 print:hidden">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      title={allFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      className="text-neutral-500 hover:text-neutral-900 cursor-pointer"
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#363435]" />
                      ) : someFilteredSelected ? (
                        <MinusSquare className="w-4 h-4 text-[#363435]" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-300" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Alumno</th>
                  <th className="py-3 px-3">Sede & Categoría</th>
                  <th className="py-3 px-3">WhatsApp / Teléfono</th>
                  <th className="py-3 px-3">Tutor / Emergencia</th>
                  <th className="py-3 px-3">Alergias & Salud</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-4 text-right print:hidden">Acciones Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((student) => {
                  const isSelected = selectedIds.includes(student.id);
                  const isActive = student.isActive !== false;

                  return (
                    <tr
                      key={student.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-amber-50/60'
                          : !isActive
                          ? 'bg-neutral-50/50 opacity-80'
                          : 'hover:bg-neutral-50/60'
                      }`}
                    >
                      {/* Individual Checkbox */}
                      <td className="py-3 px-3 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(student.id)}
                          className="cursor-pointer text-neutral-400 hover:text-neutral-900"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#363435]" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-300" />
                          )}
                        </button>
                      </td>

                      {/* Alumno */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-neutral-900 text-sm">
                            {student.fullName}
                          </div>
                          {!isActive && (
                            <span className="px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-600 text-[9px] font-bold">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{student.birthDate || 'F. Nac N/D'}</span>
                          <span>·</span>
                          <span className="font-semibold text-neutral-700">Rama {student.branch}</span>
                          {student.registrationType === 'adult' ? (
                            <span className="px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-800 text-[9px] font-bold">
                              18+ Adulto
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[9px] font-semibold">
                              Menor
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sede y Categoría */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-neutral-900 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{student.campus || 'Sede Central'}</span>
                        </div>
                        <div className="mt-0.5">
                          <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 font-bold text-[10px]">
                            {student.category}
                          </span>
                        </div>
                      </td>

                      {/* Contacto WhatsApp */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-neutral-900 font-medium">
                          {student.whatsapp || student.tutorPhone || 'Sin número'}
                        </div>
                        {student.whatsapp && (
                          <a
                            href={`https://wa.me/${student.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-emerald-600 font-bold hover:underline inline-flex items-center gap-1 print:hidden"
                          >
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </td>

                      {/* Tutor y Emergencia */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-neutral-900 truncate max-w-[140px]">
                          {student.tutorName}
                        </div>
                        <div className="text-[11px] text-rose-600 flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="w-3 h-3 text-rose-400 shrink-0" />
                          <span>{student.emergencyPhone || student.tutorPhone || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Alergias y padecimientos */}
                      <td className="py-3 px-3 max-w-[180px]">
                        <div className="text-[11px] text-neutral-800 truncate" title={student.allergies}>
                          <strong>Alergia:</strong> {student.allergies || 'Ninguna'}
                        </div>
                        <div className="text-[11px] text-neutral-600 mt-0.5 truncate" title={student.chronicCondition}>
                          <strong>Padec:</strong> {student.chronicCondition || 'Ninguno'}
                        </div>
                      </td>

                      {/* Estado Activo / Inactivo */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSingleActive(student)}
                          title={isActive ? 'Clic para desactivar alumno' : 'Clic para activar alumno'}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Power className="w-3 h-3 text-emerald-700" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <PowerOff className="w-3 h-3 text-neutral-500" />
                              <span>Inactivo</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Acciones Admin (Ver, Editar, Borrar, Desactivar) */}
                      <td className="py-3 px-4 text-right print:hidden">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ver Ficha */}
                          <button
                            type="button"
                            onClick={() => setViewingStudent(student)}
                            title="Ver ficha completa"
                            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => setEditingStudent({ ...student })}
                            title="Editar información del alumno"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Borrar */}
                          <button
                            type="button"
                            onClick={() => setStudentToDelete(student)}
                            title="Eliminar registro"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: VER FICHA COMPLETA DEL ALUMNO */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-neutral-200 text-[#363435]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#363435]" />
                <h3 className="text-base font-bold text-neutral-900">
                  Ficha Oficial del Deportista
                </h3>
              </div>
              <button
                onClick={() => setViewingStudent(null)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Encabezado */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                    Datos del Atleta
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      viewingStudent.isActive !== false
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {viewingStudent.isActive !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <h2 className="text-lg font-black text-neutral-900">{viewingStudent.fullName}</h2>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-neutral-600">
                  <span className="px-2 py-0.5 rounded bg-neutral-200 font-bold text-neutral-800">
                    {viewingStudent.category}
                  </span>
                  <span>Rama {viewingStudent.branch}</span>
                  <span>·</span>
                  <span>Sede: <strong>{viewingStudent.campus || 'Central'}</strong></span>
                </div>
              </div>

              {/* Datos de contacto y emergencia */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Nacimiento</span>
                  <span className="font-mono font-bold text-neutral-900 text-xs">
                    {viewingStudent.birthDate || 'No especificada'}
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">WhatsApp</span>
                  <span className="font-mono font-bold text-neutral-900 text-xs">
                    {viewingStudent.whatsapp || viewingStudent.tutorPhone || 'N/A'}
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Tutor Responsable</span>
                  <span className="font-bold text-neutral-900 text-xs truncate block">
                    {viewingStudent.tutorName}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
                  <span className="text-[10px] text-rose-500 uppercase font-semibold block">Contacto Emergencia</span>
                  <span className="font-mono font-bold text-xs">
                    {viewingStudent.emergencyPhone || viewingStudent.tutorPhone || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Información médica y alergias */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-950 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                  <HeartPulse className="w-4 h-4 text-rose-600" />
                  <span>Expediente Médico / Alergias</span>
                </div>
                <div className="text-xs space-y-1">
                  <div>
                    <strong>Alergias: </strong>
                    <span>{viewingStudent.allergies || 'Ninguna alergia reportada'}</span>
                  </div>
                  <div>
                    <strong>Padecimiento Crónico: </strong>
                    <span>{viewingStudent.chronicCondition || 'Ninguno reportado'}</span>
                  </div>
                </div>
              </div>

              {/* Estado administrativo */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-neutral-400 block">Cuota Mensual</span>
                  <span className="font-bold text-sm text-neutral-900">${viewingStudent.monthlyFee} MXN</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block">Saldo Actual</span>
                  <span className={`font-bold text-sm ${viewingStudent.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ${viewingStudent.currentBalance} MXN
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  exportStudentsToPDF([viewingStudent], `Ficha Individual - ${viewingStudent.fullName}`);
                }}
                className="flex-1 py-2.5 bg-[#000000] text-white font-bold rounded-xl text-xs hover:bg-[#363435] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Descargar PDF</span>
              </button>
              <button
                onClick={() => {
                  const s = viewingStudent;
                  setViewingStudent(null);
                  setEditingStudent({ ...s });
                }}
                className="px-4 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl text-xs hover:bg-blue-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
              <button
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2.5 bg-neutral-100 text-neutral-700 font-semibold rounded-xl text-xs hover:bg-neutral-200 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR ALUMNO */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-neutral-200 text-[#363435]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#363435]" />
                <h3 className="text-base font-bold text-neutral-900">
                  Editar Alumno Registrado
                </h3>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedStudent} className="mt-4 space-y-4 text-xs">
              {/* Nombre y Nacimiento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.fullName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={editingStudent.birthDate || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, birthDate: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                  />
                </div>
              </div>

              {/* Categoría, Rama y Sede */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Categoría</label>
                  <select
                    value={editingStudent.category}
                    onChange={(e) => setEditingStudent({ ...editingStudent, category: e.target.value as StudentCategory })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                  >
                    <option value="Sub 23">Sub 23</option>
                    <option value="Juvenil">Juvenil</option>
                    <option value="Infantil">Infantil</option>
                    <option value="Mini">Mini</option>
                    <option value="Sub-13">Sub-13</option>
                    <option value="Sub-15">Sub-15</option>
                    <option value="Sub-18">Sub-18</option>
                    <option value="Libre Femenil">Libre Femenil</option>
                    <option value="Libre Varonil">Libre Varonil</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Rama</label>
                  <select
                    value={editingStudent.branch}
                    onChange={(e) => setEditingStudent({ ...editingStudent, branch: e.target.value as 'Femenil' | 'Varonil' })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                  >
                    <option value="Femenil">Femenil</option>
                    <option value="Varonil">Varonil</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Sede de Entrenamiento</label>
                  <div className="flex gap-1.5">
                    <select
                      value={editingStudent.campus || sedes[0]}
                      onChange={(e) => setEditingStudent({ ...editingStudent, campus: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                    >
                      {sedes.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsAddingSede(!isAddingSede)}
                      title="Agregar nueva sede"
                      className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Agregar Sede rápida si toggle activo */}
              {isAddingSede && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nombre de la nueva sede (ej. Atizapán)..."
                    value={newSedeInput}
                    onChange={(e) => setNewSedeInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewSede}
                    className="px-3 py-1.5 bg-[#363435] text-white font-bold rounded-lg text-xs"
                  >
                    Guardar Sede
                  </button>
                </div>
              )}

              {/* Contactos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={editingStudent.whatsapp || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, whatsapp: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Tutor Responsable</label>
                  <input
                    type="text"
                    value={editingStudent.tutorName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, tutorName: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Teléfono Emergencia</label>
                  <input
                    type="text"
                    value={editingStudent.emergencyPhone || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, emergencyPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                  />
                </div>
              </div>

              {/* Alergias y Padecimientos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Alergias</label>
                  <input
                    type="text"
                    value={editingStudent.allergies || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, allergies: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                    placeholder="Ninguna o especificar..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Enfermedad / Padecimiento Crónico</label>
                  <input
                    type="text"
                    value={editingStudent.chronicCondition || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, chronicCondition: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#363435] text-neutral-900"
                    placeholder="Ninguna o especificar..."
                  />
                </div>
              </div>

              {/* Cuota, Saldo y Estado Activo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Cuota Mensual ($ MXN)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={editingStudent.monthlyFee ?? ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setEditingStudent({ ...editingStudent, monthlyFee: parseFloat(val) || 0 });
                    }}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-neutral-900 font-mono no-spinner"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Saldo Actual ($ MXN)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={editingStudent.currentBalance ?? ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setEditingStudent({ ...editingStudent, currentBalance: parseFloat(val) || 0 });
                    }}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-neutral-900 font-mono no-spinner"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Estado en Padrón</label>
                  <select
                    value={editingStudent.isActive !== false ? 'active' : 'inactive'}
                    onChange={(e) => setEditingStudent({ ...editingStudent, isActive: e.target.value === 'active' })}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-neutral-900 font-bold"
                  >
                    <option value="active">Activo en Club</option>
                    <option value="inactive">Desactivado / Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#000000] hover:bg-[#363435] text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRMACIÓN DE BORRADO INDIVIDUAL */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-[#363435] space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-neutral-900">¿Eliminar Alumno?</h3>
                <p className="text-xs text-neutral-500">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-200">
              Estás a punto de eliminar a <strong>{studentToDelete.fullName}</strong> ({studentToDelete.category} - {studentToDelete.branch}). El registro será borrado permanentemente del padrón local y de Supabase.
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Eliminar Registro</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRMACIÓN DE BORRADO MASIVO */}
      {isBulkDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-[#363435] space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-neutral-900">¿Eliminar {selectedIds.length} Alumnos?</h3>
                <p className="text-xs text-neutral-500">Borrado masivo irreversible</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed bg-rose-50/50 p-3 rounded-xl border border-rose-200">
              Se eliminarán de forma permanente los <strong>{selectedIds.length}</strong> alumnos seleccionados tanto en el almacenamiento local como en la base de datos de Supabase.
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleting(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Borrado Masivo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
