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
