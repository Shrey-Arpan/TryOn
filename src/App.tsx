import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Sparkles, 
  Trash2, 
  ChevronRight, 
  BookOpen, 
  Hash,
  Send,
  Loader2,
  X,
  Clock
} from "lucide-react";
import { Note, AIInsight } from "./types";
import { getNoteInsights, chatWithAI } from "./services/geminiService";

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiInsights, setAiInsights] = useState<AIInsight | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error("Failed to fetch notes", err);
    }
  };

  const handleSaveNote = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, content: editContent, category: "General" }),
      });
      const newNote = await res.json();
      setNotes([newNote, ...notes]);
      setSelectedNote(newNote);
      setIsEditing(false);
      analyzeNote(newNote);
    } catch (err) {
      console.error("Failed to save note", err);
    }
  };

  const handleDeleteNote = async (id: number) => {
    try {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      setNotes(notes.filter(n => n.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setAiInsights(null);
      }
    } catch (err) {
      console.error("Failed to delete note", err);
    }
  };

  const analyzeNote = async (note: Note) => {
    setIsAnalyzing(true);
    try {
      const insights = await getNoteInsights(note.content);
      setAiInsights(insights);
      
      // Update category if it changed significantly
      if (insights.category && insights.category !== note.category) {
        await fetch(`/api/notes/${note.id}/category`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: insights.category }),
        });
        setNotes(prev => prev.map(n => n.id === note.id ? { ...n, category: insights.category } : n));
      }
    } catch (err) {
      console.error("AI Analysis failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages([...chatMessages, { role: 'user', text: userMsg }]);
    setChatInput("");
    setIsChatting(true);

    try {
      const context = notes.map(n => `${n.title}: ${n.content}`).join("\n\n");
      const aiResponse = await chatWithAI(userMsg, context);
      setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (err) {
      console.error("Chat failed", err);
    } finally {
      setIsChatting(false);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-80 border-r border-border flex flex-col bg-card/30">
        <div className="p-6 border-bottom border-border">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-serif italic font-bold tracking-tight text-white">TryOwn</h1>
            <button 
              onClick={() => {
                setIsEditing(true);
                setSelectedNote(null);
                setEditTitle("");
                setEditContent("");
                setAiInsights(null);
              }}
              className="p-2 bg-accent hover:bg-accent/80 rounded-full transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Search notes..." 
              className="w-full bg-white/5 border border-border rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {filteredNotes.map(note => (
            <motion.div
              layout
              key={note.id}
              onClick={() => {
                setSelectedNote(note);
                setIsEditing(false);
                analyzeNote(note);
              }}
              className={`p-4 rounded-xl cursor-pointer transition-all border ${
                selectedNote?.id === note.id 
                  ? "bg-accent/10 border-accent/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                  : "bg-white/5 border-transparent hover:border-white/10"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium text-sm truncate pr-4">{note.title}</h3>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(note.id);
                  }}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{note.content}</p>
              <div className="mt-3 flex items-center text-[10px] text-gray-500 space-x-3">
                <span className="flex items-center"><Clock size={10} className="mr-1" /> {new Date(note.created_at).toLocaleDateString()}</span>
                <span className="flex items-center uppercase tracking-widest font-mono opacity-60">{note.category}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col p-12 max-w-4xl mx-auto w-full"
            >
              <input 
                autoFocus
                type="text" 
                placeholder="Note Title" 
                className="text-5xl font-serif italic bg-transparent border-none focus:outline-none mb-8 placeholder:opacity-20"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <textarea 
                placeholder="Start writing your thoughts..." 
                className="flex-1 bg-transparent border-none focus:outline-none resize-none text-lg leading-relaxed placeholder:opacity-20 custom-scrollbar"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
              <div className="flex justify-end space-x-4 mt-8">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 rounded-xl border border-border hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveNote}
                  className="px-8 py-2 bg-accent hover:bg-accent/80 rounded-xl font-medium transition-all shadow-lg shadow-accent/20"
                >
                  Save Note
                </button>
              </div>
            </motion.div>
          ) : selectedNote ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col p-12 max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center space-x-2 text-accent text-xs font-mono uppercase tracking-widest mb-4 opacity-70">
                <Hash size={12} />
                <span>{selectedNote.category}</span>
              </div>
              <h2 className="text-5xl font-serif italic font-bold mb-8 text-white">{selectedNote.title}</h2>
              <div className="prose prose-invert max-w-none text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
                {selectedNote.content}
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-6 border border-accent/20">
                <BookOpen size={40} className="text-accent" />
              </div>
              <h2 className="text-2xl font-serif italic mb-2">Welcome to TryOwn</h2>
              <p className="text-gray-500 max-w-md">Select a note to view insights or create a new one to start capturing your thoughts.</p>
            </div>
          )}
        </AnimatePresence>

        {/* AI Chat Toggle */}
        <button 
          onClick={() => setShowChat(!showChat)}
          className="absolute bottom-8 right-8 w-14 h-14 bg-white text-bg rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-50"
        >
          {showChat ? <X size={24} /> : <MessageSquare size={24} />}
        </button>

        {/* AI Chat Panel */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="absolute bottom-24 right-8 w-96 h-[500px] glass-panel flex flex-col shadow-2xl z-40 overflow-hidden"
            >
              <div className="p-4 border-b border-border bg-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles size={18} className="text-accent" />
                  <span className="font-medium">TryOwn AI</span>
                </div>
                <div className="text-[10px] uppercase tracking-widest opacity-50 font-mono">Knowledge Assistant</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">Ask me anything about your notes.</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-accent text-white rounded-tr-none' 
                        : 'bg-white/10 text-gray-200 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none">
                      <Loader2 size={16} className="animate-spin text-accent" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-border bg-white/5">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Ask TryOwn..." 
                    className="w-full bg-white/5 border border-border rounded-xl py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                  />
                  <button 
                    onClick={handleChat}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-accent hover:text-white transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Insights Sidebar */}
      <aside className="w-80 border-l border-border flex flex-col bg-card/30">
        <div className="p-6 border-b border-border">
          <h2 className="flex items-center text-sm font-mono uppercase tracking-widest text-gray-400">
            <Sparkles size={14} className="mr-2 text-accent" />
            AI Insights
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 size={24} className="animate-spin mb-4 text-accent" />
              <p className="text-xs font-mono uppercase tracking-widest">Analyzing content...</p>
            </div>
          ) : aiInsights ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <section>
                <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-mono mb-3">Summary</h3>
                <p className="text-sm leading-relaxed text-gray-300">{aiInsights.summary}</p>
              </section>

              <section>
                <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-mono mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {aiInsights.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-white/5 border border-border rounded-md text-[10px] text-accent font-mono">
                      #{tag}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-mono mb-3">Suggestions</h3>
                <ul className="space-y-3">
                  {aiInsights.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start text-sm text-gray-400">
                      <ChevronRight size={14} className="mr-2 mt-1 text-accent shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
              <Sparkles size={32} className="mb-4" />
              <p className="text-xs font-mono uppercase tracking-widest">No insights available</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
