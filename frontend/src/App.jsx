import { useState } from 'react';
import axios from 'axios';
import { MessageSquare, Activity, AlertCircle } from 'lucide-react';

function App() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePredict = async () => {
    if (!inputText.trim()) {
      setError('Vui lòng nhập bình luận cần phân tích.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.post('http://localhost:8000/predict', {
        text: inputText
      });
      setResult(response.data);
    } catch (err) {
      setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại Backend.');
    } finally {
      setIsLoading(false);
    }
  };

  // Logic xử lý màu sắc dựa trên kết quả
  const isPositive = result?.label === 1;
  const resultBg = isPositive 
    ? 'bg-green-50 border-green-200 text-green-700' 
    : 'bg-red-50 border-red-200 text-red-700';
  const progressBg = isPositive ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 py-12 px-4 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Hệ thống Phân loại Cảm xúc</h1>
          <p className="text-gray-500">Phân tích bình luận tiếng Việt sử dụng mô hình AI PhoBERT</p>
        </header>

        <main className="space-y-6">
          {/* Form Nhập liệu */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4 font-semibold text-gray-700">
              <MessageSquare size={20} />
              <label>Nhập bình luận</label>
            </div>
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập bình luận về quán ăn tại đây (ví dụ: Quán ăn này phục vụ rất tốt...)"
              rows={5}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y mb-4"
            />
            
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                <AlertCircle size={16} /> 
                <span>{error}</span>
              </div>
            )}
            
            <button 
              onClick={handlePredict} 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex justify-center"
            >
              {isLoading ? 'Đang phân tích...' : 'Phân tích Cảm xúc'}
            </button>
          </section>

          {/* Khối Kết quả (Chỉ hiện khi có kết quả) */}
          {result && (
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Kết quả Phân tích</h2>
              
              <div className={`p-5 rounded-lg border ${resultBg}`}>
                <div className="flex items-center gap-3 mb-5">
                  <Activity size={24} />
                  <span className="text-2xl font-bold">
                    {isPositive ? 'Tích cực' : 'Tiêu cực'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between font-semibold text-sm">
                    <span>Độ tin cậy (Confidence Score)</span>
                    <span>{result.confidence}%</span>
                  </div>
                  {/* Thanh phần trăm (Progress Bar) */}
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${progressBg}`}
                      style={{ width: `${result.confidence}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
        
      </div>
    </div>
  );
}

export default App;