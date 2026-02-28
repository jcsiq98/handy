'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const initials = (user.name || user.phone || '?').slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white px-5 pt-14 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors text-sm"
          >
            ←
          </button>
          <h1 className="text-lg font-bold">Mi Perfil</h1>
        </div>

        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="w-20 h-20 rounded-full object-cover border-4 border-white/30 shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold border-4 border-white/30 shadow-lg">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-bold truncate">
              {user.name || 'Sin nombre'}
            </h2>
            <p className="text-indigo-200 text-sm">{user.phone}</p>
            {user.email && (
              <p className="text-indigo-200 text-xs truncate mt-0.5">
                {user.email}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 -mt-4">
        {/* Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <div className="divide-y divide-gray-100">
            <InfoRow icon="📱" label="Teléfono" value={user.phone} />
            <InfoRow
              icon="👤"
              label="Nombre"
              value={user.name || 'Sin nombre'}
            />
            <InfoRow
              icon="📧"
              label="Email"
              value={user.email || 'No configurado'}
            />
            <InfoRow
              icon="🎭"
              label="Tipo de cuenta"
              value={user.role === 'PROVIDER' ? 'Proveedor' : 'Cliente'}
            />
            {user.createdAt && (
              <InfoRow
                icon="📅"
                label="Miembro desde"
                value={new Date(user.createdAt).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                })}
              />
            )}
          </div>
        </div>

        {/* Stats Card (if provider) */}
        {user.providerProfile && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              📊 Estadísticas de Proveedor
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <StatBox
                label="Trabajos"
                value={String(user.providerProfile.totalJobs)}
              />
              <StatBox
                label="Calificación"
                value={
                  user.ratingAverage
                    ? `${user.ratingAverage.toFixed(1)} ⭐`
                    : 'N/A'
                }
              />
              <StatBox
                label="Reseñas"
                value={String(user.ratingCount || 0)}
              />
            </div>
            {user.providerProfile.bio && (
              <p className="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
                &ldquo;{user.providerProfile.bio}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <button
            onClick={() => router.push('/bookings')}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-lg">📋</span>
            <span className="text-sm font-medium text-gray-800 flex-1">
              Mis Solicitudes
            </span>
            <span className="text-gray-400 text-sm">→</span>
          </button>
          <div className="border-t border-gray-100" />
          <button
            onClick={() => router.push('/bookings?status=active')}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-lg">💬</span>
            <span className="text-sm font-medium text-gray-800 flex-1">
              Chats Activos
            </span>
            <span className="text-gray-400 text-sm">→</span>
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 bg-white border border-red-200 text-red-600 rounded-2xl font-semibold text-sm hover:bg-red-50 transition-colors shadow-sm mb-8"
        >
          🚪 Cerrar sesión
        </button>
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 px-2 py-2 bg-white border-t border-gray-100 safe-bottom">
        <div className="flex items-center justify-around">
          {[
            { icon: '🏠', label: 'Inicio', href: '/', active: false },
            { icon: '🔍', label: 'Buscar', href: '/providers', active: false },
            { icon: '📋', label: 'Mis Pedidos', href: '/bookings', active: false },
            { icon: '💬', label: 'Chat', href: '/bookings?status=active', active: false },
            { icon: '👤', label: 'Perfil', href: '/profile', active: true },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
                item.active
                  ? 'text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="text-lg shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-gray-800 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-indigo-50 rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-indigo-700">{value}</p>
      <p className="text-[10px] text-indigo-500 font-medium mt-0.5">{label}</p>
    </div>
  );
}

