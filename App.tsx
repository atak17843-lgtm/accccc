
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PlusCircle, 
  Search, 
  History, 
  Trash2, 
  FileCheck, 
  ArrowLeft, 
  Save, 
  Download,
  Upload,
  Trophy,
  Filter
} from 'lucide-react';
import { 
  fetchQuestions, 
  saveQuestion, 
  uploadQuestionImage, 
  updateQuestionInDb, 
  removeQuestion 
} from './firebase';
import { Question, ViewMode, ExamResult, Solution } from './types';
import DrawingCanvas from './components/DrawingCanvas';
import SignaturePad from 'signature_pad';

const App: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>('list');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterCount, setFilterCount] = useState(5);

  // Add Mode State
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string>('');
  const [newSubject, setNewSubject] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  // Solve Mode State
  const [selectedChoice, setSelectedChoice] = useState('');
  const [penColor, setPenColor] = useState('#5b8cff');
  const padRef = useRef<SignaturePad | null>(null);

  // Exam Mode State
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [examIndex, setExamIndex] = useState(0);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!window.confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
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
      return alert("Lütfen bir şık seçin ve çözüm yapın!");
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
      alert(isCorrect ? "Doğru!" : `Yanlış! Doğru cevap: ${selectedQuestion.answer}`);
      loadData();
      setMode('list');
    } catch (error) {
      console.error("Error saving solution:", error);
    } finally {
      setLoading(false);
    }
  };

  const startExam = () => {
    let filtered = questions.filter(q =>
      (!filterSubject || q.subject.toLowerCase().includes(filterSubject.toLowerCase())) &&
      (!filterTopic || q.topic.toLowerCase().includes(filterTopic.toLowerCase())) &&
      (!filterLevel || q.level === parseInt(filterLevel))
    );
    if (filtered.length === 0) return alert("Soru bulunamadı!");
    
    setExamQuestions(filtered.sort(() => Math.random() - 0.5).slice(0, filterCount));
    setExamIndex(0);
    setExamResults([]);
    setMode('exam');
  };

  const handleNextExamQuestion = async () => {
    if (!selectedChoice || !padRef.current) return alert("Lütfen cevaplayın!");
    
    const q = examQuestions[examIndex];
    const isCorrect = selectedChoice === q.answer;
    
    const result: ExamResult = {
      question: q,
      selected: selectedChoice,
      isCorrect,
      draw: padRef.current.toDataURL()
    };

    const updatedResults = [...examResults, result];
    setExamResults(updatedResults);
    
    if (examIndex + 1 < examQuestions.length) {
      setExamIndex(examIndex + 1);
      setSelectedChoice('');
      padRef.current.clear();
    } else {
      // Sınav bitti, sonuçları kaydet
      setLoading(true);
      for (const res of updatedResults) {
        const qRef = questions.find(x => x.id === res.question.id);
        if (qRef) {
          const newSol: Solution = {
            draw: res.draw,
            isCorrect: res.isCorrect,
            selected: res.selected,
            date: new Date().toISOString()
          };
          let newL = qRef.level;
          if (res.isCorrect && newL > 1) newL--;
          await updateQuestionInDb(qRef.id, {
            solutions: [...qRef.solutions, newSol],
            level: newL
          });
        }
      }
      loadData();
      setMode('examResult');
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q =>
    (!filterSubject || q.subject.toLowerCase().includes(filterSubject.toLowerCase())) &&
    (!filterTopic || q.topic.toLowerCase().includes(filterTopic.toLowerCase())) &&
    (!filterLevel || q.level === parseInt(filterLevel))
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-extrabold text-blue-500 tracking-tight flex items-center gap-2">
          <FileCheck className="w-8 h-8" />
          Soru Çözüm App
        </h1>
        <div className="flex gap-2">
          {mode === 'list' ? (
            <>
              <button 
                onClick={() => setMode('add')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium transition"
              >
                <PlusCircle className="w-5 h-5" /> Yeni Soru
              </button>
              <button 
                onClick={() => {
                  const data = JSON.stringify(questions, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `sorular_${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                }}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg font-medium transition text-slate-300"
              >
                <Download className="w-5 h-5" /> Dışa Aktar
              </button>
            </>
          ) : (
            <button 
              onClick={() => setMode('list')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg font-medium transition text-slate-300"
            >
              <ArrowLeft className="w-5 h-5" /> Geri Dön
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 min-h-[600px] shadow-2xl relative">
        {loading && (
          <div className="absolute inset-0 bg-slate-950/40 z-50 flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {mode === 'list' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <input 
                placeholder="Ders Ara..." 
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition"
                value={filterSubject}
                onChange={e => setFilterSubject(e.target.value)}
              />
              <input 
                placeholder="Konu Ara..." 
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition"
                value={filterTopic}
                onChange={e => setFilterTopic(e.target.value)}
              />
              <select 
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition"
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
              >
                <option value="">Seviye Tümü</option>
                <option value="1">Kolay (1)</option>
                <option value="2">Orta (2)</option>
                <option value="3">Zor (3)</option>
              </select>
              <div className="flex gap-2">
                 <input 
                  type="number" 
                  min="1" 
                  max="50" 
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition w-20"
                  value={filterCount}
                  onChange={e => setFilterCount(parseInt(e.target.value))}
                />
                <button 
                  onClick={startExam}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-3 py-2 font-bold transition flex items-center justify-center gap-1"
                >
                  <Trophy className="w-4 h-4" /> Sınav Başlat
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredQuestions.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-500">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Aradığınız kriterlerde soru bulunamadı.</p>
                </div>
              ) : (
                filteredQuestions.map(q => (
                  <div key={q.id} className="bg-slate-800/80 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition group flex flex-col">
                    <div className="aspect-video bg-black flex items-center justify-center relative">
                      <img src={q.imgUrl} alt="Question" className="max-h-full object-contain" />
                      <div className="absolute top-2 right-2 bg-slate-900/80 px-2 py-1 rounded text-xs font-bold text-amber-400">
                        Seviye {q.level}
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="mb-4">
                        <h3 className="text-sm text-slate-400 uppercase font-bold">{q.subject}</h3>
                        <p className="text-lg font-semibold truncate">{q.topic}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setSelectedQuestion(q); setSelectedChoice(''); setMode('solve'); }}
                          className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white py-2 rounded-lg font-semibold transition text-sm"
                        >
                          Çöz
                        </button>
                        <button 
                          onClick={() => { setSelectedQuestion(q); setMode('history'); }}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg font-semibold transition text-sm flex items-center justify-center gap-1"
                        >
                          <History className="w-4 h-4" /> Geçmiş
                        </button>
                        <button 
                          onClick={() => handleDeleteQuestion(q)}
                          className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white p-2 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {mode === 'add' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-blue-400">Yeni Soru Yükle</h2>
            <form onSubmit={handleAddQuestion} className="space-y-6">
              <div 
                className="border-2 border-dashed border-slate-700 rounded-2xl aspect-video flex flex-col items-center justify-center gap-4 bg-slate-800/30 hover:bg-slate-800/50 transition cursor-pointer relative overflow-hidden"
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                {newPreview ? (
                  <img src={newPreview} className="absolute inset-0 w-full h-full object-contain" alt="Preview" />
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-600" />
                    <p className="text-slate-500 font-medium text-center">Tıklayın veya görseli sürükleyin</p>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 ml-1">Ders</label>
                  <input 
                    placeholder="Örn: Matematik" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition"
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 ml-1">Konu</label>
                  <input 
                    placeholder="Örn: Trigonometri" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition"
                    value={newTopic}
                    onChange={e => setNewTopic(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-400 ml-1 block">Doğru Cevap Seçin</label>
                <div className="flex gap-4">
                  {['A', 'B', 'C', 'D', 'E'].map(letter => (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setNewAnswer(letter)}
                      className={`flex-1 py-4 rounded-xl font-black text-xl border-2 transition ${
                        newAnswer === letter 
                        ? 'bg-amber-500 border-amber-500 text-slate-950 scale-105 shadow-lg shadow-amber-500/20' 
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
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-900/20 transition disabled:opacity-50"
              >
                {loading ? "Yükleniyor..." : "Soruyu Kaydet"}
              </button>
            </form>
          </div>
        )}

        {(mode === 'solve' || mode === 'exam') && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-blue-400">
                {mode === 'exam' ? `Sınav Modu: Soru ${examIndex + 1}/${examQuestions.length}` : "Soru Çözümü"}
              </h2>
              <div className="flex items-center gap-4 bg-slate-800 p-2 rounded-xl">
                <span className="text-xs font-bold text-slate-400 ml-2">Kalem:</span>
                <div className="flex gap-1.5">
                  {['#5b8cff', '#ff5c5c', '#4caf50', '#ffb347', '#fff'].map(c => (
                    <button 
                      key={c}
                      onClick={() => setPenColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition ${penColor === c ? 'border-white scale-125' : 'border-transparent'}`}
                      style={{ background: c }}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={penColor}
                    onChange={e => setPenColor(e.target.value)}
                    className="w-6 h-6 bg-transparent border-none cursor-pointer p-0"
                  />
                </div>
                <button 
                  onClick={() => padRef.current?.clear()}
                  className="ml-2 text-xs font-bold text-blue-400 hover:text-blue-300"
                >
                  TEMİZLE
                </button>
              </div>
            </div>

            <DrawingCanvas 
              backgroundImage={mode === 'exam' ? examQuestions[examIndex].imgUrl : selectedQuestion?.imgUrl}
              penColor={penColor}
              onInit={(pad) => { padRef.current = pad; }}
              className="max-h-[60vh]"
            />

            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-400 block text-center">Cevabınızı İşaretleyin</label>
              <div className="flex gap-2 max-w-xl mx-auto">
                {['A', 'B', 'C', 'D', 'E'].map(letter => (
                  <button
                    key={letter}
                    onClick={() => setSelectedChoice(letter)}
                    className={`flex-1 py-3 rounded-lg font-bold border-2 transition ${
                      selectedChoice === letter 
                      ? 'bg-blue-600 border-blue-600 text-white scale-105' 
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center pt-4">
              {mode === 'solve' ? (
                <button 
                  onClick={handleSaveSolution}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-3 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transition"
                >
                  Çözümü Kaydet
                </button>
              ) : (
                <button 
                  onClick={handleNextExamQuestion}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-10 py-3 rounded-xl font-bold text-lg shadow-lg shadow-amber-900/20 transition"
                >
                  {examIndex + 1 === examQuestions.length ? "Sınavı Bitir" : "Sonraki Soru"}
                </button>
              )}
            </div>
          </div>
        )}

        {mode === 'history' && selectedQuestion && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-blue-400">Çözüm Geçmişi</h2>
                <div className="text-slate-400 text-sm">
                  {selectedQuestion.subject} / {selectedQuestion.topic}
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {selectedQuestion.solutions.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-slate-600">
                    Bu soruya henüz çözüm yapılmamış.
                  </div>
                ) : (
                  selectedQuestion.solutions.slice().reverse().map((sol, idx) => (
                    <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold px-1">
                        <span className={`${sol.isCorrect ? 'text-green-500' : 'text-red-500'} uppercase`}>
                          {sol.isCorrect ? 'Doğru' : 'Yanlış'} ({sol.selected})
                        </span>
                        <span className="text-slate-500">
                          {new Date(sol.date).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      <div 
                        className="aspect-video bg-slate-900 rounded-xl relative overflow-hidden bg-contain bg-no-repeat bg-center"
                        style={{ backgroundImage: `url('${selectedQuestion.imgUrl}')` }}
                      >
                         <img src={sol.draw} className="absolute inset-0 w-full h-full object-contain z-10" alt="Solution" />
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {mode === 'examResult' && (
          <div className="text-center space-y-8 py-10">
            <div className="space-y-2">
              <Trophy className="w-20 h-20 text-amber-500 mx-auto" />
              <h2 className="text-4xl font-black text-white">Sınav Tamamlandı!</h2>
            </div>
            
            <div className="flex justify-center gap-12 text-2xl font-bold">
              <div className="text-green-500">
                <div className="text-sm uppercase tracking-widest opacity-60">Doğru</div>
                {examResults.filter(r => r.isCorrect).length}
              </div>
              <div className="text-red-500">
                <div className="text-sm uppercase tracking-widest opacity-60">Yanlış</div>
                {examResults.filter(r => !r.isCorrect).length}
              </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              <h3 className="text-xl font-bold text-slate-300 text-left">Detaylı Analiz</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {examResults.map((res, i) => (
                  <div key={i} className={`p-4 rounded-xl border flex gap-4 bg-slate-900/80 ${res.isCorrect ? 'border-green-800/30' : 'border-red-800/30'}`}>
                    <div className="w-24 h-24 bg-black rounded-lg overflow-hidden flex-shrink-0">
                       <img src={res.question.imgUrl} className="w-full h-full object-contain" alt="Question" />
                    </div>
                    <div className="text-left flex-1">
                      <div className={`text-xs font-bold uppercase ${res.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                        {res.isCorrect ? 'Doğru' : 'Yanlış'}
                      </div>
                      <div className="font-bold text-slate-200 truncate">{res.question.topic}</div>
                      <div className="text-sm text-slate-400">Sen: {res.selected} | Cevap: {res.question.answer}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setMode('list')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-xl font-bold text-xl transition"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        )}
      </main>

      <footer className="mt-12 text-center text-slate-600 text-sm flex flex-col items-center gap-2">
         <p>© 2024 Soru Çözüm Uygulaması - Firestore & Storage ile Güçlendirilmiş</p>
         <div className="flex gap-4">
            <span className="flex items-center gap-1"><Save className="w-4 h-4" /> Firestore DB</span>
            <span className="flex items-center gap-1"><Download className="w-4 h-4" /> Storage Images</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
