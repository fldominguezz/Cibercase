// src/api.js

const API_BASE_URL = 'https://10.1.9.244/api/v1';

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

    if (response.status === 401) {
        // Session expired, clear token, set message, and redirect to login
        localStorage.removeItem('token');
        localStorage.setItem('sessionExpiredMessage', 'Su sesión ha expirado o se ha iniciado en otro dispositivo.');
        window.location.href = '/login'; // Redirect to your login page
        throw new Error('Session has expired. Please log in again.');
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

// New reporting functions
export const fetchTotalTicketsCount = async () => {
    return apiFetch('/reports/total_tickets_count');
};

export const fetchMyAssignedTicketsCount = async () => {
    return apiFetch('/reports/my_assigned_tickets_count');
};

export const fetchTicketCountsByStatus = async () => {
    return apiFetch('/reports/ticket_counts_by_status');
};

export const fetchTicketCountsBySeverity = async () => {
    return apiFetch('/reports/ticket_counts_by_severity');
};

export const fetchTicketCountsByCategory = async () => {
    return apiFetch('/reports/ticket_counts_by_category');
};

export const fetchWeeklyTicketEvolution = async () => {
    return apiFetch('/reports/weekly_ticket_evolution');
};

export const fetchMonthlyTicketEvolution = async () => {
    return apiFetch('/reports/monthly_ticket_evolution');
};

export const fetchAvgResolutionTime = async () => {
    return apiFetch('/reports/avg_resolution_time');
};

export const fetchAvgResponseTime = async () => {
    return apiFetch('/reports/avg_response_time');
};

export const fetchTopRecurring = async () => {
    return apiFetch('/reports/top_recurring');
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
