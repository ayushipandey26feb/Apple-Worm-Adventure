
const API_URL = import.meta.env.VITE_API_URL;

export const apiRequest = async (endpoint, options = {}) => {
    if (!API_URL) {
        throw new Error('API URL is not configured. Check your .env file.');
    }

    const token = localStorage.getItem('token');

    // Add /api prefix only when it is missing
    const apiEndpoint = endpoint.startsWith('/api/')
        ? endpoint
        : `/api${endpoint}`;

    const response = await fetch(`${API_URL.replace(/\/$/, '')}${apiEndpoint}`, {
        ...options,
        body: options.body && typeof options.body === 'object'
            ? JSON.stringify(options.body)
            : options.body,
        headers: {
            'Content-Type': 'application/json',
            ...(token && {
                Authorization: `Bearer ${token}`
            }),
            ...options.headers
        }
    });

    const responseText = await response.text();

    let data = {};

    try {
        data = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
        console.error('RAW SERVER RESPONSE:', responseText);
        throw new Error('Invalid response received from server.');
    }

    console.log('API RESPONSE:', apiEndpoint, response.status, data);

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
};
