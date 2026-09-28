import React, { useState } from 'react';
import { Topic } from '../../types/quiz';
import { saveTopic, removeTopic, uploadStudyMaterial } from '../../firebase/service';
import {
  BookOpen,
  Plus,
  Trash2,
  FileText,
  UploadCloud,
  CheckCircle,
  ExternalLink,
  Eye,
  AlertCircle,
  X,
  FileUp,
} from 'lucide-react';

interface TopicManagerProps {
  topics: Topic[];
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onRefresh: () => void;
}

export const TopicManager: React.FC<TopicManagerProps> = ({
  topics,
  selectedTopicId,
  onSelectTopic,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [materialText, setMaterialText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<{ name: string; text?: string; url?: string } | null>(null);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) return;

    setIsUploading(true);
    const newId = 'top-' + Date.now();
    let matUrl = '';
    let matName = '';
    let matSize = '';

    if (selectedFile) {
      try {
        const uploadResult = await uploadStudyMaterial(selectedFile, newId);
        matUrl = uploadResult.url;
        matName = uploadResult.name;
        matSize = uploadResult.size;
      } catch (err) {
        console.warn('PDF upload failed, using fallback:', err);
      }
    }

    const newTopic: Topic = {
      id: newId,
      name: topicName.trim(),
      description: topicDesc.trim() || 'Comprehensive study syllabus and quiz question pool.',
      studyMaterialName: matName || (materialText ? 'Study_Summary.txt' : undefined),
      studyMaterialUrl: matUrl,
      studyMaterialSize: matSize || (materialText ? `${(materialText.length / 1024).toFixed(1)} KB` : undefined),
      studyMaterialText: materialText.trim() || undefined,
      questionCount: 0,
      createdAt: new Date().toISOString(),
    };

    await saveTopic(newTopic);
    setIsUploading(false);
    setShowAddModal(false);
    setTopicName('');
    setTopicDesc('');
    setMaterialText('');
    setSelectedFile(null);
    onRefresh();
    onSelectTopic(newTopic.id);
  };

  const handleDelete = async (topicId: string, name: string) => {
    if (confirm(`Are you sure you want to delete topic "${name}"?`)) {
      await removeTopic(topicId);
      onRefresh();
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Topics & PDF Study Material</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize study curriculum and upload PDFs to generate 20-question quizzes.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Topic + PDF</span>
        </button>
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topics.map((t) => {
          const isSelected = t.id === selectedTopicId;
          return (
            <div
              key={t.id}
              onClick={() => onSelectTopic(t.id)}
              className={`p-5 rounded-xl border transition cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10'
                  : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                    Topic
                  </span>
                  {t.id !== 'topic-ethics-genai' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(t.id, t.name);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="font-bold text-white text-base mb-1.5 leading-snug line-clamp-2">
                  {t.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4">{t.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
                {t.studyMaterialName ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewMaterial({
                        name: t.studyMaterialName!,
                        text: t.studyMaterialText,
                        url: t.studyMaterialUrl,
                      });
                    }}
                    className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="truncate max-w-[140px]">{t.studyMaterialName}</span>
                    <Eye className="w-3 h-3 text-slate-400" />
                  </button>
                ) : (
                  <span className="text-slate-500 text-[11px]">No PDF attached</span>
                )}

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {isSelected ? 'Selected' : 'Select'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Topic Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Create Topic & Upload Material</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a new syllabus module and upload study notes/PDF to generate questions.
            </p>

            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Topic Title *
                </label>
                <input
                  type="text"
                  required
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="e.g. Generative AI Ethics & Copyright Frameworks"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Topic Description
                </label>
                <textarea
                  rows={2}
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  placeholder="Brief summary of what this topic covers..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* PDF File Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileUp className="w-4 h-4 text-indigo-400" />
                  <span>Upload Study Material (PDF or Document)</span>
                </label>
                <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-4 text-center cursor-pointer bg-slate-800/40 transition relative">
                  <input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-200">
                    {selectedFile ? selectedFile.name : 'Click or drag PDF file here'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {selectedFile
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB ready for upload`
                      : 'Supports PDF, Word, or text files up to 25 MB'}
                  </p>
                </div>
              </div>

              {/* Study Notes / Extracted Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Key Notes / Key Concepts (Used for Question Generation)
                </label>
                <textarea
                  rows={4}
                  value={materialText}
                  onChange={(e) => setMaterialText(e.target.value)}
                  placeholder="Paste key facts, chapter notes, definitions, or syllabus highlights..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !topicName.trim()}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
                >
                  {isUploading ? 'Uploading...' : 'Save Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setPreviewMaterial(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white truncate">{previewMaterial.name}</h3>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
              {previewMaterial.text || 'No text summary extracted yet. PDF is stored securely in Firebase Storage.'}
            </div>

            {previewMaterial.url && previewMaterial.url.startsWith('http') && (
              <div className="mt-4 flex justify-end">
                <a
                  href={previewMaterial.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Download / Open PDF</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
