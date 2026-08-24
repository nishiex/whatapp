'use client';

export const getToken = (): string => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
};

/** Authorization-only header — for GET requests */
export const authHeader = (): Record<string, string> => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Full JSON + auth headers — for POST/PUT/PATCH requests */
export const jsonAuthHeader = (): Record<string, string> => {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const isTokenExpired = (): boolean => {
    const token = getToken();
    if (!token) return true;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
        const jsonPayload = decodeURIComponent(
            atob(padded)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        const payload = JSON.parse(jsonPayload);
        if (!payload.exp) return false;
        return (payload.exp * 1000) < Date.now();
    } catch (e) {
        console.warn("isTokenExpired decode error, keeping token:", e);
        return false;
    }
};

export const checkAuthOrRedirect = (router?: { push: (path: string) => void }): boolean => {
    if (isTokenExpired()) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('token');
        }
        router?.push('/login');
        return false;
    }
    return true;
};