import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { blogAPI, folderAPI } from '../services/api'
import { ArrowLeft, BookOpen, Eye, Calendar, User, Plus, Folder } from 'lucide-react'

function MyBlogs() {
  const { user } = useAuth()
  const [blogs, setBlogs] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMyData()
  }, [])

  const fetchMyData = async () => {
    try {
      const [blogsResponse, foldersResponse] = await Promise.all([
        blogAPI.getMyBlogs(),
        folderAPI.getAll()
      ])
      setBlogs(blogsResponse.data)
      setFolders(foldersResponse.data)
    } catch (error) {
      console.error('Error fetching my data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFolderName = (folderId) => {
    if (!folderId) return null
    const folder = folders.find(f => f.id === folderId)
    return folder ? folder.name : null
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
              <h1 className="text-2xl font-bold text-white">Mening Blog'larim</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/create-folder"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                <Folder size={16} />
                Yangi Papka
              </Link>
              <Link
                to="/create"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                <Plus size={16} />
                Yangi Blog
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-white text-center">Yuklanmoqda...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => {
              const folderName = getFolderName(blog.folder_id)
              
              return (
                <div
                  key={blog.id}
                  className="bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition p-6"
                >
                  <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
                    {blog.title}
                  </h3>
                  
                  {/* Folder info */}
                  {folderName && (
                    <div className="flex items-center gap-2 text-sm text-blue-400 mb-2">
                      <Folder size={14} />
                      <span>{folderName}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      {blog.author}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(blog.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Link
                      to={`/blog/${blog.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition text-sm"
                    >
                      <Eye size={14} />
                      Ko'rish
                    </Link>
                    <span className="text-gray-400 text-sm">
                      {blog.cells?.length || 0} qism
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && blogs.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl mb-2">Siz hali hech qanday blog yaratmagansiz</p>
            <p className="text-sm mb-6">Birinchi bloggingizni yaratish uchun quyidagi tugmani bosing</p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/create-folder"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg"
              >
                <Folder size={16} className="inline mr-2" />
                Yangi Papka Yaratish
              </Link>
              <Link
                to="/create"
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-lg"
              >
                Yangi Blog Yaratish
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default MyBlogs