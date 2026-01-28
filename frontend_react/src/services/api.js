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
  login: async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    const response = await api.post('/auth/login', formData);
    return response.data;
  },
  signup: async (username, password) => {
    const response = await api.post('/auth/signup', { username, password });
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
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
  getReportPdf: async (username) => {
    const response = await api.get(`/report/user/${username}`, {
      responseType: 'blob',
    });
    return response.data;
  }
};

export const feedbackService = {
  submitFeedback: async (rating, context) => {
    const response = await api.post('/feedback/', {
      rating,
      context
    });
    return response.data;
  }
};

export default api;
