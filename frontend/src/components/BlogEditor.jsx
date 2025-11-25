import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { blogAPI } from '../services/api';
import { Plus, X, Copy, Check, Code, Type, Image, Video, Bold, Italic, Underline, Link as LinkIcon, Save, ArrowLeft, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3, Download } from 'lucide-react';

function BlogEditor() {
  const { id } = useParams()
  const [title, setTitle] = useState('')
  const [cells, setCells] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchBlog()
  }, [id])

  const fetchBlog = async () => {
    try {
      const response = await blogAPI.getById(id)
      const blog = response.data
      setTitle(blog.title)
      // Make editor resilient to missing or stringified cells
      let cellsData = blog.cells || []
      if (typeof cellsData === 'string') {
        try {
          cellsData = JSON.parse(cellsData)
        } catch (e) {
          console.warn('Blog cells are a string but not valid JSON; ignoring.', e)
          cellsData = []
        }
      }
      setCells(Array.isArray(cellsData) ? cellsData : [])
    } catch (error) {
      console.error('Error fetching blog:', error)
      alert('Blogni yuklashda xatolik')
      navigate('/settings')
    } finally {
      setLoading(false)
    }
  }

  const addCell = (type, afterId = null) => {
    const newCell = {
      id: Date.now(),
      type,
      content: type === 'media' ? [] : ''
    };
    
    if (afterId) {
      const index = cells.findIndex(c => c.id === afterId);
      const newCells = [...cells];
      newCells.splice(index + 1, 0, newCell);
      setCells(newCells);
    } else {
      setCells([...cells, newCell]);
    }
  };

  const deleteCell = (id) => {
    setCells(cells.filter(c => c.id !== id));
  };

  const updateCell = (id, content) => {
    setCells(cells.map(c => c.id === id ? { ...c, content } : c));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Sarlavha kiriting');
      return;
    }

    // Ensure user still has a token
    const token = localStorage.getItem('token')
    if (!token) {
      alert('Siz tizimga kirmagansiz yoki sessiya tugagan. Iltimos, qayta kiring.');
      navigate('/login');
      return;
    }

    const payload = {
      title: title.trim(),
      cells: cells.map(cell => ({ id: cell.id, type: cell.type, content: cell.content }))
    }

    console.log('Updating blog', id, payload)

    setSaving(true)
    try {
      const response = await blogAPI.update(id, payload)
      console.log('Update response:', response.data)
      // After successful update, redirect back to settings (or dashboard)
      // Do not show a blocking alert — navigate directly so the UI updates seamlessly
      navigate('/settings')
    } catch (error) {
      console.error('Error updating blog:', error)
      console.error('Server response:', error?.response?.data)
      const detail = error?.response?.data?.detail || error.message || 'Unknown error'
      alert('Blog yangilashda xatolik: ' + detail)
    } finally {
      setSaving(false)
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Yuklanmoqda...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link to="/settings" className="text-gray-300 hover:text-white">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-xl font-bold text-white">Blogni Tahrirlash</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">{user?.username}</span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Saqlanmoqda...' : 'Yangilash'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Input */}
        <div className="mb-8">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-3xl font-bold text-white placeholder-gray-500 border-none outline-none"
            placeholder="Blog sarlavhasi..."
          />
        </div>

        {/* Cells */}
        <div className="space-y-1">
          {cells.map((cell, index) => (
            <Cell
              key={cell.id}
              cell={cell}
              onUpdate={updateCell}
              onDelete={deleteCell}
              onAddAfter={addCell}
              isLast={index === cells.length - 1}
            />
          ))}
        </div>

        {/* Bottom add buttons */}
        {cells.length > 0 && (
          <div className="mt-6 flex gap-3 justify-center">
            <CellAddButton type="text" onClick={() => addCell('text')} />
            <CellAddButton type="code" onClick={() => addCell('code')} />
            <CellAddButton type="media" onClick={() => addCell('media')} />
          </div>
        )}

        {/* Agar hali cell bo'lmasa */}
        {cells.length === 0 && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-6">
            <div className="flex gap-3 justify-center">
              <CellAddButton type="text" onClick={() => addCell('text')} />
              <CellAddButton type="code" onClick={() => addCell('code')} />
              <CellAddButton type="media" onClick={() => addCell('media')} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Qolgan komponentlar (Cell, CellAddButton, TextEditor, CodeEditor, MediaUploader)
// BlogCreator.jsx dagi bilan bir xil, shuning uchun qayta yozmayman
// Faqat quyidagi funksiyani o'zgartiring:

function CellAddButton({ type, onClick }) {
  const icons = {
    text: <Type size={14} />,
    code: <Code size={14} />,
    media: <Image size={14} />
  };

  const colors = {
    text: 'bg-blue-600 hover:bg-blue-700',
    code: 'bg-green-600 hover:bg-green-700', 
    media: 'bg-purple-600 hover:bg-purple-700'
  };

  const labels = {
    text: 'Text',
    code: 'Code',
    media: 'Media'
  };

  return (
    <button
      onClick={onClick}
      className={`${colors[type]} text-white px-3 py-2 rounded-lg flex items-center gap-1 transition flex-col min-w-[80px]`}
    >
      <div className="p-1 bg-white/10 rounded">
        {icons[type]}
      </div>
      <span className="text-xs">{labels[type]}</span>
    </button>
  );
}

// Cell, TextEditor, CodeEditor, MediaUploader komponentlari 
// BlogCreator.jsx dagi bilan bir xil, ularni copy qilishingiz mumkin
// Yoki alohida shared komponent qilishingiz mumkin

function Cell({ cell, onUpdate, onDelete, onAddAfter, isLast }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="bg-gray-800/30 backdrop-blur-lg border border-transparent hover:border-gray-600 transition-all duration-200 group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div className="absolute top-2 right-2 z-20 flex gap-1">
          <button
            onClick={() => onDelete(cell.id)}
            className="bg-red-600 hover:bg-red-700 text-white p-1 rounded transition text-xs"
            title="O'chirish"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="p-4">
        {cell.type === 'text' && (
          <TextEditor content={cell.content} onChange={(val) => onUpdate(cell.id, val)} />
        )}
        {cell.type === 'code' && (
          <CodeEditor content={cell.content} onChange={(val) => onUpdate(cell.id, val)} />
        )}
        {cell.type === 'media' && (
          <MediaUploader content={cell.content} onChange={(val) => onUpdate(cell.id, val)} />
        )}
      </div>

      {hovered && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10 flex gap-1 bg-gray-800 rounded border border-gray-600 p-1">
          <button
            onClick={() => onAddAfter('text', cell.id)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded transition text-xs flex items-center gap-1"
            title="Text qo'shish"
          >
            <Type size={10} />
          </button>
          <button
            onClick={() => onAddAfter('code', cell.id)}
            className="bg-green-600 hover:bg-green-700 text-white p-1 rounded transition text-xs flex items-center gap-1"
            title="Code qo'shish"
          >
            <Code size={10} />
          </button>
          <button
            onClick={() => onAddAfter('media', cell.id)}
            className="bg-purple-600 hover:bg-purple-700 text-white p-1 rounded transition text-xs flex items-center gap-1"
            title="Media qo'shish"
          >
            <Image size={10} />
          </button>
        </div>
      )}
    </div>
  );
}

function TextEditor({ content, onChange }) {
  const [text, setText] = useState(content);
  const textAreaRef = useRef(null);

  const applyFormat = (format) => {
    const textarea = textAreaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);

    if (!selectedText) return;

    let formattedText = '';
    let newCursorPos = end;

    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        newCursorPos = start + formattedText.length;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        newCursorPos = start + formattedText.length;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        newCursorPos = start + formattedText.length;
        break;
      case 'link':
        const url = prompt('URL kiriting:');
        if (url) {
          formattedText = `[${selectedText}](${url})`;
          newCursorPos = start + formattedText.length;
        } else return;
        break;
      case 'h1':
        formattedText = `# ${selectedText}`;
        newCursorPos = start + formattedText.length;
        break;
      case 'h2':
        formattedText = `## ${selectedText}`;
        newCursorPos = start + formattedText.length;
        break;
      case 'h3':
        formattedText = `### ${selectedText}`;
        newCursorPos = start + formattedText.length;
        break;
      case 'alignLeft':
        formattedText = `<div align="left">${selectedText}</div>`;
        newCursorPos = start + formattedText.length;
        break;
      case 'alignCenter':
        formattedText = `<div align="center">${selectedText}</div>`;
        newCursorPos = start + formattedText.length;
        break;
      case 'alignRight':
        formattedText = `<div align="right">${selectedText}</div>`;
        newCursorPos = start + formattedText.length;
        break;
      default:
        return;
    }

    const newText = text.substring(0, start) + formattedText + text.substring(end);
    setText(newText);
    onChange(newText);

    setTimeout(() => {
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const handleChange = (e) => {
    setText(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div>
      <div className="flex gap-1 mb-2 flex-wrap">
        <button onClick={() => applyFormat('h1')} className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded transition text-xs" title="Sarlavha 1"><Heading1 size={12} /></button>
        <button onClick={() => applyFormat('h2')} className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded transition text-xs" title="Sarlavha 2"><Heading2 size={12} /></button>
        <button onClick={() => applyFormat('h3')} className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded transition text-xs" title="Sarlavha 3"><Heading3 size={12} /></button>
        <div className="w-px bg-gray-600 mx-1"></div>
        <button onClick={() => applyFormat('bold')} className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded transition text-xs" title="Qalin (Bold)"><Bold size={12} /></button>
        <button onClick={() => applyFormat('italic')} className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded transition text-xs" title="Kursiv (Italic)"><Italic size={12} /></button>
        <button onClick={() => applyFormat('underline')} className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded transition text-xs" title="Tagiga chizilgan"><Underline size={12} /></button>
        <button onClick={() => applyFormat('link')} className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded transition text-xs" title="Link qo'shish"><LinkIcon size={12} /></button>
        <div className="w-px bg-gray-600 mx-1"></div>
        <button onClick={() => applyFormat('alignLeft')} className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded transition text-xs" title="Chapga tekislash"><AlignLeft size={12} /></button>
        <button onClick={() => applyFormat('alignCenter')} className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded transition text-xs" title="Markazga tekislash"><AlignCenter size={12} /></button>
        <button onClick={() => applyFormat('alignRight')} className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded transition text-xs" title="O'ngga tekislash"><AlignRight size={12} /></button>
      </div>
      <textarea ref={textAreaRef} value={text} onChange={handleChange} className="w-full bg-gray-900/50 text-white rounded-lg p-3 min-h-[120px] border border-gray-600 focus:border-blue-500 focus:outline-none resize-none text-sm font-sans" placeholder="Matn kiriting... (Markdown va HTML formatlarini qo'llab-quvvatlaydi)" />
    </div>
  );
}

function CodeEditor({ content, onChange }) {
  const [code, setCode] = useState(content);

  const handleChange = (e) => {
    setCode(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div className="relative">
      <textarea value={code} onChange={handleChange} className="w-full bg-gray-900 text-green-300 rounded-lg p-3 min-h-[150px] border border-gray-600 focus:border-green-500 focus:outline-none font-mono text-sm resize-none" placeholder="Kodingizni yozing..." spellCheck="false" />
    </div>
  );
}

function MediaUploader({ content, onChange }) {
  const [files, setFiles] = useState(content || []);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const filePromises = selectedFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({ id: Date.now() + Math.random(), name: file.name, type: file.type, data: event.target.result, size: file.size });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then(newFiles => {
      const updated = [...files, ...newFiles];
      setFiles(updated);
      onChange(updated);
    });
  };

  const removeFile = (id) => {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    onChange(updated);
  };

  const downloadFile = (file) => {
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    link.click();
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
      <button onClick={() => fileInputRef.current.click()} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg mb-3 flex items-center gap-2 transition text-sm"><Plus size={16} /> Rasm yoki Video yuklash</button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
        {files.map(file => (
          <div key={file.id} className="relative bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700 group max-w-xs w-full">
            <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => downloadFile(file)} className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded transition text-xs" title="Yuklab olish"><Download size={12} /></button>
              <button onClick={() => removeFile(file.id)} className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded transition text-xs" title="O'chirish"><X size={12} /></button>
            </div>
            {file.type.startsWith('image/') ? (
              <img src={file.data} alt={file.name} className="w-full h-48 object-cover cursor-pointer mx-auto" onClick={() => window.open(file.data, '_blank')} />
            ) : (
              <video src={file.data} controls className="w-full h-48 object-cover mx-auto" />
            )}
            <div className="p-3 bg-gray-900/80">
              <div className="text-white text-sm font-medium truncate text-center">{file.name}</div>
              <div className="text-gray-400 text-xs text-center">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BlogEditor;