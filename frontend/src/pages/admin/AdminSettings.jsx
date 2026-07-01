import React, { useState, useEffect, useRef } from 'react'; // Bổ sung useRef
import { Save, RefreshCw, Sliders, HardDrive, BrainCircuit, BookA, BellRing, Tags, Plus, Trash2, AlertTriangle, RotateCcw, Download, Upload } from 'lucide-react'; // Bổ sung Download, Upload
import toast from 'react-hot-toast';

const DEFAULT_SETTINGS = {
  ai_threshold: 0.5,
  max_upload_size_free: 5,
  data_retention_days: 30,
  custom_dictionary: 'ngộ độc, đau bụng, ruồi, thái độ, tẩy chay, dị vật, chửi, tệ',
  crisis_alert_enabled: true,
  aspect_dictionary: {
    "Món ăn": "mì cay, trà sữa, mặn, nhạt, nguội, ngon, dở, sống, cháy, chua, ngọt, đậm đà, vừa miệng, đồ ăn, nước lẩu, thịt bò, hải sản",
    "Dịch vụ": "nhân viên, bảo vệ, quản lý, thái độ, chậm, lâu, nhiệt tình, chửi, phục vụ, order, lên món, giao hàng",
    "Không gian": "máy lạnh, nóng, bẩn, dơ, sạch, chỗ để xe, ồn ào, rộng rãi, thoáng mát, nhà vệ sinh, decor, view"
  }
};

const AdminSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newAspectName, setNewAspectName] = useState('');
  
  // Ref để kích hoạt thẻ input file ẩn
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const adminId = localStorage.getItem('userId');
        const res = await fetch(`http://localhost:8000/api/admin/settings?admin_id=${adminId}`);
        if (!res.ok) throw new Error('Lỗi từ phía máy chủ');
        const data = await res.json();
        
        if (data) {
           const loadedAspects = data.aspect_dictionary || {};
           const uiAspects = {};
           Object.keys(loadedAspects).forEach(k => {
              uiAspects[k] = Array.isArray(loadedAspects[k]) ? loadedAspects[k].join(', ') : loadedAspects[k];
           });

           const fetchedData = {
             ai_threshold: data.ai_threshold ?? 0.75,
             max_upload_size_free: data.max_upload_size_free ?? 5,
             data_retention_days: data.data_retention_days ?? 30,
             custom_dictionary: data.custom_dictionary ?? '',
             crisis_alert_enabled: data.crisis_alert_enabled ?? true,
             aspect_dictionary: uiAspects
           };
           
           setSettings(fetchedData);
           setOriginalSettings(fetchedData);
        }
      } catch (error) {
        console.error('Lỗi tải settings:', error);
        toast.error('Không thể tải cấu hình hiện tại từ máy chủ.', {
          id: 'admin-settings-load-error',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              (name === 'ai_threshold' || name === 'max_upload_size_free' || name === 'data_retention_days') ? parseFloat(value) || 0 : value
    }));
  };

  const handleAspectKeywordsChange = (aspectName, textValue) => {
    setSettings(prev => ({
      ...prev,
      aspect_dictionary: {
        ...prev.aspect_dictionary,
        [aspectName]: textValue 
      }
    }));
  };

  const handleAddAspect = (e) => {
    e.preventDefault();
    const nameClean = newAspectName.trim();
    if (!nameClean) {
      toast.error('Tên khía cạnh không được trống.');
      return;
    }
    if (settings.aspect_dictionary[nameClean]) {
      toast.error('Khía cạnh này đã tồn tại rồi.');
      return;
    }
    setSettings(prev => ({
      ...prev,
      aspect_dictionary: {
        ...prev.aspect_dictionary,
        [nameClean]: '' 
      }
    }));
    setNewAspectName('');
  };

  const handleRemoveAspect = (aspectName) => {
    setSettings(prev => {
      const updatedDict = { ...prev.aspect_dictionary };
      delete updatedDict[aspectName];
      return { ...prev, aspect_dictionary: updatedDict };
    });
  };

  const handleResetDefaults = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt về mặc định gốc? Các thay đổi chưa lưu sẽ bị xóa bỏ.')) {
      setSettings(DEFAULT_SETTINGS);
      toast.success('Đã tải lại cấu hình mặc định. Vui lòng bấm Lưu để áp dụng!');
    }
  };

  // ==========================================
  // HÀM XUẤT (EXPORT) FILE JSON
  // ==========================================
  const handleExportConfig = () => {
    try {
      // Ép kiểu dữ liệu thành chuỗi JSON đẹp mắt (thụt lề 2 space)
      const dataStr = JSON.stringify(settings, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Tạo một thẻ <a> ẩn để kích hoạt tải xuống
      const link = document.createElement('a');
      link.href = url;
      // Đặt tên file có kèm ngày tháng hiện tại
      link.download = `almotion-config-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();

      // Dọn dẹp rác bộ nhớ
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Đã xuất file cấu hình thành công!');
    } catch (error) {
      console.error("Lỗi xuất file:", error);
      toast.error('Không thể xuất cấu hình.');
    }
  };

  // ==========================================
  // HÀM NHẬP (IMPORT) FILE JSON
  // ==========================================
  const handleImportClick = () => {
    // Gọi sự kiện click của thẻ input type="file" ẩn
    fileInputRef.current?.click();
  };

  const handleImportFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Kiểm tra sơ bộ xem file JSON có đúng cấu trúc của mình không
        if (importedData && typeof importedData === 'object' && importedData.hasOwnProperty('ai_threshold')) {
           setSettings(prev => ({ ...prev, ...importedData }));
           toast.success('Đã nhập cấu hình! Vui lòng kiểm tra lại và bấm Lưu để áp dụng.');
           // Reset lại value để có thể import cùng 1 file nhiều lần nếu muốn
           event.target.value = null;
        } else {
           toast.error('File không đúng định dạng cấu hình của Almotion.');
        }
      } catch (error) {
        console.error("Lỗi đọc file JSON:", error);
        toast.error('File JSON không hợp lệ hoặc bị hỏng.');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (settings.ai_threshold < 0 || settings.ai_threshold > 1) {
      toast.error('Ngưỡng tự tin AI phải nằm trong khoảng 0.0 - 1.0');
      return;
    }

    const finalAspectDict = {};
    Object.keys(settings.aspect_dictionary).forEach(key => {
      const val = settings.aspect_dictionary[key];
      finalAspectDict[key] = Array.from(new Set(
        val.split(',').map(item => item.trim().toLowerCase()).filter(item => item !== '')
      ));
    });

    const finalCustomDict = Array.from(new Set(
      settings.custom_dictionary.split(',').map(item => item.trim().toLowerCase()).filter(item => item !== '')
    )).join(', ');

    const payload = { 
      ...settings, 
      custom_dictionary: finalCustomDict,
      aspect_dictionary: finalAspectDict 
    };

    try {
      setIsSaving(true);
      const adminId = localStorage.getItem('userId');
      const res = await fetch('http://localhost:8000/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, admin_id: adminId })
      });

      if (!res.ok) throw new Error('Lỗi cập nhật API');
      
      const savedUiAspects = {};
      Object.keys(finalAspectDict).forEach(k => {
         savedUiAspects[k] = finalAspectDict[k].join(', ');
      });
      const savedSettings = { ...payload, aspect_dictionary: savedUiAspects };
      
      setSettings(savedSettings);
      setOriginalSettings(savedSettings);
      toast.success('Lưu cấu hình hệ thống thành công!');
    } catch (error) {
      console.error("Lỗi lưu settings:", error);
      toast.error('Có lỗi xảy ra khi lưu thay đổi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 max-w-6xl animate-pulse">
        <div className="w-64 h-8 bg-slate-800 rounded"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="h-48 bg-slate-800/50 rounded-2xl border border-slate-700"></div>
           <div className="h-48 bg-slate-800/50 rounded-2xl border border-slate-700"></div>
           <div className="h-64 bg-slate-800/50 rounded-2xl border border-slate-700 lg:col-span-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl animate-in fade-in duration-500 font-sans">
      
      {/* THẺ INPUT FILE ẨN (Dùng cho tính năng Import) */}
      <input 
        type="file" 
        accept=".json" 
        ref={fileInputRef} 
        onChange={handleImportFile} 
        className="hidden" 
      />

      {/* HEADER CỦA TRANG */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-wide text-white flex items-center gap-3">
            Cài đặt Hệ thống <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs border border-indigo-500/30">MLOps</span>
          </h1>
          <p className="text-sm text-slate-400">Quản lý cấu hình AI, bảo mật dữ liệu và từ điển phân tích đa ngành.</p>
        </div>
        
        {/* NÚT ACTION (Import, Export, Reset, Save) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto">
          
          <div className="flex items-center gap-2 mr-0 sm:mr-2 border-r border-slate-700/50 pr-0 sm:pr-4">
            <button
              onClick={handleImportClick}
              type="button"
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-sm transition-all border border-slate-700"
              title="Nhập cấu hình từ file JSON"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">Nhập file</span>
            </button>

            <button
              onClick={handleExportConfig}
              type="button"
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-sm transition-all border border-slate-700"
              title="Xuất cấu hình hiện tại ra file JSON"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Xuất file</span>
            </button>
          </div>

          <button
            onClick={handleResetDefaults}
            type="button"
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-sm transition-all border border-slate-700"
            title="Khôi phục mặc định gốc"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={handleSubmit}
            disabled={!isDirty || isSaving}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 font-medium rounded-lg text-sm transition-all duration-300 ${
              isDirty 
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-slate-950' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isSaving ? (
              <><RefreshCw size={16} className="animate-spin" /> Đang lưu...</>
            ) : (
              <>
                <Save size={16} /> 
                {isDirty ? 'Lưu thay đổi' : 'Đã đồng bộ'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ... CÁC KHỐI GRID Ở DƯỚI GIỮ NGUYÊN ... */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: CÀI ĐẶT CẤU HÌNH AI */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><BrainCircuit size={20} /></div>
            <h2 className="text-base font-semibold text-slate-200">Cài đặt cấu hình AI (AI Logic)</h2>
          </div>
          <div className="p-6 flex-1 space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-medium text-slate-300">Ngưỡng độ nhạy phân tích (Thresholds)</label>
                <span className="px-3 py-1 rounded-md bg-slate-900 text-indigo-400 font-mono text-sm border border-slate-700">
                  {(settings.ai_threshold * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-6">Điều chỉnh điểm số để phân loại Tích cực / Trung tính / Tiêu cực.</p>
              
              <input
                id="ai_threshold" name="ai_threshold" type="range" min="0" max="1" step="0.01"
                value={settings.ai_threshold} onChange={handleChange}
                className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs font-medium mt-3">
                <span className="text-rose-400">Thiên về Tiêu cực</span>
                <span className="text-emerald-400">Thiên về Tích cực</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: QUẢN LÝ DỮ LIỆU */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><HardDrive size={20} /></div>
            <h2 className="text-base font-semibold text-slate-200">Quản lý Tài nguyên (Data Limit)</h2>
          </div>
          <div className="p-6 flex-1 space-y-6">
            <div>
              <label htmlFor="max_upload_size_free" className="text-sm font-medium text-slate-300 block mb-2">
                Dung lượng file tối đa (MB)
              </label>
              <p className="text-xs text-slate-500 mb-4">Giới hạn dung lượng upload cho tài khoản gói Free để bảo vệ máy chủ.</p>
              <div className="relative">
                <input
                  id="max_upload_size_free" name="max_upload_size_free" type="number" step="1" min="1" required
                  value={settings.max_upload_size_free} onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono font-bold">MB</div>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-700/50">
              <label htmlFor="data_retention_days" className="text-sm font-medium text-slate-300 block mb-2">
                Thời gian lưu trữ dữ liệu (Data Retention)
              </label>
              <p className="text-xs text-slate-500 mb-4">Tự động xóa các phân tích cũ hơn số ngày này để tối ưu Database.</p>
              <div className="relative">
                <input
                  id="data_retention_days" name="data_retention_days" type="number" step="1" min="1" required
                  value={settings.data_retention_days} onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono font-bold">NGÀY</div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: CẢNH BÁO KHỦNG HOẢNG */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400"><AlertTriangle size={20} /></div>
              <h2 className="text-base font-semibold text-slate-200">Hệ thống Cảnh báo Khủng hoảng (Crisis Alerts)</h2>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0" title="Bật/Tắt Cảnh báo đỏ">
              <input 
                type="checkbox" name="crisis_alert_enabled"
                checked={settings.crisis_alert_enabled} onChange={handleChange}
                className="sr-only peer" 
              />
              <div className="w-12 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>
          
          <div className="p-6">
            <label htmlFor="custom_dictionary" className="text-sm font-medium text-slate-300 block mb-2">
              Từ điển nhạy cảm tùy chỉnh (Custom Stop-words)
            </label>
            <p className="text-xs text-slate-500 mb-4">
              Hệ thống sẽ dựa vào danh sách này để tự động cắm cờ "Cần xử lý khẩn cấp". Các từ trùng lặp sẽ tự động bị xóa khi Lưu.
            </p>
            <textarea
              id="custom_dictionary" name="custom_dictionary" rows="2"
              value={settings.custom_dictionary} onChange={handleChange}
              placeholder="Ví dụ: ngộ độc, có giòi, ruồi, thái độ lồi lõm..."
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all leading-relaxed resize-y"
            />
          </div>
        </div>

        {/* CARD 4: TỪ ĐIỂN KHÍA CẠNH ĐA NGÀNH */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Tags size={20} /></div>
              <div>
                <h2 className="text-base font-semibold text-slate-200">Từ điển Khía cạnh (Aspect MLOps)</h2>
                <p className="text-xs text-slate-400 font-normal mt-0.5">Định nghĩa các nhóm thực thể cần bóc tách thông tin.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input 
                type="text" value={newAspectName} onChange={(e) => setNewAspectName(e.target.value)}
                placeholder="Tên nhóm mới (VD: Giá cả)..."
                className="bg-slate-900 border border-slate-700 text-sm text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 w-full sm:w-56"
              />
              <button 
                type="button" onClick={handleAddAspect} 
                className="px-4 py-2.5 bg-slate-700 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1.5 text-sm transition-colors shrink-0"
              >
                <Plus size={16} /> Thêm
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.keys(settings.aspect_dictionary).length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-700 rounded-xl">
                  <p className="text-slate-500 text-sm">Chưa có khía cạnh nào được định nghĩa.</p>
                </div>
              ) : (
                Object.keys(settings.aspect_dictionary).map((aspectName) => {
                  const kws = settings.aspect_dictionary[aspectName];
                  const displayValue = Array.isArray(kws) ? kws.join(', ') : kws;
                  return (
                    <div key={aspectName} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 group/row hover:border-slate-600 transition-colors">
                      <div className="w-full sm:w-1/4 sm:min-w-[150px]">
                        <span className="text-sm font-medium text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 block text-center truncate shadow-sm">
                          {aspectName}
                        </span>
                      </div>
                      <div className="flex-1 w-full relative">
                        <input 
                          type="text"
                          value={displayValue}
                          onChange={(e) => handleAspectKeywordsChange(aspectName, e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-all pr-10"
                          placeholder="Nhập các từ khóa từ cách nhau bằng dấu phẩy..."
                        />
                        <BookA size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      </div>
                      <button 
                        type="button" onClick={() => handleRemoveAspect(aspectName)}
                        className="p-2.5 text-slate-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all sm:opacity-0 group-hover/row:opacity-100 self-end sm:self-auto shrink-0 border border-transparent hover:border-rose-600"
                        title={`Xóa danh mục ${aspectName}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};

export default AdminSettings;
