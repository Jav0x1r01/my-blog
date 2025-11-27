import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { folderAPI, blogAPI } from '../services/api';
import { Folder, FileText, Plus, Trash2, Move, MoreVertical, Home } from 'lucide-react';

function FolderManager() {
  const { user } = useAuth();
  const [folders, setFolders] = useState([]);
  const [rootBlogs, setRootBlogs] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderBlogs, setFolderBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movingBlog, setMovingBlog] = useState(null);
  const [showCreateBlog, setShowCreateBlog] = useState(false);
  const [newBlogTitle, setNewBlogTitle] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [foldersResponse, rootBlogsResponse] = await Promise.all([
        folderAPI.getAll(),
        blogAPI.getRootBlogs()
      ]);
      setFolders(foldersResponse.data);
      setRootBlogs(rootBlogsResponse.data);
      console.log('Root blogs loaded:', rootBlogsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolderBlogs = async (folderId) => {
    try {
      if (folderId === null) {
        // Asosiy papka
        const response = await blogAPI.getRootBlogs();
        setFolderBlogs(response.data);
        setSelectedFolder(null);
        console.log('Root blogs loaded:', response.data);
      } else {
        // User papkasi
        const response = await blogAPI.getFolderBlogs(folderId);
        setFolderBlogs(response.data);
        setSelectedFolder(folderId);
        console.log('Folder blogs loaded:', response.data);
      }
    } catch (error) {
      console.error('Error loading folder blogs:', error);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!confirm('Papka va uning ichidagi barcha bloglar o\'chiriladi. Davom etasizmi?')) {
      return;
    }

    try {
      await folderAPI.delete(folderId);
      setFolders(folders.filter(f => f.id !== folderId));
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
        setFolderBlogs([]);
      }
      await loadData(); // Root bloglarni yangilash
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Papka o\'chirishda xatolik: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleMoveBlog = async (blogId, targetFolderId) => {
    try {
      await blogAPI.move(blogId, targetFolderId);
      setMovingBlog(null);
      
      // Yangilash
      if (selectedFolder === null) {
        await loadData(); // Root bloglarni yangilash
      } else {
        await loadFolderBlogs(selectedFolder); // Joriy papkani yangilash
      }
      
      alert('Blog muvaffaqiyatli ko\'chirildi!');
    } catch (error) {
      console.error('Error moving blog:', error);
      alert('Blog ko\'chirishda xatolik: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCreateBlogInFolder = async () => {
    if (!newBlogTitle.trim()) {
      alert('Blog sarlavhasini kiriting');
      return;
    }

    try {
      await blogAPI.create({
        title: newBlogTitle.trim(),
        cells: [],
        folder_id: selectedFolder
      });
      
      setNewBlogTitle('');
      setShowCreateBlog(false);
      
      // Yangilash
      if (selectedFolder === null) {
        await loadData(); // Root bloglarni yangilash
      } else {
        await loadFolderBlogs(selectedFolder); // Joriy papkani yangilash
      }
      
      alert('Blog muvaffaqiyatli yaratildi!');
    } catch (error) {
      console.error('Error creating blog:', error);
      alert('Blog yaratishda xatolik: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getCurrentBlogs = () => {
    return selectedFolder === null ? rootBlogs : folderBlogs;
  };

  const getCurrentFolderName = () => {
    if (selectedFolder === null) return 'Asosiy Papka';
    const folder = folders.find(f => f.id === selectedFolder);
    return folder ? folder.name : 'Noma\'lum Papka';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-white">Papkalar va Bloglar</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-300">{user?.username}</span>
              <Link
                to="/create-folder"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                <Plus size={16} />
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Folders Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Papkalar</h2>
              
              {/* Root Blogs */}
              <div 
                className={`p-4 rounded-lg cursor-pointer mb-3 min-h-[80px] flex items-center ${
                  selectedFolder === null ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                onClick={() => loadFolderBlogs(null)}
              >
                <div className="flex items-center gap-4 w-full">
                  <Home className="h-8 w-8 text-blue-400" />
                  <div className="flex-1">
                    <span className="text-white text-lg font-medium">Asosiy Papka</span>
                    <div className="text-gray-300 text-sm">
                      {rootBlogs.length} ta blog
                    </div>
                  </div>
                </div>
              </div>

              {/* User Folders */}
              <div className="space-y-3">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`p-4 rounded-lg cursor-pointer min-h-[80px] flex items-center ${
                      selectedFolder === folder.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    onClick={() => loadFolderBlogs(folder.id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <Folder className="h-8 w-8 text-yellow-400" />
                        <div>
                          <span className="text-white text-lg font-medium">{folder.name}</span>
                          <div className="text-gray-300 text-sm">
                            {new Date(folder.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                          className="text-red-400 hover:text-red-300 p-2"
                          title="O'chirish"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {folders.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Hali papka yaratilmagan</p>
                </div>
              )}
            </div>
          </div>

          {/* Blogs Panel */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                  {getCurrentFolderName()} - Bloglar
                </h2>
                
                {/* Create Blog in Folder Button */}
                <button
                  onClick={() => setShowCreateBlog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  <Plus size={16} />
                  Ushbu Papkada Blog Yaratish
                </button>
              </div>

              {/* Create Blog Modal */}
              {showCreateBlog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full">
                    <h3 className="text-xl font-bold text-white mb-4">Yangi Blog Yaratish</h3>
                    <input
                      type="text"
                      value={newBlogTitle}
                      onChange={(e) => setNewBlogTitle(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
                      placeholder="Blog sarlavhasi..."
                    />
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowCreateBlog(false)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                      >
                        Bekor qilish
                      </button>
                      <button
                        onClick={handleCreateBlogInFolder}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                      >
                        Yaratish
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getCurrentBlogs().map((blog) => (
                  <div
                    key={blog.id}
                    className="bg-gray-700 rounded-xl border border-gray-600 hover:border-blue-500 transition p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <Link
                          to={`/blog/${blog.id}`}
                          className="block"
                        >
                          <h3 className="text-xl font-semibold text-white mb-3 hover:text-blue-400 transition">
                            {blog.title}
                          </h3>
                        </Link>
                        <p className="text-gray-300 text-sm line-clamp-2 mb-4">
                          {blog.cells.find(cell => cell.type === 'text')?.content?.substring(0, 100) || 
                           'Blog matni...'}
                        </p>
                      </div>
                      
                      {/* Move Blog Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setMovingBlog(movingBlog === blog.id ? null : blog.id)}
                          className="text-gray-400 hover:text-white p-2"
                          title="Blogni ko'chirish"
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        {movingBlog === blog.id && (
                          <div className="absolute right-0 top-12 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[200px]">
                            <div className="p-3 border-b border-gray-600">
                              <span className="text-white text-sm font-medium">Blogni ko'chirish:</span>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              <button
                                onClick={() => handleMoveBlog(blog.id, null)}
                                className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 ${
                                  blog.folder_id === null 
                                    ? 'bg-blue-600 text-white' 
                                    : 'text-white hover:bg-gray-700'
                                }`}
                              >
                                <Home size={14} />
                                Asosiy Papka
                              </button>
                              {folders.map((folder) => (
                                <button
                                  key={folder.id}
                                  onClick={() => handleMoveBlog(blog.id, folder.id)}
                                  className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 ${
                                    blog.folder_id === folder.id 
                                      ? 'bg-blue-600 text-white' 
                                      : 'text-white hover:bg-gray-700'
                                  }`}
                                >
                                  <Folder size={14} />
                                  {folder.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                      <span>{blog.cells?.length || 0} qism</span>
                    </div>
                  </div>
                ))}
              </div>

              {getCurrentBlogs().length === 0 && (
                <div className="text-center text-gray-400 py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Bloglar topilmadi</p>
                  <p className="text-sm mb-6">Ushbu papkada hali blog mavjud emas</p>
                  <button
                    onClick={() => setShowCreateBlog(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
                  >
                    Birinchi Blogni Yaratish
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default FolderManager;