import React, { useState, useRef } from 'react';
import { Comunicado, ComunicadoTargetType, Student, SystemUser } from '../../types';
import {
  Megaphone,
  Plus,
  FileText,
  Upload,
  Eye,
  Download,
  Trash2,
  Users,
  UserCheck,
  User,
  Globe,
  Share2,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { supabaseService } from '../../utils/supabaseClient';

interface Props {
  comunicados: Comunicado[];
  onComunicadosUpdated: (updated: Comunicado[]) => void;
  students: Student[];
  coaches: SystemUser[];
  currentUser?: SystemUser | null;
  currentStudent?: Student | null;
  isAdmin?: boolean;
}

export const AnnouncementsModule: React.FC<Props> = ({
  comunicados,
  onComunicadosUpdated,
  students,
  coaches,
  currentUser,
  currentStudent,
  isAdmin = true,
}) => {
  // Modal de creación
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<ComunicadoTargetType>('all');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [pdfData, setPdfData] = useState<{ url: string; name: string; size: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Visor de PDF modal
  const [viewingPdf, setViewingPdf] = useState<{ url: string; name: string } | null>(null);

  // Modal de confirmación para eliminar
  const [comunicadoToDelete, setComunicadoToDelete] = useState<Comunicado | null>(null);

  // Filtros de búsqueda en la lista
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAudience, setFilterAudience] = useState<'all' | 'students' | 'coaches'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Procesar archivo PDF
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('El archivo seleccionado debe ser en formato PDF (.pdf).');
      return;
    }

    // Límite de seguridad de 8MB para base64
    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('El archivo PDF excede el límite de 8MB. Elige un documento más ligero.');
      return;
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      setPdfData({
        url: reader.result as string,
        name: file.name,
        size: sizeFormatted,
      });
      setErrorMessage(null);
    };
    reader.onerror = () => {
      setErrorMessage('No se pudo leer el archivo PDF seleccionado.');
    };
    reader.readAsDataURL(file);
  };

  // Guardar nuevo comunicado
  const handleCreateComunicado = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || !content.trim()) {
      setErrorMessage('Por favor ingresa el título y el mensaje del comunicado.');
      return;
    }

    let targetId: string | undefined = undefined;
    let targetName: string | undefined = undefined;

    if (targetType === 'student') {
      if (!selectedStudentId) {
        setErrorMessage('Por favor selecciona el alumno destinatario.');
        return;
      }
      const st = students.find((s) => s.id === selectedStudentId);
      targetId = selectedStudentId;
      targetName = st?.fullName || 'Alumno';
    } else if (targetType === 'coach') {
      if (!selectedCoachId) {
        setErrorMessage('Por favor selecciona el entrenador destinatario.');
        return;
      }
      const c = coaches.find((coach) => coach.id === selectedCoachId);
      targetId = selectedCoachId;
      targetName = c?.name || 'Entrenador';
    }

    setIsSubmitting(true);

    const newComunicado: Comunicado = {
      id: `com-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      date: new Date().toISOString().split('T')[0],
      targetType,
      targetId,
      targetName,
      pdfUrl: pdfData?.url,
      pdfName: pdfData?.name,
      pdfSize: pdfData?.size,
      authorName: currentUser?.name || 'Head Coach Administrador',
      createdAt: new Date().toISOString(),
    };

    // Actualizar estado local inmediatamente
    const updatedList = [newComunicado, ...comunicados];
    onComunicadosUpdated(updatedList);

    // Sincronizar con Supabase
    try {
      await supabaseService.upsertComunicado(newComunicado);
    } catch (err) {
      console.warn('Error al guardar comunicado en Supabase:', err);
    }

    setIsSubmitting(false);
    setSuccessMessage('¡Comunicado publicado con éxito!');
    setTitle('');
    setContent('');
    setTargetType('all');
    setSelectedStudentId('');
    setSelectedCoachId('');
    setPdfData(null);
    setIsCreateModalOpen(false);

    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Eliminar comunicado
  const handleConfirmDelete = async () => {
    if (!comunicadoToDelete) return;
    const filtered = comunicados.filter((c) => c.id !== comunicadoToDelete.id);
    onComunicadosUpdated(filtered);

    try {
      await supabaseService.deleteComunicado(comunicadoToDelete.id);
    } catch (err) {
      console.warn('Error al eliminar comunicado en Supabase:', err);
    }

    setSuccessMessage('Comunicado eliminado correctamente.');
    setComunicadoToDelete(null);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Compartir comunicado por WhatsApp
  const handleShareWhatsApp = (com: Comunicado) => {
    const audienceLabel =
      com.targetType === 'all'
        ? 'Todos los Miembros del Club'
        : com.targetType === 'all_students'
        ? 'Todos los Alumnos y Padres'
        : com.targetType === 'student'
        ? `Alumno: ${com.targetName || ''}`
        : com.targetType === 'all_coaches'
        ? 'Todos los Entrenadores'
        : `Entrenador: ${com.targetName || ''}`;

    const text = `📢 *COMUNICADO OFICIAL - GECKOS VOLEIBOL*\n\n*${com.title}*\n📅 Fecha: ${com.date}\n👥 Dirigido a: ${audienceLabel}\n\n${com.content}\n\n${
      com.pdfName ? `📄 Documento adjunto: ${com.pdfName}\n` : ''
    }🔗 Consulta y descarga oficial en el portal: https://greckos.vercel.app/`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Filtrado según rol:
  // Si no es admin, mostrar solo los comunicados aplicables al usuario actual
  const audienceFiltered = comunicados.filter((com) => {
    if (isAdmin) {
      if (filterAudience === 'students') {
        return com.targetType === 'all_students' || com.targetType === 'student';
      }
      if (filterAudience === 'coaches') {
        return com.targetType === 'all_coaches' || com.targetType === 'coach';
      }
      return true;
    }

    // Para alumnos/padres
    if (currentStudent) {
      return (
        com.targetType === 'all' ||
        com.targetType === 'all_students' ||
        (com.targetType === 'student' && com.targetId === currentStudent.id)
      );
    }

    // Para entrenadores asistentes
    if (currentUser?.role === 'coach_assistant') {
      return (
        com.targetType === 'all' ||
        com.targetType === 'all_coaches' ||
        (com.targetType === 'coach' && com.targetId === currentUser.id)
      );
    }

    return com.targetType === 'all';
  });

  const finalFiltered = audienceFiltered.filter((com) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      com.title.toLowerCase().includes(q) ||
      com.content.toLowerCase().includes(q) ||
      (com.targetName && com.targetName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-lg sm:text-2xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#363435]" />
            <span>Módulo de Comunicados y Circulares</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            {isAdmin
              ? 'Publica avisos oficiales y circulares en PDF dirigidos a todos los alumnos, a un alumno en específico, a todos los entrenadores o a uno en particular.'
              : 'Circulares, avisos oficiales y reglamentos compartidos por la dirección del club.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setIsCreateModalOpen(true);
              setErrorMessage(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#363435] hover:bg-[#252324] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Comunicado</span>
          </button>
        )}
      </div>

      {/* Alertas de éxito / error */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título, contenido o destinatario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-[#363435]"
          />
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setFilterAudience('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterAudience === 'all'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Todos ({comunicados.length})
            </button>
            <button
              onClick={() => setFilterAudience('students')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterAudience === 'students'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Alumnos
            </button>
            <button
              onClick={() => setFilterAudience('coaches')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterAudience === 'coaches'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Entrenadores
            </button>
          </div>
        )}
      </div>

      {/* Lista de Comunicados */}
      {finalFiltered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-xs text-neutral-400">
          <Megaphone className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
          <p className="font-semibold text-neutral-700">No hay comunicados disponibles</p>
          <p className="mt-1">
            {isAdmin
              ? 'Haz clic en "Nuevo Comunicado" para redactar y subir un documento PDF.'
              : 'Aquí aparecerán las circulares y avisos oficiales que te comparta el club.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {finalFiltered.map((com) => {
            const isTargetAll = com.targetType === 'all';
            const isTargetStudents = com.targetType === 'all_students';
            const isTargetSingleStudent = com.targetType === 'student';
            const isTargetCoaches = com.targetType === 'all_coaches';
            const isTargetSingleCoach = com.targetType === 'coach';

            return (
              <div
                key={com.id}
                className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-6 shadow-2xs hover:shadow-xs transition space-y-4"
              >
                {/* Cabecera del comunicado */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Badge de Destinatario */}
                      {isTargetAll && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Globe className="w-3 h-3 text-blue-600" />
                          <span>Público General (Todos)</span>
                        </span>
                      )}
                      {isTargetStudents && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Users className="w-3 h-3 text-emerald-600" />
                          <span>Todos los Alumnos</span>
                        </span>
                      )}
                      {isTargetSingleStudent && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <User className="w-3 h-3 text-purple-600" />
                          <span>Alumno: {com.targetName}</span>
                        </span>
                      )}
                      {isTargetCoaches && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <UserCheck className="w-3 h-3 text-amber-600" />
                          <span>Todos los Entrenadores</span>
                        </span>
                      )}
                      {isTargetSingleCoach && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <UserCheck className="w-3 h-3 text-indigo-600" />
                          <span>Entrenador: {com.targetName}</span>
                        </span>
                      )}

                      <span className="text-neutral-400 text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {com.date}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                      {com.title}
                    </h3>
                  </div>

                  {/* Acciones del Administrador */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleShareWhatsApp(com)}
                      title="Compartir comunicado por WhatsApp"
                      className="p-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] hidden sm:inline">WhatsApp</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => setComunicadoToDelete(com)}
                        title="Eliminar comunicado"
                        className="p-2 rounded-xl border border-neutral-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenido / Mensaje */}
                <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line bg-neutral-50/60 p-3.5 rounded-xl border border-neutral-100">
                  {com.content}
                </p>

                {/* Adjunto PDF (si existe) */}
                {com.pdfUrl && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                          {com.pdfName || 'Documento_Adjunto.pdf'}
                        </div>
                        {com.pdfSize && (
                          <div className="text-[11px] text-neutral-400">PDF • {com.pdfSize}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setViewingPdf({
                            url: com.pdfUrl!,
                            name: com.pdfName || 'Documento.pdf',
                          })
                        }
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-800 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-neutral-600" />
                        <span>Ver PDF</span>
                      </button>

                      <a
                        href={com.pdfUrl}
                        download={com.pdfName || 'comunicado_geckos.pdf'}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#363435] hover:bg-[#252324] text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Crear Comunicado */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 border border-neutral-200 shadow-xl space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-neutral-100 text-[#363435]">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-neutral-900">
                    Redactar y Publicar Comunicado
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Comparte información y documentos PDF con tu academia
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateComunicado} className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Título del Comunicado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Convocatoria a Torneo Estatal Cuautitlán 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435]"
                />
              </div>

              {/* Segmentación / Destinatarios */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  ¿A quién va dirigido el comunicado? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                      targetType === 'all'
                        ? 'border-[#363435] bg-neutral-50 font-bold text-neutral-900'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'all'}
                      onChange={() => setTargetType('all')}
                      className="accent-[#363435]"
                    />
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span>Todos (Alumnos y Entrenadores)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                      targetType === 'all_students'
                        ? 'border-[#363435] bg-neutral-50 font-bold text-neutral-900'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'all_students'}
                      onChange={() => setTargetType('all_students')}
                      className="accent-[#363435]"
                    />
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Todos los Alumnos</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                      targetType === 'student'
                        ? 'border-[#363435] bg-neutral-50 font-bold text-neutral-900'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'student'}
                      onChange={() => setTargetType('student')}
                      className="accent-[#363435]"
                    />
                    <User className="w-4 h-4 text-purple-600" />
                    <span>Un Alumno en Específico</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                      targetType === 'all_coaches'
                        ? 'border-[#363435] bg-neutral-50 font-bold text-neutral-900'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'all_coaches'}
                      onChange={() => setTargetType('all_coaches')}
                      className="accent-[#363435]"
                    />
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span>Todos los Entrenadores</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                      targetType === 'coach'
                        ? 'border-[#363435] bg-neutral-50 font-bold text-neutral-900'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'coach'}
                      onChange={() => setTargetType('coach')}
                      className="accent-[#363435]"
                    />
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Un Entrenador en Específico</span>
                  </label>
                </div>
              </div>

              {/* Selector de Alumno en Específico */}
              {targetType === 'student' && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5 animate-fadeIn">
                  <label className="block text-xs font-bold text-purple-900">
                    Selecciona al Alumno Destinatario *
                  </label>
                  <select
                    required
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-purple-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-purple-600"
                  >
                    <option value="">-- Elige un alumno de la lista ({students.length}) --</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} ({st.category} - {st.campus || 'Sede'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selector de Entrenador en Específico */}
              {targetType === 'coach' && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5 animate-fadeIn">
                  <label className="block text-xs font-bold text-indigo-900">
                    Selecciona al Entrenador Destinatario *
                  </label>
                  <select
                    required
                    value={selectedCoachId}
                    onChange={(e) => setSelectedCoachId(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-indigo-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-600"
                  >
                    <option value="">-- Elige un entrenador ({coaches.length}) --</option>
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (@{c.username} - {c.campus || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mensaje / Descripción */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Mensaje o Contenido del Comunicado *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escribe el texto detallado del comunicado, indicaciones o convocatoria..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#363435]"
                />
              </div>

              {/* Adjuntar Archivo PDF */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Adjuntar Documento PDF (Opcional)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,application/pdf"
                  onChange={handlePdfFileChange}
                  className="hidden"
                />

                {!pdfData ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-neutral-300 hover:border-neutral-400 rounded-2xl p-4 text-center cursor-pointer transition bg-neutral-50 hover:bg-neutral-100 flex flex-col items-center justify-center gap-1.5"
                  >
                    <Upload className="w-6 h-6 text-neutral-400" />
                    <span className="text-xs font-semibold text-neutral-700">
                      Haz clic para seleccionar un archivo PDF
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Formatos compatibles: .pdf (máx. 8 MB)
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                          {pdfData.name}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {pdfData.size} • Listo para adjuntar
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setViewingPdf({ url: pdfData.url, name: pdfData.name })
                        }
                        className="p-1.5 text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg text-xs font-semibold cursor-pointer"
                        title="Previsualizar"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPdfData(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1.5 text-rose-600 hover:text-rose-800 bg-white border border-neutral-200 rounded-lg text-xs font-semibold cursor-pointer"
                        title="Quitar PDF"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#363435] hover:bg-[#252324] text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>{isSubmitting ? 'Publicando...' : 'Publicar Comunicado'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visor de PDF */}
      {viewingPdf && (
        <div className="fixed inset-0 z-50 bg-neutral-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[85vh] flex flex-col border border-neutral-200 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="font-bold text-sm text-neutral-900 truncate">
                  {viewingPdf.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingPdf.url}
                  download={viewingPdf.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#363435] text-white rounded-xl text-xs font-bold hover:bg-[#252324] transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </a>
                <button
                  onClick={() => setViewingPdf(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-neutral-100 p-2">
              <iframe
                src={viewingPdf.url}
                title={viewingPdf.name}
                className="w-full h-full rounded-xl border border-neutral-300"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      {comunicadoToDelete && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-neutral-200 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900">
                  ¿Eliminar este comunicado?
                </h3>
                <p className="text-xs text-neutral-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              Se eliminará: <strong className="text-neutral-900">{comunicadoToDelete.title}</strong>
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setComunicadoToDelete(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
