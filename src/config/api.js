// Environment-aware API configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// Determine base URL based on environment
const getBaseURL = () => {
  if (isDevelopment) {
    return 'https://rescare-lk82.onrender.com/';
  } else {
    // In production, use relative path (same domain)
    return window.location.origin;
  }
};

export const API_CONFIG = {
  baseURL: getBaseURL(),
  timeout: 10000,
  withCredentials: false
};

// Socket.IO configuration
export const SOCKET_CONFIG = {
  url: getBaseURL(),
  options: {
    transports: ['websocket', 'polling']
  }
};

// Export environment info
export const isDev = isDevelopment;
export const isProd = !isDevelopment;
