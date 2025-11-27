import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { folderAPI } from '../services/api';
import { Folder, ArrowLeft, Save } from 'lucide-react';

function FolderCreator() {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Location statedan ma'lumotlarni olish
  const { parent_id = null, returnTo = '/', folderStack = [] } = location.state || {};

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Papka nomini kiriting');
      return;
    }

    setSaving(true);
    try {
      await folderAPI.create({
        name: name.trim(),
        parent_id: parent_id
      });
      
      // Oldingi sahifaga qaytish va state ni saqlash
      navigate(returnTo, { 
        state: { 
          currentFolder: parent_id,
          folderStack: folderStack
        } 
      });
    } catch (error) {
      console.error('Error saving folder:', error);
      alert('Papka saqlashda xatolik: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1); // Orqaga qaytish
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleCancel}
                className="text-gray-300 hover:text-white flex items-center gap-2"
              >
                <ArrowLeft size={20} />
                Ortga
              </button>
              <h1 className="text-xl font-bold text-white">Yangi Papka Yaratish</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">{user?.username}</span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Name Input */}
        <div className="mb-8">
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Papka nomi
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="Papka nomi..."
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
        </div>

        {/* Preview */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <Folder className="h-8 w-8 text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">{name || "Papka nomi"}</h3>
              <p className="text-gray-400 text-sm">Yangi papka</p>
              {parent_id && (
                <p className="text-gray-500 text-sm mt-1">
                  Joylashuv: {parent_id === null ? 'Asosiy papka' : `Papka ichida`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FolderCreator;