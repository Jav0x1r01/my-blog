import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { contentAPI, folderAPI, blogAPI } from '../services/api'
import { ArrowLeft, Edit, Trash2, Calendar, User, X, Check, Folder, Eye, Save, XCircle } from 'lucide-react'

function BlogSettings() {
  const { user } = useAuth()
  const [contents, setContents] = useState({ folders: [], blogs: [] })
  const [currentFolder, setCurrentFolder] = useState(null)
  const [folderStack, setFolderStack] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [showConfirm, setShowConfirm] = useState(null)
  const [deleteType, setDeleteType] = useState(null)
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchContents()
  }, [currentFolder])

  const fetchContents = async () => {
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

  // Papka nomini tahrirlash
  const handleEditFolder = (folder) => {
    setEditingFolderId(folder.id)
    setEditingFolderName(folder.name)
  }

  const handleSaveFolderName = async (folderId) => {
    if (!editingFolderName.trim()) {
      alert('Papka nomi bo\'sh bo\'lmasligi kerak!')
      return
    }

    try {
      await folderAPI.update(folderId, { name: editingFolderName.trim() })
      setContents(prev => ({
        ...prev,
        folders: prev.folders.map(folder => 
          folder.id === folderId 
            ? { ...folder, name: editingFolderName.trim() }
            : folder
        )
      }))
      setEditingFolderId(null)
      setEditingFolderName('')
      alert('Papka nomi muvaffaqiyatli o\'zgartirildi!')
    } catch (error) {
      console.error('Error updating folder:', error)
      alert('Papka nomini o\'zgartirishda xatolik: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleCancelEdit = () => {
    setEditingFolderId(null)
    setEditingFolderName('')
  }

  const handleDeleteFolder = (folderId, folderName) => {
    setDeleteType('folder')
    setShowConfirm({ id: folderId, title: folderName, type: 'folder' })
  }

  const handleDeleteBlog = (blogId, blogTitle) => {
    setDeleteType('blog')
    setShowConfirm({ id: blogId, title: blogTitle, type: 'blog' })
  }

  const cancelDelete = () => {
    setShowConfirm(null)
    setDeleteType(null)
  }

  const confirmDelete = async () => {
    if (!showConfirm) return

    const itemId = showConfirm.id
    setDeletingId(itemId)
    
    try {
      if (showConfirm.type === 'blog') {
        await blogAPI.delete(itemId)
        setContents(prev => ({
          ...prev,
          blogs: prev.blogs.filter(blog => blog.id !== itemId)
        }))
      } else if (showConfirm.type === 'folder') {
        await folderAPI.delete(itemId)
        setContents(prev => ({
          ...prev,
          folders: prev.folders.filter(folder => folder.id !== itemId)
        }))
      }
    } catch (error) {
      console.error('Error deleting:', error)
      alert('O\'chirishda xatolik: ' + (error.response?.data?.detail || error.message))
    } finally {
      setDeletingId(null)
      setShowConfirm(null)
      setDeleteType(null)
    }
  }

  const handleEditBlog = (blogId) => {
    navigate(`/edit/${blogId}`)
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
              <Link to="/" className="text-gray-300 hover:text-white">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-2xl font-bold text-white">Blog Settings</h1>
              
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
              <span className="text-gray-300">{user?.username}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sarlavha va yo'l */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">{getCurrentPath()}</h2>
          <p className="text-gray-400">
            {contents.folders.length} ta papka, {contents.blogs.length} ta blog
          </p>
        </div>

        {loading ? (
          <div className="text-white text-center py-12">Yuklanmoqda...</div>
        ) : contents.folders.length > 0 || contents.blogs.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {/* PAPKALAR */}
            {contents.folders.map((folder) => (
              <div
                key={`folder-${folder.id}`}
                className="bg-gray-800 rounded-xl border border-gray-700 hover:border-yellow-500 transition p-6 group"
              >
                <div className="flex items-start justify-between">
                  <div 
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                    onClick={() => !editingFolderId && handleFolderClick(folder)}
                  >
                    <Folder className="h-12 w-12 text-yellow-400" />
                    <div className="flex-1">
                      {editingFolderId === folder.id ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            className="bg-gray-700 text-white text-2xl font-bold px-3 py-2 rounded border border-gray-600 w-full"
                            placeholder="Papka nomi"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <h3 className="text-2xl font-bold text-white group-hover:text-yellow-400 transition mb-2">
                          {folder.name}
                        </h3>
                      )}
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
                  
                  {/* Papka uchun tugmalar */}
                  <div className="flex items-center gap-2">
                    {editingFolderId === folder.id ? (
                      <>
                        <button
                          onClick={() => handleSaveFolderName(folder.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                        >
                          <Save size={18} />
                          Saqlash
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                        >
                          <XCircle size={18} />
                          Bekor
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleFolderClick(folder)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                        >
                          <Folder size={18} />
                          Ochish
                        </button>
                        <button
                          onClick={() => handleEditFolder(folder)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                        >
                          <Edit size={18} />
                          Tahrirlash
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(folder.id, folder.name)}
                          disabled={deletingId === folder.id}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                          {deletingId === folder.id ? '...' : 'O\'chirish'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* BLOGLAR */}
            {contents.blogs.map((blog) => (
              <div
                key={`blog-${blog.id}`}
                className="bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition p-6 group"
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
                      {blog.cells?.find(cell => cell.type === 'text')?.content?.substring(0, 200) || 
                       'Blog matni...'}
                    </p>
                  </div>
                  
                  {/* Blog uchun tugmalar */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/blog/${blog.id}`)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                    >
                      <Eye size={18} />
                      Ko'rish
                    </button>
                    <button
                      onClick={() => handleEditBlog(blog.id)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                    >
                      <Edit size={18} />
                      Tahrirlash
                    </button>
                    <button
                      onClick={() => handleDeleteBlog(blog.id, blog.title)}
                      disabled={deletingId === blog.id}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                      {deletingId === blog.id ? '...' : 'O\'chirish'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-16 bg-gray-800/50 rounded-xl border border-gray-700">
            <Folder size={80} className="mx-auto mb-6 opacity-50" />
            <p className="text-2xl mb-3">Hozircha hech narsa yo'q</p>
            <p className="text-lg">Bu papkada blog yoki papka mavjud emas</p>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">
                {showConfirm.type === 'folder' ? 'Papkani' : 'Blogni'} O'chirish
              </h3>
              <p className="text-gray-300 mb-2">
                <span className="font-semibold">"{showConfirm.title}"</span> nomli{' '}
                {showConfirm.type === 'folder' ? 'papkani' : 'blogni'} o'chirishni istaysizmi?
              </p>
              {showConfirm.type === 'folder' && (
                <p className="text-yellow-400 text-sm mb-4">
                  ⚠️ Papka ichidagi barcha bloglar ham o'chib ketadi!
                </p>
              )}
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