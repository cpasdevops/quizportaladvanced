import React, { useState, useRef } from 'react';
import { Topic } from '../../types/quiz';
import { saveTopic, removeTopic, uploadStudyMaterial } from '../../firebase/service';
import { downloadMaterial } from '../../utils/fileStore';
import { downloadSampleStudyMaterialTemplate } from '../../utils/questionParser';
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
  Download,
  Loader2,
  CheckCircle2,
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
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [activeUploadingTopicId, setActiveUploadingTopicId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<{
    id?: string;
    name: string;
    text?: string;
    url?: string;
    size?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const directTopicUploadInputRef = useRef<HTMLInputElement>(null);
  const targetTopicIdForUpload = useRef<string | null>(null);

  // When a file is chosen in the Create Topic modal
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadFeedback(`Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

      // Auto-extract text preview if possible
      try {
        if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          const content = await file.text();
          if (!materialText) setMaterialText(content.slice(0, 3000));
        }
      } catch (err) {
        console.warn('Could not read text preview:', err);
      }
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) return;

    setIsUploading(true);
    const newId = 'top-' + Date.now();
    let matUrl = '';
    let matName = '';
    let matSize = '';
    let extracted = materialText;

    if (selectedFile) {
      try {
        const uploadResult = await uploadStudyMaterial(selectedFile, newId);
        matUrl = uploadResult.url;
        matName = uploadResult.name;
        matSize = uploadResult.size;
        if (uploadResult.textPreview && !extracted) {
          extracted = uploadResult.textPreview;
        }
      } catch (err) {
        console.warn('PDF upload failed, using fallback:', err);
      }
    }

    const newTopic: Topic = {
      id: newId,
      name: topicName.trim(),
      description: topicDesc.trim() || 'Comprehensive study syllabus and quiz question pool.',
      studyMaterialName: matName || (extracted ? 'Study_Notes.txt' : undefined),
      studyMaterialUrl: matUrl,
      studyMaterialSize: matSize || (extracted ? `${(extracted.length / 1024).toFixed(1)} KB` : undefined),
      studyMaterialText: extracted.trim() || undefined,
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
    setUploadFeedback(null);
    setSuccessToast(`Topic "${newTopic.name}" created with study material attached!`);
    setTimeout(() => setSuccessToast(null), 5000);
    onRefresh();
    onSelectTopic(newTopic.id);
  };

  // Upload or replace PDF on an EXISTING topic
  const triggerDirectUpload = (topicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    targetTopicIdForUpload.current = topicId;
    if (directTopicUploadInputRef.current) {
      directTopicUploadInputRef.current.value = '';
      directTopicUploadInputRef.current.click();
    }
  };

  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const topicId = targetTopicIdForUpload.current;
    if (!file || !topicId) return;

    setActiveUploadingTopicId(topicId);
    try {
      const result = await uploadStudyMaterial(file, topicId);
      const targetTopic = topics.find((t) => t.id === topicId);
      if (targetTopic) {
        const updated: Topic = {
          ...targetTopic,
          studyMaterialName: result.name,
          studyMaterialUrl: result.url,
          studyMaterialSize: result.size,
          studyMaterialText: result.textPreview || targetTopic.studyMaterialText,
        };
        await saveTopic(updated);
        setSuccessToast(`✓ File "${result.name}" (${result.size}) uploaded successfully!`);
        setTimeout(() => setSuccessToast(null), 5000);
        onRefresh();
      }
    } catch (err) {
      console.error('Direct upload failed:', err);
      alert('File upload failed. Please try again.');
    } finally {
      setActiveUploadingTopicId(null);
      targetTopicIdForUpload.current = null;
    }
  };

  const handleDelete = async (topicId: string, name: string) => {
    if (confirm(`Are you sure you want to delete topic "${name}"?`)) {
      await removeTopic(topicId);
      onRefresh();
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      {/* Hidden input for uploading directly to an existing topic card */}
      <input
        ref={directTopicUploadInputRef}
        type="file"
        accept=".pdf,.txt,.doc,.docx"
        onChange={handleDirectFileUpload}
        className="hidden"
      />

      {/* Success Toast Notification */}
      {successToast && (
        <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-400 hover:text-white p-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Topics & PDF Study Material</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize study curriculum and attach PDF documents to build customized 20-question quizzes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={(e) => triggerDirectUpload(selectedTopicId, e)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
            title="Upload PDF to currently selected topic"
          >
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span>Upload PDF to Topic</span>
          </button>

          <button
            onClick={() => {
              setShowAddModal(true);
              setSelectedFile(null);
              setUploadFeedback(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Topic + PDF</span>
          </button>
        </div>
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topics.map((t) => {
          const isSelected = t.id === selectedTopicId;
          const isCurrentUploading = activeUploadingTopicId === t.id;

          return (
            <div
              key={t.id}
              onClick={() => onSelectTopic(t.id)}
              className={`p-5 rounded-2xl border transition cursor-pointer relative flex flex-col justify-between ${
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
                      title="Delete topic"
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

              {/* Study material preview & direct upload bar */}
              <div className="pt-3 border-t border-slate-700/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  {t.studyMaterialName ? (
                    <div className="flex items-center gap-1.5 truncate max-w-[190px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewMaterial({
                            id: t.id,
                            name: t.studyMaterialName!,
                            text: t.studyMaterialText,
                            url: t.studyMaterialUrl,
                            size: t.studyMaterialSize,
                          });
                        }}
                        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium truncate"
                        title="View Attached Study Material"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate max-w-[120px]">{t.studyMaterialName}</span>
                        <Eye className="w-3 h-3 text-slate-400 shrink-0" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadMaterial(t.studyMaterialUrl || '', t.studyMaterialName!, t.id);
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/60 rounded transition"
                        title="Direct Download / Open PDF"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[11px]">No PDF attached yet</span>
                  )}

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isSelected ? 'Active' : 'Select'}
                  </span>
                </div>

                {/* Upload / Replace button on card */}
                <button
                  type="button"
                  onClick={(e) => triggerDirectUpload(t.id, e)}
                  disabled={isCurrentUploading}
                  className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold rounded-lg border border-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  {isCurrentUploading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                      <span>Uploading PDF...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t.studyMaterialName ? 'Replace PDF / Material' : 'Upload PDF Study Material'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Topic Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Create Topic & Attach PDF</h3>
            <p className="text-xs text-slate-400 mb-5">
              Add a new syllabus module and upload your study material PDF to generate questions.
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
                  placeholder="e.g. Deep Learning Ethics & Algorithmic Fairness"
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

              {/* PDF File Upload Zone */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileUp className="w-4 h-4 text-indigo-400" />
                    <span>Upload Study Material (PDF, DOCX, TXT)</span>
                  </label>
                  <button
                    type="button"
                    onClick={downloadSampleStudyMaterialTemplate}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                    title="Download Sample Study Material Syllabus text file"
                  >
                    <Download className="w-3 h-3" />
                    <span>Sample Syllabus TXT</span>
                  </button>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-5 text-center cursor-pointer bg-slate-800/40 hover:bg-slate-800/70 transition"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-white max-w-[280px] truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-emerald-400 mt-0.5">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to save
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setUploadFeedback(null);
                        }}
                        className="mt-2 text-[10px] text-rose-400 hover:underline"
                      >
                        Remove / Choose different file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <UploadCloud className="w-8 h-8 text-indigo-400 mb-2" />
                      <p className="text-xs font-bold text-slate-200">
                        Click to select or drag PDF file here
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Supports PDF and documents up to 50 MB
                      </p>
                    </div>
                  )}
                </div>

                {uploadFeedback && (
                  <p className="text-[11px] text-indigo-300 mt-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>{uploadFeedback}</span>
                  </p>
                )}
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
                  placeholder="Key concepts, definitions, bullet points, or chapter summary..."
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
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving & Uploading...</span>
                    </>
                  ) : (
                    <span>Save Topic & Material</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setPreviewMaterial(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-base font-bold text-white truncate max-w-md">
                  {previewMaterial.name}
                </h3>
                {previewMaterial.size && (
                  <span className="text-[10px] text-slate-400">File size: {previewMaterial.size}</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
              {previewMaterial.text || 'No text summary extracted yet. Material document is attached.'}
            </div>

            <div className="mt-4 flex justify-between items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMaterial(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadMaterial(
                    previewMaterial.url || '',
                    previewMaterial.name,
                    previewMaterial.id
                  )
                }
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download / Open Attached PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
