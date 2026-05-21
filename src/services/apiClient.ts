import { authService } from './authServices';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1';

// --- REFERSH LOCKING VARIABLES ---
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function request(endpoint: string, options: any = {}) {
    // List of endpoints that don't require authentication
    const publicEndpoints = ['/auth/', '/payments/auth', '/payments/callback'];
    const isPublicEndpoint = publicEndpoints.some(publicPath => endpoint.includes(publicPath));

    // 1. Validate and refresh token proactively (skip for public endpoints)
    if (!isPublicEndpoint) {
        const isTokenValid = await authService.validateAndRefreshToken();
        if (!isTokenValid) {
            console.error('No valid token available for endpoint:', endpoint);
            authService.logout();
            window.dispatchEvent(new Event('auth-logout'));
            throw new Error('Authentication required');
        }
    }

    // 2. Prepare Headers
    const token = authService.getAccessToken();
    const sessionId = authService.getSessionId();

    // console.log('Making request to:', endpoint, {
    //     hasToken: !!token,
    //     hasSessionId: !!sessionId,
    //     tokenLength: token?.length || 0,
    //     isPublicEndpoint
    // });

    const headers = {
        'Content-Type': 'application/json',
        // Only add auth headers for non-public endpoints
        ...(!isPublicEndpoint && token && { 'Authorization': `Bearer ${token}` }),
        ...(!isPublicEndpoint && sessionId && { 'x-session-id': sessionId }),
        ...options.headers,
    };

    // 3. Make Initial Request
    let response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    
    // console.log('Response status:', response.status, 'for endpoint:', endpoint);
    
    // We need to parse the JSON, but only if there is a body
    let data;
    try {
        data = await response.json();
    } catch (e) {
        data = null;
    }

    // 4. Handle Token Expiration (401) - Fallback if proactive refresh failed (skip for public endpoints)
    if (response.status === 401 && !options._retry && !isPublicEndpoint) {
        console.warn(`Access token expired for ${endpoint}, handling refresh...`);

        // IF NOT ALREADY REFRESHING: Start the refresh process
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = authService.refreshToken().finally(() => {
                isRefreshing = false;
                refreshPromise = null;
            });
        }

        // EVERY parallel 401 request waits for this SAME promise
        const newToken = await refreshPromise;

        if (newToken) {
            console.log(`Token refreshed successfully. Retrying ${endpoint}`);
            // Retry the original request with the new token
            const retryOptions = {
                ...options,
                _retry: true, // Crucial: prevents infinite loops if refresh actually fails
                headers: {
                    ...headers,
                    'Authorization': `Bearer ${newToken}`
                }
            };
            
            const retryResponse = await fetch(`${BASE_URL}${endpoint}`, retryOptions);
            return await retryResponse.json();
        } else {
            // REFRESH FAILED: Clean up and boot user to login
            console.error("Refresh token invalid. Logging out.");
            authService.logout();
            window.dispatchEvent(new Event('auth-logout')); 
            throw new Error("Session expired");
        }
    }

    // 5. Final Response Handling
    if (!response.ok) {
        console.error('Request failed:', {
            endpoint,
            status: response.status,
            data
        });
        throw data;
    }

    
    return data;
}

export const api = {
    get: (url: string, options?: any) => request(url, { ...options, method: 'GET' }),
    post: (url: string, body: any, options?: any) => request(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
    put: (url: string, body: any, options?: any) => request(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    patch: (url: string, body: any, options?: any) => request(url, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    delete: (url: string, options?: any) => request(url, { ...options, method: 'DELETE' }),
};