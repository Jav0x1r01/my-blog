import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { blogAPI } from '../services/api'
import { ArrowLeft, Copy, Check, Download, Calendar, User } from 'lucide-react'

function BlogViewer() {
  const { id } = useParams()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copiedCodeId, setCopiedCodeId] = useState(null)

  useEffect(() => {
    fetchBlog()
  }, [id])

  const fetchBlog = async () => {
    try {
      const response = await blogAPI.getById(id)
      setBlog(response.data)
    } catch (error) {
      console.error('Error fetching blog:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyCode = (code, cellId) => {
    navigator.clipboard.writeText(code)
    setCopiedCodeId(cellId)
    setTimeout(() => setCopiedCodeId(null), 2000)
  }

  const downloadFile = (file) => {
    const link = document.createElement('a')
    link.href = file.data
    link.download = file.name
    link.click()
  }

  const formatText = (text) => {
    if (!text) return ''
    
    // Markdown va HTML formatlash
    let formatted = text
      // Headers
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-white mt-6 mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-white mt-5 mb-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-white mt-4 mb-2">$1</h3>')
      // Bold, Italic, Underline
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-200">$1</em>')
      .replace(/__(.*?)__/g, '<u class="underline text-white">$1</u>')
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank">$1</a>')
      // Alignment
      .replace(/<div align="left">(.*?)<\/div>/g, '<div class="text-left">$1</div>')
      .replace(/<div align="center">(.*?)<\/div>/g, '<div class="text-center">$1</div>')
      .replace(/<div align="right">(.*?)<\/div>/g, '<div class="text-right">$1</div>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>')
    
    return `<p class="text-gray-200 leading-relaxed mb-4">${formatted}</p>`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Yuklanmoqda...</div>
      </div>
    )
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Blog topilmadi</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link
              to="/"
              className="text-gray-300 hover:text-white flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Ortga
            </Link>
            <div className="flex items-center gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-1">
                <User size={16} />
                {blog.author}
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                {new Date(blog.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Blog Title */}
        <h1 className="text-4xl font-bold text-white mb-6 text-center">
          {blog.title}
        </h1>

        {/* Blog Content */}
        <div className="prose prose-invert max-w-none">
          {blog.cells.map((cell) => (
            <div key={cell.id} className="mb-8 last:mb-0">
              {cell.type === 'text' && (
                <div 
                  className="text-gray-200 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatText(cell.content) }}
                />
              )}
              
              {cell.type === 'code' && cell.content && (
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={() => copyCode(cell.content, cell.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded flex items-center gap-2 text-sm transition"
                    >
                      {copiedCodeId === cell.id ? (
                        <>
                          <Check size={14} />
                          Nusxa olindi!
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Nusxa olish
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-green-300 rounded-lg p-4 overflow-x-auto border border-gray-700">
                    <code className="font-mono text-sm whitespace-pre-wrap">
                      {cell.content}
                    </code>
                  </pre>
                </div>
              )}
              
              {cell.type === 'media' && cell.content && (
  <div className="flex justify-center">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center max-w-6xl">
      {cell.content.map((file) => (
        <div key={file.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 max-w-xs w-full">
          {file.type.startsWith('image/') ? (
            <img 
              src={file.data} 
              alt={file.name}
              className="w-full h-64 object-cover cursor-pointer mx-auto"
              onClick={() => window.open(file.data, '_blank')}
            />
          ) : (
            <video 
              src={file.data} 
              controls 
              className="w-full h-64 object-cover mx-auto"
            />
          )}
          <div className="p-3 bg-gray-900/80">
            <div className="flex justify-between items-center">
              <div className="text-white text-sm font-medium truncate flex-1 text-center">
                {file.name}
              </div>
              <button
                onClick={() => downloadFile(file)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded transition text-xs ml-2"
                title="Yuklab olish"
              >
                <Download size={12} />
              </button>
            </div>
            <div className="text-gray-400 text-xs mt-1 text-center">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}

export default BlogViewer