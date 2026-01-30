import axios from 'axios';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor for adding auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2PasswordRequestForm expects 'username' field, we pass email
    formData.append('password', password);
    const response = await api.post('/auth/login', formData);
    return response.data;
  },
  signup: async (email, password) => {
    const response = await api.post('/auth/signup', { email, password });
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
  },
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, new_password: newPassword });
    return response.data;
  }
};

export const profileService = {
  getProfile: async () => {
    try {
      const response = await api.get('/profile/');
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) return null;
      throw error;
    }
  },
  updateProfile: async (data) => {
    const response = await api.post('/profile/', data);
    return response.data;
  },
  createProfile: async (data) => {
    const response = await api.post('/profile/', data);
    return response.data;
  }
};

export const queryService = {
  sendMultimodalQuery: async (text, audioBlob, imageFile, reportFile) => {
    const formData = new FormData();
    if (text) formData.append('text_query', text);
    if (audioBlob) formData.append('audio_file', audioBlob, 'voice.wav');
    if (imageFile) formData.append('image_file', imageFile);
    if (reportFile) formData.append('report_file', reportFile);

    const response = await api.post('/query/multimodal', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

export const dashboardService = {
  getHistory: async () => {
    const response = await api.get('/dashboard/history');
    return response.data;
  },
  clearHistory: async () => {
    const response = await api.delete('/dashboard/history');
    return response.data;
  },
  getReportPdf: async (email) => {
    const response = await api.get(`/report/user/${email}`, {
      responseType: 'blob',
    });
    return response.data;
  }
};

export const feedbackService = {
  submitFeedback: async (helpful, details = {}) => {
    const response = await api.post('/feedback/', {
      helpful,
      ...details
    });
    return response.data;
  }
};

export const securityService = {
  initiateChangePassword: async () => {
    const response = await api.post('/security/change-password/init');
    return response.data;
  },
  verifyOtp: async (otp) => {
    const response = await api.post('/security/change-password/verify', { otp });
    return response.data;
  },
  completeChangePassword: async (newPassword) => {
    const response = await api.post('/security/change-password/complete', { new_password: newPassword });
    return response.data;
  }
};

export const ownerService = {
  getHealthMetrics: async () => {
    const response = await api.get('/owner/health-metrics');
    return response.data;
  },
  getSatisfactionMetrics: async () => {
    const response = await api.get('/owner/satisfaction-metrics');
    return response.data;
  },
  getModelMetrics: async () => {
    const response = await api.get('/owner/model-metrics');
    return response.data;
  },
  getSecurityMetrics: async () => {
    const response = await api.get('/owner/security-metrics');
    return response.data;
  },
  getHitlMetrics: async () => {
    const response = await api.get('/owner/hitl-metrics');
    return response.data;
  },
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/owner/audit-logs', { params });
    return response.data;
  },
  getToggles: async () => {
    const response = await api.get('/owner/toggles');
    return response.data;
  },
  updateToggle: async (key, value) => {
    const response = await api.post(`/owner/toggles?key=${key}&value=${value}`);
    return response.data;
  }
};

export default api;
