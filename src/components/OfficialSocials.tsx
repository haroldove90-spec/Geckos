import React from 'react';
import {
  Share2,
  ExternalLink,
  Phone,
  MapPin,
  Calendar,
  MessageCircle,
  Instagram,
  Facebook,
  Video,
} from 'lucide-react';

export const OfficialSocials: React.FC = () => {
  const socials = [
    {
      name: 'Instagram Oficial',
      handle: '@geckosvoleibol',
      url: 'https://www.instagram.com',
      color: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white',
      desc: 'Historias, mejores jugadas de torneos y avisos fotográficos.',
      icon: Instagram,
    },
    {
      name: 'Facebook Fanpage',
      handle: 'Geckos Voleibol Club',
      url: 'https://www.facebook.com',
      color: 'bg-blue-600 text-white',
      desc: 'Convocatorias, roles de juego, ligas y transmisiones en vivo.',
      icon: Facebook,
    },
    {
      name: 'TikTok Oficial',
      handle: '@geckosvoleibol',
      url: 'https://www.tiktok.com',
      color: 'bg-neutral-900 text-white',
      desc: 'Tutoriales, ejercicios técnicos, saques, remates y dinámicas.',
      icon: Video,
    },
    {
      name: 'WhatsApp Soporte / Cancha',
      handle: '+52 55 1234 5678',
      url: 'https://wa.me/525512345678?text=Hola%20Geckop%C2%B4s%20Voleibol,%20solicito%20informaci%C3%B3n.',
      color: 'bg-emerald-600 text-white',
      desc: 'Atención personalizada para padres de familia y justificaciones.',
      icon: MessageCircle,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-neutral-200">
        <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
          Enlaces Institucionales & Redes Oficiales
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
          Conéctate a las plataformas oficiales y canales de comunicación de Geckos Voleibol.
        </p>
      </div>

      {/* Social Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {socials.map((soc) => {
          const Icon = soc.icon;
          return (
            <a
              key={soc.name}
              href={soc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs hover:shadow-md hover:border-neutral-400 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl ${soc.color} shadow-xs`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition" />
                </div>

                <div>
                  <h3 className="font-bold text-neutral-900 text-sm group-hover:text-black">
                    {soc.name}
                  </h3>
                  <span className="font-mono text-xs text-neutral-500 block mt-0.5">
                    {soc.handle}
                  </span>
                  <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                    {soc.desc}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 text-xs font-semibold text-[#363435] flex items-center justify-between">
                <span>Abrir canal oficial</span>
                <span>→</span>
              </div>
            </a>
          );
        })}
      </div>

      {/* Info Card de Canchas & Horarios */}
      <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4 text-xs">
        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-500" />
          <span>Sede de Entrenamiento & Entrenador en Jefe</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-neutral-600">
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
            <span className="font-bold text-neutral-900 block mb-1">Cancha Principal</span>
            <p>Gimnasio Polideportivo Central, Cancha Techada #2 y #3.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
            <span className="font-bold text-neutral-900 block mb-1">Horarios de Sesión</span>
            <p>Lunes a Jueves: 16:30 a 20:00 hrs. Sábados: Jornada de Liga.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
            <span className="font-bold text-neutral-900 block mb-1">Cotejo de Pagos</span>
            <p>Lunes y Miércoles de 17:00 a 19:00 hrs directamente en mesa técnica.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
