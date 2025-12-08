// "use client"

// import { useState, useRef, useEffect } from "react"
// import { Send, AlertCircle, Loader } from "lucide-react"

// interface Message {
//   id: string
//   type: "user" | "assistant"
//   content: string
//   sources?: any[]
//   sourceType?: string
// }

// export default function RAGChat() {
//   const [messages, setMessages] = useState<Message[]>([])
//   const [query, setQuery] = useState("")
//   const [loading, setLoading] = useState(false)
//   const [apiKey, setApiKey] = useState("")
//   const [showApiKeyInput, setShowApiKeyInput] = useState(true)
//   const [error, setError] = useState("")
//   const messagesEndRef = useRef<HTMLDivElement>(null)

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   const handleSend = async () => {
//     if (!query.trim() || !apiKey.trim()) {
//       setError("Please enter both API key and query")
//       return
//     }

//     setError("")
//     const userMessage: Message = {
//       id: Date.now().toString(),
//       type: "user",
//       content: query,
//     }

//     setMessages((prev) => [...prev, userMessage])
//     setQuery("")
//     setLoading(true)

//     try {
//       const response = await fetch("http://localhost:5000/api/query", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ query: query.trim(), api_key: apiKey.trim() }),
//       })

//       if (!response.ok) {
//         const data = await response.json()
//         throw new Error(data.error || "Query failed")
//       }

//       const data = await response.json()

//       const assistantMessage: Message = {
//         id: (Date.now() + 1).toString(),
//         type: "assistant",
//         content: data.answer,
//         sourceType: data.source_type,
//         sources: data.sources,
//       }

//       setMessages((prev) => [...prev, assistantMessage])
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Unknown error")
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="h-full flex flex-col bg-background">
//       {/* Header */}
//       <div className="p-6 border-b border-border bg-surface">
//         <h2 className="text-2xl font-bold text-text-primary mb-2">Chat with Your Documents</h2>
//         <p className="text-text-secondary text-sm">Ask questions about your uploaded documents</p>
//       </div>

//       {/* API Key Input */}
//       {showApiKeyInput && (
//         <div className="p-4 bg-surface-alt border-b border-border">
//           <div className="flex gap-2">
//             <input
//               type="password"
//               placeholder="Enter Google Generative AI API Key"
//               value={apiKey}
//               onChange={(e) => setApiKey(e.target.value)}
//               className="flex-1 px-3 py-2 bg-surface border border-border rounded text-text-primary placeholder:text-text-secondary text-sm"
//             />
//             <button
//               onClick={() => setShowApiKeyInput(false)}
//               className="px-4 py-2 bg-accent text-background rounded font-medium text-sm hover:opacity-90"
//             >
//               Set
//             </button>
//           </div>
//           <p className="text-xs text-text-secondary mt-2">
//             Get your API key from https://aistudio.google.com/app/apikey
//           </p>
//         </div>
//       )}

//       {/* Messages */}
//       <div className="flex-1 overflow-auto p-6 space-y-4">
//         {messages.length === 0 && (
//           <div className="flex items-center justify-center h-full text-center">
//             <div>
//               <h3 className="text-xl font-semibold text-text-primary mb-2">Start a Conversation</h3>
//               <p className="text-text-secondary">Ask a question about your documents</p>
//             </div>
//           </div>
//         )}

//         {messages.map((msg) => (
//           <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
//             <div
//               className={`max-w-2xl p-4 rounded-lg ${
//                 msg.type === "user" ? "bg-accent text-background" : "bg-surface border border-border text-text-primary"
//               }`}
//             >
//               <p className="text-sm leading-relaxed">{msg.content}</p>
//               {msg.sources && msg.sources.length > 0 && (
//                 <div className="mt-3 pt-3 border-t border-current border-opacity-10">
//                   <p className="text-xs font-medium mb-2 opacity-80">Sources:</p>
//                   <div className="space-y-1">
//                     {msg.sources.map((src, idx) => (
//                       <p key={idx} className="text-xs opacity-75">
//                         {src.source_file} (relevance: {(src.relevance * 100).toFixed(0)}%)
//                       </p>
//                     ))}
//                   </div>
//                 </div>
//               )}
//               {msg.sourceType && <p className="text-xs mt-2 opacity-70">Mode: {msg.sourceType}</p>}
//             </div>
//           </div>
//         ))}

//         {loading && (
//           <div className="flex justify-start">
//             <div className="bg-surface border border-border p-4 rounded-lg flex items-center gap-2">
//               <Loader size={16} className="text-accent animate-spin" />
//               <p className="text-sm text-text-secondary">Thinking...</p>
//             </div>
//           </div>
//         )}

//         {error && (
//           <div className="flex justify-center">
//             <div className="bg-error/10 border border-error/30 p-4 rounded-lg flex gap-2 max-w-md">
//               <AlertCircle size={16} className="text-error flex-shrink-0 mt-0.5" />
//               <p className="text-sm text-error">{error}</p>
//             </div>
//           </div>
//         )}

//         <div ref={messagesEndRef} />
//       </div>

//       {/* Input */}
//       <div className="p-4 border-t border-border bg-surface">
//         <div className="flex gap-2">
//           <input
//             type="text"
//             placeholder="Ask a question..."
//             value={query}
//             onChange={(e) => setQuery(e.target.value)}
//             onKeyPress={(e) => e.key === "Enter" && handleSend()}
//             disabled={loading || !apiKey}
//             className="flex-1 px-4 py-3 bg-surface-alt border border-border rounded-lg text-text-primary placeholder:text-text-secondary disabled:opacity-50 focus:outline-none focus:border-accent"
//           />
//           <button
//             onClick={handleSend}
//             disabled={loading || !query.trim() || !apiKey}
//             className="px-6 py-3 bg-accent text-background rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
//           >
//             {loading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }

"use client"

import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, MessageSquare, FolderOpen, Database, Send, X, Check, Loader, AlertCircle, Image, File } from 'lucide-react';

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  sources?: any[];
  sourceType?: string;
  timestamp: string;
}

