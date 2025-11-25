import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { blogAPI } from '../services/api'
import { ArrowLeft, Edit, Trash2, Calendar, User, X, Check } from 'lucide-react'

function BlogSettings() {
  const { user } = useAuth()
  const [myBlogs, setMyBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [showConfirm, setShowConfirm] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchMyBlogs()
  }, [])

  const fetchMyBlogs = async () => {
    try {
      const response = await blogAPI.getMyBlogs()
      setMyBlogs(response.data)
    } catch (error) {
      console.error('Error fetching blogs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (blogId, blogTitle) => {
    setShowConfirm({ id: blogId, title: blogTitle })
  }

  const cancelDelete = () => {
    setShowConfirm(null)
  }

  const confirmDelete = async () => {
    if (!showConfirm) return

    const blogId = showConfirm.id
    setDeletingId(blogId)
    
    try {
      await blogAPI.delete(blogId)
      // Frontend ro'yxatni yangilash
      const updatedBlogs = myBlogs.filter(blog => blog.id !== blogId)
      setMyBlogs(updatedBlogs)
    } catch (error) {
      console.error('Error deleting blog:', error)
      alert('Blogni o\'chirishda xatolik: ' + (error.response?.data?.detail || error.message))
    } finally {
      setDeletingId(null)
      setShowConfirm(null)
    }
  }

const handleEdit = (blogId) => {
  navigate(`/edit/${blogId}`)
}

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-300 hover:text-white">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-2xl font-bold text-white">Blog Settings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">{user?.username}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Bloglarni Boshqarish</h2>
          <p className="text-gray-400">Bloglaringizni tahrirlash yoki o'chirish</p>
        </div>

        {loading ? (
          <div className="text-white text-center py-12">Yuklanmoqda...</div>
        ) : myBlogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myBlogs.map((blog) => (
              <div
                key={blog.id}
                className="bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 transition p-4"
              >
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                  {blog.title}
                </h3>
                
                <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <User size={12} />
                    <span>{blog.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <p className="text-gray-300 text-sm line-clamp-2 mb-4">
                   {(blog.cells || []).find(cell => cell.type === 'text')?.content?.substring(0, 100) || 
                     'Blog matni...'}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(blog.id)}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded flex items-center gap-2 justify-center text-sm transition"
                  >
                    <Edit size={14} />
                    Tahrirlash
                  </button>
                  <button
                    onClick={() => handleDeleteClick(blog.id, blog.title)}
                    disabled={deletingId === blog.id}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded flex items-center gap-2 justify-center text-sm transition disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {deletingId === blog.id ? '...' : 'O\'chirish'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12 bg-gray-800/50 rounded-xl border border-gray-700">
            <p className="text-xl mb-4">Siz hali hech qanday blog yaratmagansiz</p>
            <Link
              to="/create"
              className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
            >
              Birinchi Blog Yaratish
            </Link>
          </div>
        )}

        {/* Chiroyli Confirmation Dialog */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Blogni O'chirish</h3>
              <p className="text-gray-300 mb-2">
                <span className="font-semibold">"{showConfirm.title}"</span> nomli blogni o'chirishni istaysizmi?
              </p>
              <p className="text-red-400 text-sm mb-6">
                Bu amalni ortga qaytarib bo'lmaydi!
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDelete}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  <X size={16} />
                  Bekor qilish
                </button>
                <button
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  <Check size={16} />
                  O'chirish
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default BlogSettings