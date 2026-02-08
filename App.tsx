import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Eye, BookOpen, Zap } from 'lucide-react';
import { 
  fetchQuestions, 
  saveQuestion, 
  uploadQuestionImage, 
  updateQuestionInDb, 
  removeQuestion 
} from './firebase';
import { Question, ViewMode, Solution } from './types';
import DrawingCanvas from './components/DrawingCanvas';
import SignaturePad from 'signature_pad';

const App: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>('list');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Add mode
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string>('');
  const [newSubject, setNewSubject] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  // Solve mode
  const [selectedChoice, setSelectedChoice] = useState('');
  const [penColor, setPenColor] = useState('#3b82f6');
  const padRef = useRef<SignaturePad | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchQuestions();
      setQuestions(data);
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImage || !newAnswer) return alert("Lütfen görsel ve cevap seçiniz!");
    
    setLoading(true);
    try {
      const { url, path } = await uploadQuestionImage(newImage);
      await saveQuestion({
        imgUrl: url,
        storagePath: path,
        subject: newSubject,
        topic: newTopic,
        answer: newAnswer,
        level: 3,
        solutions: []
      });
      alert("Soru başarıyla eklendi!");
      setNewImage(null);
      setNewPreview('');
      setNewAnswer('');
      setNewSubject('');
      setNewTopic('');
      loadData();
      setMode('list');
    } catch (error) {
      console.error("Error adding question:", error);
      alert("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (q: Question) => {
    if (!window.confirm("Silmek istediğinize emin misiniz?")) return;
    setLoading(true);
    try {
      await removeQuestion(q.id, q.storagePath);
      loadData();
    } catch (error) {
      console.error("Error deleting question:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSolution = async () => {
    if (!selectedQuestion || !selectedChoice || !padRef.current) {
      return alert("Lütfen bir seçenek işaretleyin!");
    }

    const isCorrect = selectedChoice === selectedQuestion.answer;
    const newSolution: Solution = {
      draw: padRef.current.toDataURL(),
      isCorrect,
      selected: selectedChoice,
      date: new Date().toISOString()
    };

    const updatedSolutions = [...selectedQuestion.solutions, newSolution];
    let newLevel = selectedQuestion.level;
    if (isCorrect && newLevel > 1) newLevel--;

    setLoading(true);
    try {
      await updateQuestionInDb(selectedQuestion.id, { 
        solutions: updatedSolutions, 
        level: newLevel 
      });
      alert(isCorrect ? "✓ Doğru!" : `✗ Yanlış! Cevap: ${selectedQuestion.answer}`);
      loadData();
      setMode('list');
    } catch (error) {
      console.error("Error saving solution:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q =>
    q.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Soru Çözüm</h1>
          </div>
          {mode === 'list' && (
            <button 
              onClick={() => setMode('add')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-semibold transition"
            >
              <Plus className="w-5 h-5" /> Yeni Soru
            </button>
          )}
          {mode !== 'list' && (
            <button 
              onClick={() => setMode('list')}
              className="text-slate-300 hover:text-white transition"
            >
              ← Geri
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading && (
          <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center backdrop-blur-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {mode === 'list' && (
          <div className="space-y-6">
            {/* Search */}
            <input 
              placeholder="Ders veya konu ara..." 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />

            {/* Questions Grid */}
            {filteredQuestions.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <p className="text-lg">Soru bulunamadı</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredQuestions.map(q => (
                  <div key={q.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500 transition group">
                    {/* Image */}
                    <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                      <img src={q.imgUrl} alt="Question" className="w-full h-full object-contain" />
                      <div className="absolute top-2 right-2 bg-slate-900/80 px-2 py-1 rounded text-xs font-bold text-amber-400">
                        L{q.level}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-bold">{q.subject}</p>
                        <p className="text-sm font-semibold text-white truncate">{q.topic}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { 
                            setSelectedQuestion(q); 
                            setSelectedChoice(''); 
                            setMode('solve');
                          }}
                          className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white py-2 rounded-lg font-semibold transition text-sm flex items-center justify-center gap-1"
                        >
                          <Zap className="w-4 h-4" /> Çöz
                        </button>
                        <button 
                          onClick={() => { setSelectedQuestion(q); setMode('history'); }}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg font-semibold transition text-sm flex items-center justify-center gap-1"
                        >
                          <Eye className="w-4 h-4" /> Geçmiş
                        </button>
                        <button 
                          onClick={() => handleDeleteQuestion(q)}
                          className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-2 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'add' && (
          <div className="max-w-xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-white">Yeni Soru Ekle</h2>
            <form onSubmit={handleAddQuestion} className="space-y-6">
              {/* Image Upload */}
              <div 
                className="border-2 border-dashed border-slate-700 rounded-xl aspect-video flex flex-col items-center justify-center gap-4 bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer"
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                {newPreview ? (
                  <img src={newPreview} className="w-full h-full object-contain" alt="Preview" />
                ) : (
                  <>
                    <Plus className="w-12 h-12 text-slate-600" />
                    <p className="text-slate-500 font-medium text-center">Görsel seçin/sürükleyin</p>
                  </>
                )}
                <input 
                  id="fileInput"
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewImage(file);
                      setNewPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <input 
                  placeholder="Ders" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 outline-none transition"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  required
                />
                <input 
                  placeholder="Konu" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 outline-none transition"
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  required
                />
              </div>

              {/* Answer Buttons */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400">Doğru Cevap</label>
                <div className="flex gap-3">
                  {['A', 'B', 'C', 'D', 'E'].map(letter => (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setNewAnswer(letter)}
                      className={`flex-1 py-3 rounded-lg font-bold border-2 transition ${
                        newAnswer === letter 
                        ? 'bg-blue-600 border-blue-600 text-white scale-105' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold transition disabled:opacity-50"
              >
                {loading ? "Yükleniyor..." : "Soruyu Kaydet"}
              </button>
            </form>
          </div>
        )}

        {mode === 'solve' && selectedQuestion && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-400">{selectedQuestion.subject}</p>
              <p className="text-lg font-bold text-white">{selectedQuestion.topic}</p>
            </div>

            {/* Drawing Canvas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white">Çözümünüzü çizin</label>
                <div className="flex gap-2">
                  {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#ffffff'].map(c => (
                    <button 
                      key={c}
                      onClick={() => setPenColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition ${penColor === c ? 'border-white scale-125' : 'border-transparent'}`}
                      style={{ background: c }}
                    />
                  ))}
                  <button 
                    onClick={() => padRef.current?.clear()}
                    className="ml-2 text-xs font-bold text-slate-400 hover:text-white transition"
                  >
                    Sil
                  </button>
                </div>
              </div>
              <DrawingCanvas 
                backgroundImage={selectedQuestion.imgUrl}
                penColor={penColor}
                onInit={(pad) => { padRef.current = pad; }}
                className="max-h-96"
              />
            </div>

            {/* Answer Selection */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-white">Seçeneğiniz</label>
              <div className="flex gap-2">
                {['A', 'B', 'C', 'D', 'E'].map(letter => (
                  <button
                    key={letter}
                    onClick={() => setSelectedChoice(letter)}
                    className={`flex-1 py-3 rounded-lg font-bold border-2 transition ${
                      selectedChoice === letter 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleSaveSolution}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold transition"
            >
              Çözümü Kaydet
            </button>
          </div>
        )}

        {mode === 'history' && selectedQuestion && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Çözüm Geçmişi</h2>
            <p className="text-slate-400">{selectedQuestion.subject} / {selectedQuestion.topic}</p>

            {selectedQuestion.solutions.length === 0 ? (
              <p className="text-center text-slate-500 py-10">Henüz çözüm yok</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedQuestion.solutions.slice().reverse().map((sol, idx) => (
                  <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between bg-slate-900 p-3 border-b border-slate-700">
                      <span className={`text-sm font-bold uppercase ${sol.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {sol.isCorrect ? '✓ Doğru' : '✗ Yanlış'} ({sol.selected})
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(sol.date).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <div 
                      className="aspect-video bg-black bg-cover bg-center relative"
                      style={{ backgroundImage: `url('${selectedQuestion.imgUrl}')` }}
                    >
                      <img src={sol.draw} className="absolute inset-0 w-full h-full object-contain" alt="Solution" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 text-center text-slate-500 text-sm py-4 mt-12">
        <p>© 2024 Soru Çözüm Uygulaması • Firebase Firestore & Storage</p>
      </footer>
    </div>
  );
};

export default App;
