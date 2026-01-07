// src/api.js

const API_BASE_URL = 'https://10.1.9.245/api/v1';

export const apiFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        ...options.headers,
    };

    // Don't set Content-Type for FormData or URLSearchParams, browser does it with boundary
    if (!(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Specific handling for 401 Unauthorized
    if (response.status === 401) {
        if (endpoint === '/auth/login') {
            // If it's a login attempt, try to get specific error message
            const errorData = await response.json().catch(() => ({ detail: 'Credenciales inválidas.' }));
            throw new Error(errorData.detail || 'Credenciales inválidas.');
        } else {
            // For other endpoints, it means session expired
            localStorage.removeItem('token');
            localStorage.setItem('sessionExpiredMessage', 'Su sesión ha expirado o se ha iniciado en otro dispositivo.');
            window.location.href = '/login'; // Redirect to your login page
            throw new Error('Session has expired. Please log in again.');
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Error desconocido en la API' }));
        throw new Error(errorData.detail || `Error ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
};

export const registerUser = async (userData) => {
    return apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};

export const loginUser = async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    // Use the generic apiFetch helper
    const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: formData,
    });

    if (data.access_token) {
        localStorage.setItem('token', data.access_token);
    }
    return data;
};

export const getNotifications = async () => {
    return apiFetch('/notifications/me');
};

export const getUnreadNotificationsCount = async () => {
    return apiFetch('/notifications/me/unread_count');
};

export const markNotificationAsRead = async (notificationId) => {
    return apiFetch(`/notifications/${notificationId}/read`, {
        method: 'PUT',
    });
};

export const readTickets = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) {
        params.append('status', filters.status);
    }
    if (filters.assignedToMe) { // Use assignedToMe for consistency with frontend logic
        params.append('assigned_to_me', 'true');
    }
    if (filters.skip) {
        params.append('skip', filters.skip);
    }
    if (filters.limit) {
        params.append('limit', filters.limit);
    }
    if (filters.severity) {
        params.append('severity', filters.severity);
    }
    if (filters.category) {
        params.append('category', filters.category);
    }
    if (filters.createdByMe) {
        params.append('created_by_me', 'true');
    }
    if (filters.search) { // Add search filter
        params.append('search', filters.search);
    }
    if (filters.start_date) {
        params.append('start_date', filters.start_date);
    }
    if (filters.end_date) {
        params.append('end_date', filters.end_date);
    }
    if (filters.sort_by) { // Add sort_by filter
        params.append('sort_by', filters.sort_by);
    }
    if (filters.sort_order) { // Add sort_order filter
        params.append('sort_order', filters.sort_order);
    }

    const queryString = params.toString();
    return apiFetch(`/tickets/${queryString ? `?${queryString}` : ''}`);
};

export const readFormTemplates = async () => {
    return apiFetch('/forms/templates/');
};

export const readFormSubmissions = async () => {
    return apiFetch('/forms/submissions/');
};

// New consolidated dashboard stats function
export const fetchDashboardStats = async () => {
    return apiFetch('/dashboard/stats');
};

export const getTicketComments = async (ticketId) => {
    return apiFetch(`/tickets/${ticketId}/comments`);
};

export const createTicketComment = async (ticketId, commentContent) => {
    return apiFetch(`/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentContent }),
    });
};

export const getSessionExpiration = async () => {
    return apiFetch('/auth/session-expires');
};

export const remediateTicket = async (ticketId) => {
    return apiFetch(`/tickets/${ticketId}/remediate`, {
        method: 'PUT',
    });
};

// RBAC API Functions
export const getAllRoles = async () => {
    return apiFetch('/admin/roles');
};

export const getAllPermissions = async () => {
    return apiFetch('/admin/permissions');
};

export const createRole = async (roleData) => {
    return apiFetch('/admin/roles', {
        method: 'POST',
        body: JSON.stringify(roleData),
    });
};

export const updateRole = async (roleId, roleData) => {
    return apiFetch(`/admin/roles/${roleId}`, {
        method: 'PUT',
        body: JSON.stringify(roleData),
    });
};

export const deleteRole = async (roleId) => {
    return apiFetch(`/admin/roles/${roleId}`, {
        method: 'DELETE',
    });
};

export const getFortiSIEMStatus = async () => {
    return apiFetch('/admin/fortisiem-status');
};