interface FileObject {
  id: string;
  file: File;
  name: string;
  size: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export default function RAGChat() {
  const [activeTab, setActiveTab] = useState('upload');
  const [files, setFiles] = useState<FileObject[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [indexBuilding, setIndexBuilding] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const API_URL = 'http://localhost:5000';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const fileObjects: FileObject[] = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file: file,
      name: file.name,
      size: (file.size / 1024).toFixed(2) + ' KB',
      type: file.type,
      status: 'pending'
    }));
    setFiles(prev => [...prev, ...fileObjects]);
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const uploadFiles = async () => {
    setProcessing(true);
    setError('');
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;

      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'processing' } : f
      ));
      
      try {
        const formData = new FormData();
        formData.append('file', files[i].file);
        
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'completed' } : f
        ));
      } catch (err) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error' } : f
        ));
        setError(`Failed to upload ${files[i].name}`);
      }
    }
    
    setProcessing(false);
  };

  const buildIndex = async () => {
    setIndexBuilding(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/api/build-index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Index building failed');
      }

      setActiveTab('chat');
    } catch (err) {
      setError('Failed to build index. Please try again.');
    } finally {
      setIndexBuilding(false);
    }
  };

  const sendMessage = async () => {
    if (!query.trim() || !apiKey.trim()) {
      setError('Please enter both API key and query');
      return;
    }

    setError('');
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), api_key: apiKey.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Query failed');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.answer,
        sourceType: data.source_type,
        sources: data.sources,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <Image className="w-5 h-5" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-400" />;
    if (type.includes('dicom')) return <FileText className="w-5 h-5 text-blue-400" />;
    return <File className="w-5 h-5" />;
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'processing': return <Loader className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed': return <Check className="w-4 h-4 text-green-400" />;
      case 'error': return <X className="w-4 h-4 text-red-400" />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'rgb(15, 17, 23)', color: 'rgb(230, 237, 243)' }}>
      {/* Sidebar */}
      <div className="w-80 flex flex-col" style={{ backgroundColor: 'rgb(22, 27, 34)', borderRight: '1px solid rgb(48, 54, 61)' }}>
        <div className="p-6" style={{ borderBottom: '1px solid rgb(48, 54, 61)' }}>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(88, 166, 255)' }}>MedVision 1.1</h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(139, 148, 158)' }}>Intelligent Document Processing</p>
        </div>

        <nav className="flex-1 p-4">
          {[
            { id: 'upload', icon: Upload, label: 'Upload Documents' },
            { id: 'index', icon: Database, label: 'Build Index' },
            { id: 'chat', icon: MessageSquare, label: 'Chat with Docs' },
            { id: 'browse', icon: FolderOpen, label: 'Browse Documents' }
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors"
              style={activeTab === id 
                ? { backgroundColor: 'rgb(88, 166, 255)', color: 'rgb(15, 17, 23)' }
                : { color: 'rgb(230, 237, 243)' }
              }
              onMouseEnter={(e) => {
                if (activeTab !== id) e.currentTarget.style.backgroundColor = 'rgb(38, 41, 46)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== id) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid rgb(48, 54, 61)' }}>
          <div className="rounded-lg p-3" style={{ backgroundColor: 'rgb(38, 41, 46)' }}>
            <p className="text-xs" style={{ color: 'rgb(139, 148, 158)' }}>Documents Indexed</p>
            <p className="text-2xl font-bold" style={{ color: 'rgb(88, 166, 255)' }}>{files.filter(f => f.status === 'completed').length}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="flex-1 p-8 overflow-auto">
            <h2 className="text-3xl font-bold mb-2">Upload Documents</h2>
            <p className="mb-8" style={{ color: 'rgb(139, 148, 158)' }}>Upload PDFs, DOCX files, images (JPG/PNG), or DICOM files to index</p>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer"
              style={{
                borderColor: isDragging ? 'rgb(88, 166, 255)' : 'rgb(48, 54, 61)',
                backgroundColor: isDragging ? 'rgba(88, 166, 255, 0.1)' : 'transparent'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgb(88, 166, 255)' }} />
              <h3 className="text-xl font-semibold mb-2">Drag and drop your files here</h3>
              <p className="mb-4" style={{ color: 'rgb(139, 148, 158)' }}>or click to browse</p>
              <button className="px-6 py-2 rounded-lg transition-opacity hover:opacity-90" style={{ backgroundColor: 'rgb(88, 166, 255)', color: 'rgb(15, 17, 23)' }}>
                Select Files
              </button>
              <p className="text-sm mt-4" style={{ color: 'rgb(139, 148, 158)' }}>Supported: PDF, DOCX, JPG, PNG, DICOM (Max 50MB)</p>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png,.dcm" onChange={handleFileSelect} className="hidden" />
            </div>

            {error && (
              <div className="mt-4 p-4 rounded-lg flex gap-2" style={{ backgroundColor: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.3)' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(248, 81, 73)' }} />
                <p className="text-sm" style={{ color: 'rgb(248, 81, 73)' }}>{error}</p>
              </div>
            )}

            {files.length > 0 && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Uploaded Files ({files.length})</h3>
                  {files.some(f => f.status === 'pending') && (
                    <button onClick={uploadFiles} disabled={processing} className="px-6 py-2 rounded-lg transition-opacity disabled:opacity-50" style={{ backgroundColor: 'rgb(88, 166, 255)', color: 'rgb(15, 17, 23)' }}>
                      {processing ? 'Processing...' : 'Process Files'}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {files.map(file => (
                    <div key={file.id} className="rounded-lg p-4 flex items-center gap-4" style={{ backgroundColor: 'rgb(22, 27, 34)', border: '1px solid rgb(48, 54, 61)' }}>
                      {getFileIcon(file.type)}
                      <div className="flex-1">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm" style={{ color: 'rgb(139, 148, 158)' }}>{file.size}</p>
                      </div>
                      {getStatusIcon(file.status)}
                      <button onClick={() => removeFile(file.id)} className="transition-colors" style={{ color: 'rgb(139, 148, 158)' }}>
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Index Tab */}
        {activeTab === 'index' && (
          <div className="flex-1 p-8 flex items-center justify-center overflow-auto">
            <div className="max-w-2xl w-full text-center">
              <Database className="w-24 h-24 mx-auto mb-6" style={{ color: 'rgb(88, 166, 255)' }} />
              <h2 className="text-3xl font-bold mb-4">Build Index</h2>
              <p className="mb-8" style={{ color: 'rgb(139, 148, 158)' }}>Create FAISS embeddings and build the vector index for fast semantic search across your documents.</p>
              <div className="rounded-xl p-8 mb-6" style={{ backgroundColor: 'rgb(22, 27, 34)', border: '1px solid rgb(48, 54, 61)' }}>
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div>
                    <p className="text-sm mb-2" style={{ color: 'rgb(139, 148, 158)' }}>Files Ready</p>
                    <p className="text-3xl font-bold" style={{ color: 'rgb(88, 166, 255)' }}>{files.filter(f => f.status === 'completed').length}</p>
                  </div>
                  <div>
                    <p className="text-sm mb-2" style={{ color: 'rgb(139, 148, 158)' }}>Processing</p>
                    <p className="text-3xl font-bold text-yellow-400">{files.filter(f => f.status === 'processing').length}</p>
                  </div>
                  <div>
                    <p className="text-sm mb-2" style={{ color: 'rgb(139, 148, 158)' }}>Total</p>
                    <p className="text-3xl font-bold">{files.length}</p>
                  </div>
                </div>
                <button onClick={buildIndex} disabled={indexBuilding || files.filter(f => f.status === 'completed').length === 0} className="w-full px-8 py-4 rounded-lg transition-opacity disabled:opacity-50 font-semibold text-lg" style={{ backgroundColor: 'rgb(88, 166, 255)', color: 'rgb(15, 17, 23)' }}>
                  {indexBuilding ? <span className="flex items-center justify-center gap-2"><Loader className="w-5 h-5 animate-spin" />Building Index...</span> : 'Build Vector Index'}
                </button>
              </div>
              {error && (
                <div className="p-4 rounded-lg flex gap-2" style={{ backgroundColor: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.3)' }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(248, 81, 73)' }} />
                  <p className="text-sm" style={{ color: 'rgb(248, 81, 73)' }}>{error}</p>
                </div>
              )}
              {indexBuilding && (
                <div className="rounded-xl p-6" style={{ backgroundColor: 'rgb(22, 27, 34)', border: '1px solid rgb(48, 54, 61)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <Loader className="w-5 h-5 animate-spin" style={{ color: 'rgb(88, 166, 255)' }} />
                    <span className="text-sm">Processing documents with EasyOCR...</span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ backgroundColor: 'rgb(38, 41, 46)' }}>
                    <div className="h-2 rounded-full animate-pulse" style={{ width: '60%', backgroundColor: 'rgb(88, 166, 255)' }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col">
            <div className="p-6" style={{ borderBottom: '1px solid rgb(48, 54, 61)' }}>
              <h2 className="text-2xl font-bold">Chat with Documents</h2>
              <p style={{ color: 'rgb(139, 148, 158)' }}>Ask questions about your indexed documents</p>
            </div>
            {showApiKeyInput && (
              <div className="p-4" style={{ backgroundColor: 'rgb(38, 41, 46)', borderBottom: '1px solid rgb(48, 54, 61)' }}>
                <div className="flex gap-2">
                  <input type="password" placeholder="Enter Google Generative AI API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="flex-1 px-3 py-2 rounded text-sm" style={{ backgroundColor: 'rgb(22, 27, 34)', border: '1px solid rgb(48, 54, 61)', color: 'rgb(230, 237, 243)' }} />
                  <button onClick={() => setShowApiKeyInput(false)} className="px-4 py-2 rounded font-medium text-sm" style={{ backgroundColor: 'rgb(88, 166, 255)', color: 'rgb(15, 17, 23)' }}>Set</button>
                </div>
                <p className="text-xs mt-2" style={{ color: 'rgb(139, 148, 158)' }}>Get your API key from https://aistudio.google.com/app/apikey</p>
              </div>
            )}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: 'rgb(88, 166, 255)' }} />
                    <p style={{ color: 'rgb(139, 148, 158)' }}>Start a conversation about your documents</p>
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-2xl rounded-xl p-4" style={msg.type === 'user' ? { backgroundColor: 'rgb(88, 166, 255)', color: 'rgb(15, 17, 23)' } : { backgroundColor: 'rgb(22, 27, 34)', border: '1px solid rgb(48, 54, 61)' }}>
                      <p className="mb-1 leading-relaxed">{msg.content}</p>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <p className="text-xs font-medium mb-2 opacity-80">Sources:</p>
                          {msg.sources.map((src: any, idx: number) => (
                            <p key={idx} className="text-xs opacity-75">{src.source_file} (relevance: {(src.relevance * 100).toFixed(0)}%)</p>
                          ))}
                        </div>
                      )}
                      {msg.sourceType && <p className="text-xs mt-2 opacity-70">Mode: {msg.sourceType}</p>}
                      <p className="text-xs opacity-60 mt-2">{msg.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'rgb(22, 27, 34)', border: '1px solid rgb(48, 54, 61)' }}>
                    <div className="flex gap-2">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'rgb(88, 166, 255)', animationDelay: `${delay}s` }}></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex justify-center">
                  <div className="p-4 rounded-lg flex gap-2 max-w-md" style={{ backgroundColor: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.3)' }}>
                    <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(248, 81, 73)' }} />
                    <p className="text-sm" style={{ color: 'rgb(248, 81, 73)' }}>{error}</p>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-6" style={{ borderTop: '1px solid rgb(48, 54, 61)' }}>
              <div className="flex gap-3">
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()} placeholder="Ask a question about your documents..." disabled={loading || !apiKey} className="flex-1 rounded-lg px-4 py-3 disabled:opacity-50" style={{ backgroundColor: 'rgb(22, 27, 34)', border: '1px solid rgb(48, 54, 61)', color: 'rgb(230, 237, 243)' }} />
                <button onClick={sendMessage} disabled={!query.trim() || loading || !apiKey} className="px-6 py-3 rounded-lg transition-opacity disabled:opacity-50" style={{ backgroundColor: 'rgb(88, 166, 255)', color: 'rgb(15, 17, 23)' }}>
                  {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <div className="flex-1 p-8 overflow-auto">
            <h2 className="text-3xl font-bold mb-2">Browse Documents</h2>
            <p className="mb-8" style={{ color: 'rgb(139, 148, 158)' }}>View and manage your indexed documents</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {files.filter(f => f.status === 'completed').map(file => (
                <div key={file.id} className="rounded-xl p-6 transition-colors" style={{ backgroundColor: 'rgb(22, 27, 34)', border: '1px solid rgb(48, 54, 61)' }}>
                  <div className="flex items-start justify-between mb-4">
                    {getFileIcon(file.type)}
                    <button onClick={() => removeFile(file.id)} className="transition-colors" style={{ color: 'rgb(139, 148, 158)' }}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <h3 className="font-semibold mb-2 truncate">{file.name}</h3>
                  <p className="text-sm mb-3" style={{ color: 'rgb(139, 148, 158)' }}>{file.size}</p>
                  <div className="flex gap-2">
                    <button className="flex-1 px-4 py-2 rounded-lg transition-colors text-sm" style={{ backgroundColor: 'rgb(38, 41, 46)', color: 'rgb(230, 237, 243)' }}>View</button>
                    <button className="flex-1 px-4 py-2 rounded-lg transition-colors text-sm" style={{ backgroundColor: 'rgb(38, 41, 46)', color: 'rgb(230, 237, 243)' }}>Re-index</button>
                  </div>
                </div>
              ))}
            </div>
            {files.filter(f => f.status === 'completed').length === 0 && (
              <div className="text-center py-16">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: 'rgb(88, 166, 255)' }} />
                <p style={{ color: 'rgb(139, 148, 158)' }}>No documents indexed yet. Upload and process some files to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}