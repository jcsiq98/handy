'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
  providersApi,
  servicesApi,
  type ProviderSummary,
  type ServiceCategory,
} from '../../lib/api';
import EmptyState from '../../components/ui/empty-state';
import ErrorState from '../../components/ui/error-state';
import { CardListSkeleton } from '../../components/ui/skeleton';

const CATEGORY_COLORS: Record<string, string> = {
  plumbing: 'bg-blue-100 text-blue-700 border-blue-200',
  electrical: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  cleaning: 'bg-green-100 text-green-700 border-green-200',
  gardening: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  painting: 'bg-purple-100 text-purple-700 border-purple-200',
  locksmith: 'bg-orange-100 text-orange-700 border-orange-200',
  repair: 'bg-red-100 text-red-700 border-red-200',
  moving: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

function ProvidersListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const categorySlug = searchParams.get('category') || '';

  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(categorySlug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const categoryNameMap: Record<string, string> = {};
  for (const cat of categories) {
    categoryNameMap[cat.slug] = cat.name;
  }

  const loadCategories = useCallback(async () => {
    try {
      const cats = await servicesApi.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  const loadProviders = useCallback(
    async (category: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await providersApi.list({
          category: category || undefined,
          sort: 'rating',
          limit: 50,
        });
        setProviders(res.data);
        setTotal(res.total);
      } catch (err: unknown) {
        console.error('Failed to load providers:', err);
        setError('No se pudieron cargar los proveedores');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCategories();
    }
  }, [isAuthenticated, loadCategories]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProviders(selectedCategory);
    }
  }, [isAuthenticated, selectedCategory, loadProviders]);

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    // Update URL without full navigation
    const url = slug ? `/providers?category=${slug}` : '/providers';
    window.history.replaceState(null, '', url);
  };

  const handleRefresh = () => {
    loadProviders(selectedCategory);
  };

  if (authLoading || !isAuthenticated) return null;

  const currentCat = categories.find((c) => c.slug === selectedCategory);
  const title = currentCat
    ? `${currentCat.icon} ${currentCat.name}`
    : 'Todos los proveedores';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-12 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.push('/')}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">{title}</h1>
            <p className="text-xs text-gray-500">
              {loading ? 'Buscando...' : `${total} proveedores encontrados`}
            </p>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
          <button
            onClick={() => handleCategoryChange('')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              selectedCategory === ''
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => handleCategoryChange(cat.slug)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === cat.slug
                  ? CATEGORY_COLORS[cat.slug] || 'bg-indigo-100 text-indigo-700 border-indigo-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Provider list */}
      <main className="flex-1 px-4 py-4">
        {loading ? (
          <CardListSkeleton count={6} />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => loadProviders(selectedCategory)}
            onBack={() => router.push('/')}
          />
        ) : providers.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No se encontraron proveedores"
            description="No hay proveedores disponibles en esta categoría por el momento"
            action={{ label: 'Ver todas las categorías', onClick: () => handleCategoryChange('') }}
          />
        ) : (
          <div className="space-y-3 stagger-children">
            {providers.map((provider) => {
              const mainService =
                provider.serviceTypes?.[0]
                  ? categoryNameMap[provider.serviceTypes[0]] || provider.serviceTypes[0]
                  : '';

              return (
                <button
                  key={provider.id}
                  onClick={() => router.push(`/providers/${provider.id}`)}
                  className="w-full flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left active:scale-[0.98]"
                >
                  {/* Avatar */}
                  {provider.avatarUrl ? (
                    <img
                      src={provider.avatarUrl}
                      alt={provider.name || ''}
                      className="w-14 h-14 rounded-full object-cover shrink-0 bg-gray-100"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
                      {(provider.name || '?')[0]}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-semibold text-gray-800 truncate">
                        {provider.name}
                      </span>
                      {provider.isVerified && (
                        <span className="text-xs" title="Verificado">
                          ✅
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-0.5">
                        <span className="text-yellow-500 text-xs">⭐</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {provider.ratingAverage.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({provider.ratingCount})
                        </span>
                      </div>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-500">
                        {provider.totalJobs} trabajos
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2">
                      {provider.bio}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">
                        {mainService}
                      </span>
                      {provider.isAvailable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Disponible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Ocupado
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Pull to refresh hint */}
            <div className="text-center py-4">
              <button
                onClick={handleRefresh}
                className="text-xs text-indigo-500 font-medium"
              >
                ↻ Actualizar lista
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProvidersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl mb-4 animate-pulse">
              🔍
            </div>
            <p className="text-gray-400 text-sm">Cargando proveedores...</p>
          </div>
        </div>
      }
    >
      <ProvidersListContent />
    </Suspense>
  );
}


