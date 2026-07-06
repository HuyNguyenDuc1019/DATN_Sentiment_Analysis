import { BookA, Plus, Tags, Trash2 } from 'lucide-react';

export default function AspectDictionaryCard({
  settings,
  newAspectName,
  onNewAspectNameChange,
  onAddAspect,
  onAspectKeywordsChange,
  onRemoveAspect,
}) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden lg:col-span-2">
      <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <Tags size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-200">Từ điển Khía cạnh (Aspect MLOps)</h2>
            <p className="text-xs text-slate-400 font-normal mt-0.5">Định nghĩa các nhóm thực thể cần bóc tách thông tin.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={newAspectName}
            onChange={(event) => onNewAspectNameChange(event.target.value)}
            placeholder="Tên nhóm mới (VD: Giá cả)..."
            className="bg-slate-900 border border-slate-700 text-sm text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 w-full sm:w-56"
          />
          <button
            type="button"
            onClick={onAddAspect}
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
              const keywords = settings.aspect_dictionary[aspectName];
              const displayValue = Array.isArray(keywords) ? keywords.join(', ') : keywords;

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
                      onChange={(event) => onAspectKeywordsChange(aspectName, event.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-all pr-10"
                      placeholder="Nhập các từ khóa từ cách nhau bằng dấu phẩy..."
                    />
                    <BookA size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveAspect(aspectName)}
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
  );
}
