import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { contentAPI, folderAPI, blogAPI } from '../services/api'
import { Plus, BookOpen, LogOut, User, Eye, Calendar, Settings, Folder, FileText, ArrowLeft } from 'lucide-react'

function Dashboard() {
  const { user, logout } = useAuth()
  const [contents, setContents] = useState({ folders: [], blogs: [] })
  const [currentFolder, setCurrentFolder] = useState(null)
  const [folderStack, setFolderStack] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadContents()
  }, [currentFolder])

  const loadContents = async () => {
    try {
      setLoading(true)
      let response
      if (currentFolder === null) {
        response = await contentAPI.getRootContents()
      } else {
        response = await contentAPI.getFolderContents(currentFolder)
      }
      setContents(response.data)
    } catch (error) {
      console.error('Error loading contents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFolderClick = (folder) => {
    setFolderStack([...folderStack, currentFolder])
    setCurrentFolder(folder.id)
  }

  const handleBackClick = () => {
    if (folderStack.length > 0) {
      const newFolderStack = [...folderStack]
      const previousFolder = newFolderStack.pop()
      setCurrentFolder(previousFolder)
      setFolderStack(newFolderStack)
    } else {
      setCurrentFolder(null)
      setFolderStack([])
    }
  }

  const handleCreateFolder = async () => {
    const folderName = prompt('Yangi papka nomini kiriting:')
    if (!folderName) return

    try {
      await folderAPI.create({
        name: folderName,
        parent_id: currentFolder
      })
      await loadContents()
      alert('Papka muvaffaqiyatli yaratildi!')
    } catch (error) {
      console.error('Error creating folder:', error)
      alert('Papka yaratishda xatolik: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleCreateBlog = () => {
    navigate('/create', { 
      state: { 
        currentFolder: currentFolder 
      } 
    })
  }

  const getCurrentPath = () => {
    if (currentFolder === null) return 'Asosiy Papka'
    return `Papka / ${currentFolder}`
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
              
              {/* Navigation */}
              {currentFolder !== null && (
                <button
                  onClick={handleBackClick}
                  className="text-gray-300 hover:text-white flex items-center gap-2"
                >
                  <ArrowLeft size={20} />
                  Ortga
                </button>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 flex items-center">
                <User size={16} className="mr-1" />
                {user?.username}
              </span>
              <Link
                to="/settings"
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
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
        {/* Sarlavha va Tugmalar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">{getCurrentPath()}</h2>
            <p className="text-gray-400 mt-2">
              {contents.folders.length} ta papka, {contents.blogs.length} ta blog
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreateFolder}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition"
            >
              <Folder size={20} />
              Yangi Papka
            </button>
            <button
              onClick={handleCreateBlog}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition"
            >
              <Plus size={20} />
              Yangi Blog
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-white text-center py-12">Yuklanmoqda...</div>
        ) : contents.folders.length > 0 || contents.blogs.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {/* Papkalar */}
            {contents.folders.map((folder) => (
              <div
                key={`folder-${folder.id}`}
                onClick={() => handleFolderClick(folder)}
                className="bg-gray-800 rounded-xl border border-gray-700 hover:border-yellow-500 transition p-6 cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Folder className="h-12 w-12 text-yellow-400" />
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white group-hover:text-yellow-400 transition mb-2">
                        {folder.name}
                      </h3>
                      <div className="flex items-center gap-4 text-gray-400">
                        <div className="flex items-center gap-2">
                          <User size={16} />
                          <span>{folder.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span>{new Date(folder.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
                      <Folder size={18} />
                      Papka
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Bloglar */}
            {contents.blogs.map((blog) => (
              <Link
                key={`blog-${blog.id}`}
                to={`/blog/${blog.id}`}
                className="bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition p-6 block group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition mb-3">
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
            <p className="text-2xl mb-3">Hozircha hech narsa yo'q</p>
            <p className="text-lg mb-8">Birinchi papka yoki blog yaratish uchun quyidagi tugmalardan foydalaning</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleCreateFolder}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-xl font-semibold"
              >
                <Folder size={24} className="inline mr-3" />
                Birinchi Papka
              </button>
              <button
                onClick={handleCreateBlog}
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-xl font-semibold"
              >
                <Plus size={24} className="inline mr-3" />
                Birinchi Blog
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard