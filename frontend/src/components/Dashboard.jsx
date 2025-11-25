import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { blogAPI } from '../services/api'
import { Plus, BookOpen, LogOut, User, Eye, Calendar, Settings } from 'lucide-react'

function Dashboard() {
  const { user, logout } = useAuth()
  const [myBlogs, setMyBlogs] = useState([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-8 w-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Blog Platform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 flex items-center">
                <User size={16} className="mr-1" />
                {user?.username}
              </span>
              <Link
                to="/settings"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                <Settings size={16} />
                Blog Settings
              </Link>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                <LogOut size={16} />
                Chiqish
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sarlavha */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">Mening Bloglarim</h2>
          <Link
            to="/create"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={20} />
            Yangi Blog
          </Link>
        </div>

        {loading ? (
          <div className="text-white text-center py-12">Yuklanmoqda...</div>
        ) : myBlogs.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {myBlogs.map((blog) => (
              <Link
                key={blog.id}
                to={`/blog/${blog.id}`}
                className="bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition p-6 block group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition">
                      {blog.title}
                    </h3>
                    <div className="flex items-center gap-4 text-gray-400 mb-4">
                      <div className="flex items-center gap-2">
                        <User size={16} />
                        <span>{blog.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="text-gray-300 line-clamp-2">
                      {blog.cells.find(cell => cell.type === 'text')?.content?.substring(0, 200) || 
                       'Blog matni...'}
                    </p>
                  </div>
                  <div className="ml-6 flex items-center">
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
                      <Eye size={18} />
                      O'qish
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-16 bg-gray-800/50 rounded-xl border border-gray-700">
            <BookOpen size={80} className="mx-auto mb-6 opacity-50" />
            <p className="text-2xl mb-3">Siz hali hech qanday blog yaratmagansiz</p>
            <p className="text-lg mb-8">Birinchi bloggingizni yaratish uchun quyidagi tugmani bosing</p>
            <Link
              to="/create"
              className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-xl font-semibold"
            >
              <Plus size={24} className="inline mr-3" />
              Birinchi Blog Yaratish
            </Link>
          </div>
        )}

        {/* Pastki qismda yangi blog qo'shish tugmasi */}
        {myBlogs.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              to="/create"
              className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition"
            >
              <Plus size={20} className="inline mr-2" />
              Yangi Blog Yaratish
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard