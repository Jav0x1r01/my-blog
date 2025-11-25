import axios from 'axios'

const API = axios.create({
  baseURL: '/api',
})

// Request interceptor to add auth token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token invalid - clear storage and redirect to login
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (credentials) => API.post('/login', credentials),
  register: (userData) => API.post('/register', userData),
}

export const blogAPI = {
  create: (blogData) => API.post('/blogs', blogData),
  getAll: () => API.get('/blogs'),
  getById: (id) => API.get(`/blogs/${id}`),
  getMyBlogs: () => API.get('/my-blogs'),
  update: (id, blogData) => API.put(`/blogs/${id}`, blogData),
  delete: (id) => API.delete(`/blogs/${id}`),
}



export default API