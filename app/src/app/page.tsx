'use client';

import { useAuth } from '../lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const SERVICE_CATEGORIES = [
  { slug: "plumbing", name: "Plomería", icon: "🔧", color: "bg-blue-50 text-blue-600" },
  { slug: "electrical", name: "Electricidad", icon: "⚡", color: "bg-yellow-50 text-yellow-600" },
  { slug: "cleaning", name: "Limpieza", icon: "🧹", color: "bg-green-50 text-green-600" },
  { slug: "gardening", name: "Jardinería", icon: "🌿", color: "bg-emerald-50 text-emerald-600" },
  { slug: "painting", name: "Pintura", icon: "🎨", color: "bg-purple-50 text-purple-600" },
  { slug: "locksmith", name: "Cerrajería", icon: "🔑", color: "bg-orange-50 text-orange-600" },
  { slug: "repair", name: "Reparaciones", icon: "🔨", color: "bg-red-50 text-red-600" },
  { slug: "moving", name: "Mudanzas", icon: "📦", color: "bg-indigo-50 text-indigo-600" },
];

const FEATURED_PROVIDERS = [
  { name: "Patricia S.", rating: 4.9, jobs: 80, service: "Limpieza", verified: true },
  { name: "Roberto H.", rating: 4.9, jobs: 71, service: "Electricidad", verified: true },
  { name: "Carlos M.", rating: 4.8, jobs: 52, service: "Plomería", verified: true },
  { name: "Luis E.", rating: 4.7, jobs: 45, service: "Mudanzas", verified: true },
];

export default function HomePage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl mb-4 animate-pulse">
            🔧
          </div>
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  const displayName = user?.name || 'Usuario';
  const firstName = displayName.split(' ')[0];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-5 pt-12 pb-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              Hola, {firstName} 👋
            </h1>
            <p className="text-indigo-100 text-sm">¿Qué necesitas hoy?</p>
          </div>
          <button
            onClick={logout}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg hover:bg-white/30 transition-colors"
            title="Cerrar sesión"
          >
            👤
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="¿Qué servicio necesitas?"
            className="w-full px-4 py-3 pl-10 rounded-xl bg-white/20 backdrop-blur-sm text-white placeholder-indigo-200 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-200">
            🔍
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-5 py-6">
        {/* Service Categories */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            Servicios disponibles
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${cat.color}`}
                >
                  {cat.icon}
                </div>
                <span className="text-xs font-medium text-gray-600 text-center leading-tight">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Featured Providers */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              ⭐ Mejor calificados
            </h2>
            <button className="text-sm text-indigo-500 font-medium">
              Ver todos →
            </button>
          </div>
          <div className="space-y-3">
            {FEATURED_PROVIDERS.map((provider, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Avatar placeholder */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {provider.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-gray-800 truncate">
                      {provider.name}
                    </span>
                    {provider.verified && (
                      <span className="text-xs text-blue-500" title="Verificado">
                        ✅
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {provider.service} · {provider.jobs} trabajos
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-yellow-500 text-sm">⭐</span>
                  <span className="font-semibold text-gray-800">
                    {provider.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="mb-6">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <h3 className="font-bold text-lg mb-1">¿Eres profesional? 🛠️</h3>
            <p className="text-indigo-100 text-sm mb-3">
              Únete a Handy y recibe clientes directo en tu WhatsApp
            </p>
            <button className="px-4 py-2 bg-white text-indigo-600 rounded-xl font-semibold text-sm hover:bg-indigo-50 transition-colors">
              Registrarme como proveedor
            </button>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 px-2 py-2 bg-white border-t border-gray-100 safe-bottom">
        <div className="flex items-center justify-around">
          {[
            { icon: "🏠", label: "Inicio", active: true },
            { icon: "🔍", label: "Buscar", active: false },
            { icon: "📋", label: "Mis Pedidos", active: false },
            { icon: "💬", label: "Chat", active: false },
            { icon: "👤", label: "Perfil", active: false },
          ].map((item) => (
            <button
              key={item.label}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
                item.active
                  ? "text-indigo-600"
                  : "text-gray-400 hover:text-gray-600"
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
