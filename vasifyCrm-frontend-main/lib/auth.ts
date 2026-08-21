

'use client';



export const getToken = (): string => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
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
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
};

export const checkAuthOrRedirect = (router?: { push: (path: string) => void }): boolean => {
    if (isTokenExpired()) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
        }
        router?.push('/login');
        return false;
    }
    return true;
};