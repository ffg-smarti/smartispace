# SMARTi Frontend Code Templates (Coder)

Konkrete, implementierungsfertige Code-Templates für das Frontend. **Für Coder** — Architekt-Referenzen
verweisen hierher statt sie zu duplizieren.

**Monorepo:** Zwei Frontends (`apps/kids`, `apps/parent`) teilen sich Shared Packages
(`@smarti/api`, `@smarti/ui`, `@smarti/players`, `@smarti/session`).

**Prinzipien/Patterns** (nicht hier dupliziert):
- Layering → `rules/frontend.md` §Layering-Regel
- Struktur → `shared/workspace.md` (Frontend-Struktur)
- Frontend-Konzept → `.opencode/skills/architect-frontend/references/smarti-frontend-patterns.md`

---

## API Client — initApiMutator() Pattern

> **Regel:** Kein direktes `axios.create()` in Komponenten. Orval generiert Hooks aus dem OpenAPI-Schema.

### Package-Seite (`packages/smarti-api/src/mutator.ts`)

```typescript
// packages/smarti-api/src/mutator.ts
import type { AxiosRequestConfig } from 'axios';

let _mutator: (<T>(config: AxiosRequestConfig) => Promise<T>) | null = null;

export function initApiMutator(mutator: <T>(config: AxiosRequestConfig) => Promise<T>) {
    _mutator = mutator;
}

// Orval ruft diese Funktion in jedem generierten Hook auf
export function apiMutator<T>(config: AxiosRequestConfig): Promise<T> {
    if (!_mutator) throw new Error('apiMutator nicht initialisiert — initApiMutator() in App.tsx aufrufen');
    return _mutator(config);
}
```

### App-Seite (`apps/<app>/src/shared/lib/api-mutator.ts`)

```typescript
// apps/<app>/src/shared/lib/api-mutator.ts — app-spezifisch
import axios, { type AxiosRequestConfig } from 'axios';
import { initApiMutator } from '@smarti/api';

function getCsrfToken(): string {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
}

export const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,           // Session-Cookie mitsenden
    headers: { 'Content-Type': 'application/json' },
});

// CSRF-Token in jeden mutierenden Request
axiosInstance.interceptors.request.use((config) => {
    if (['post', 'put', 'patch', 'delete'].includes(config.method ?? '')) {
        config.headers['X-CSRFToken'] = getCsrfToken();
    }
    return config;
});

// Globale Auth-Fehler behandeln
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Package mit der app-spezifischen Instanz initialisieren
export const apiMutator = <T>(config: AxiosRequestConfig): Promise<T> =>
    axiosInstance(config).then((response) => response.data);

initApiMutator(apiMutator);
```

### Entry Point (`apps/<app>/src/main.tsx`)

```typescript
// apps/<app>/src/main.tsx — Side-Effect-Import muss vor dem ersten Render passieren
import './shared/lib/api-mutator';   // Side-Effect: ruft initApiMutator() auf
import { App } from './App';
// ...
```

> **Regel:** `initApiMutator()` muss in `main.tsx` vor dem ersten Render aufgerufen werden — am einfachsten durch den Side-Effect-Import von `api-mutator.ts`.

---

## TanStack Query — Orval-generierte Hooks

> **Regel:** Hooks werden von Orval aus `operation_id` generiert — niemals manuell schreiben.
> `openapi.json` und `orval.config.ts` liegen einmal in `packages/smarti-api/`.

```typescript
// packages/smarti-api/src/generated/hooks/profiles.ts  (generiert — nicht bearbeiten)
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiMutator } from '../mutator';

export interface ChildResponse { id: string; username: string; }
export interface ErrorResponse {
    errors: Array<{ message: string; code: string | null; field: string | null; }>;
}

export const useGetChild = (childId: string) =>
    useQuery({ queryKey: ['get_child', childId], queryFn: () => apiMutator(...) });

export const useCreateChild = () =>
    useMutation<ChildResponse, ErrorResponse, ChildCreateRequest>({
        mutationFn: (data) => apiMutator(...),
    });
```

### Fehler-Handling

```typescript
import { setFormErrors } from '@/shared/lib/parseApiErrors';
import { useCreateChild } from "@smarti/api";
import { toast } from 'sonner';

const { mutate, isPending } = useCreateChild({
    onError: (error) => {
        setFormErrors(error, setError, (msg) => toast.error(msg));
    },
});
```

---

## QueryClient (`apps/<app>/src/shared/lib/queryClient.ts`)

```typescript
import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,     // 5 Minuten
            retry: (failureCount, error) => {
                if (axios.isAxiosError(error)) {
                    const status = error.response?.status;
                    if (status === 401 || status === 403 || status === 404) {
                        return false;
                    }
                }
                return failureCount < 2;
            },
        },
        mutations: { retry: false },
    },
});
```

---

## App-Einstiegspunkt (`apps/<app>/src/App.tsx`)

> **Regel:** Provider-Reihenfolge: `ErrorBoundary` → `QueryClientProvider` → `BrowserRouter` → `AuthProvider`.

```typescript
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '@/shared/lib/queryClient';
import { AuthProvider } from '@/shared/context/AuthContext';
import { AppRoutes } from './routes';

export default function App() {
    return (
        <ErrorBoundary fallback={<GlobalErrorFallback />}>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <AuthProvider>
                        <AppRoutes />
                    </AuthProvider>
                </BrowserRouter>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}
```

---

## Routing — React Router

```typescript
// apps/<app>/src/routes.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute role="parent" />}>
                <Route path="/parent/dashboard" element={<ParentDashboard />} />
                <Route path="/parent/plans" element={<PlanList />} />
                <Route path="/parent/plans/:planId" element={<PlanDetail />} />
                <Route path="/parent/content" element={<ItemBrowser />} />
            </Route>

            <Route element={<ProtectedRoute role="child" />}>
                <Route path="/child/dashboard" element={<ChildDashboard />} />
                <Route path="/child/session/:sessionId" element={<SessionPlayer />} />
            </Route>

            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}
```

### ProtectedRoute (`apps/<app>/src/shared/components/ProtectedRoute.tsx`)

```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';

interface ProtectedRouteProps { role?: 'parent' | 'child'; }

export function ProtectedRoute({ role }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    if (isLoading) return <PageSkeleton />;
    if (!user) return <Navigate to="/login" replace />;
    if (role && user.role !== role) return <Navigate to="/" replace />;
    return <Outlet />;
}
```

---

## Vite-Proxy

```typescript
// apps/<app>/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 8080,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
    resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
    },
});
```

---

## OpenAPI → TypeScript via Orval

```bash
# Nur im Package — niemals in den Apps:
npm run generate --workspace=@smarti/api
```

```typescript
// packages/smarti-api/orval.config.ts
import { defineConfig } from 'orval';

export default defineConfig({
    smarti: {
        input: { target: './openapi.json' },
        output: {
            mode: 'tags-split',
            target: './src/generated/hooks',
            schemas: './src/generated/schemas',
            client: 'react-query',
            httpClient: 'axios',
            override: {
                mutator: { path: './src/mutator.ts', name: 'apiMutator' },
                query: { useQuery: true, useMutation: true },
            },
        },
    },
});
```

> **Regel:** `generated/` wird niemals manuell bearbeitet.
> **Regel:** `npm run generate` läuft ausschließlich im Package — kein `generate`-Skript in den Apps.
