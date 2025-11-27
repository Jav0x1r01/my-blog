import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor - token qo'shish
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - token xatolari bilan ishlash
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/register', userData),
  login: (userData) => api.post('/login', userData),
};

export const blogAPI = {
  getAll: () => api.get('/blogs'),
  getById: (id) => api.get(`/blogs/${id}`),
  getMyBlogs: () => api.get('/my-blogs'),
  create: (blogData) => api.post('/blogs', blogData),
  update: (id, blogData) => api.put(`/blogs/${id}`, blogData),
  delete: (id) => api.delete(`/blogs/${id}`),
  move: (id, folderId) => api.put(`/blogs/${id}/move`, { folder_id: folderId }),
  getRootBlogs: () => api.get('/root-blogs'),
  getFolderBlogs: (folderId) => api.get(`/folders/${folderId}/blogs`),
};

export const folderAPI = {
  getAll: () => api.get('/folders'),
  create: (folderData) => api.post('/folders', folderData),
  update: (id, folderData) => api.put(`/folders/${id}`, folderData), // ✅ YANGI: papka nomini o'zgartirish
  delete: (id) => api.delete(`/folders/${id}`),
  getContents: (folderId) => api.get(`/folders/${folderId}/contents`),
};

export const contentAPI = {
  getRootContents: () => api.get('/root-contents'),
  getFolderContents: (folderId) => api.get(`/folders/${folderId}/contents`),
};

export default api;