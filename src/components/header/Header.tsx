import React, { useState } from 'react';
import { APP_CONFIG } from '../../config/constants';
import { useGameStore } from '../../state/useGameStore';
import { Activity, BookOpen, X, Info, Bot, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const [showGuide, setShowGuide] = useState(false);
  const {
    ballHolder,
    currentFormation,
    defensiveSystem,
    selectedPlayer,
    actionDraft,
    offense,
    isSimulating,
    startSimulation,
    stopSimulation,
  } = useGameStore();

  const ballPos = offense[ballHolder].coord;
  const ballSide = ballPos.x < 50 ? 'Cánh Trái (Left)' : 'Cánh Phải (Right)';

  return (
    <header className="flex flex-col bg-slate-900 border-b border-slate-800 px-4 py-2.5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Project Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-wide text-white flex items-center gap-2">
              <span>{APP_CONFIG.TITLE}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                v{APP_CONFIG.VERSION}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {APP_CONFIG.SUBTITLE}
            </p>
          </div>
        </div>

        {/* Live Compact Tactical Status Bar (Rule 77) */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Bóng:</span>
            <span className="font-bold text-orange-400 font-mono px-1 bg-orange-950/40 rounded border border-orange-800/60">
              {ballHolder}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Ball-side:</span>
            <span className="font-medium text-slate-200">{ballSide}</span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Tấn công:</span>
            <span className="font-semibold text-sky-400">{currentFormation}</span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Phòng thủ:</span>
            <span className="font-semibold text-red-400">{defensiveSystem}</span>
          </div>

          {selectedPlayer && (
            <>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Đang chọn:</span>
                <span className="font-bold text-amber-400 font-mono">
                  {selectedPlayer}
                </span>
              </div>
            </>
          )}

          {actionDraft && (
            <>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5 text-emerald-400 animate-pulse font-medium">
                <span>{actionDraft.player} {actionDraft.action.toUpperCase()}</span>
              </div>
            </>
          )}
        </div>

        {/* Actions Group: AI Simulate & Guide */}
        <div className="flex items-center gap-2">
          {/* AI Simulation Button */}
          <button
            onClick={() => {
              if (isSimulating) {
                stopSimulation();
              } else {
                startSimulation();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-md active:scale-95 ${
              isSimulating
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white animate-pulse border border-red-400 ring-2 ring-red-500/50'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white border border-emerald-400/50 shadow-emerald-600/20'
            }`}
            title="Kích hoạt AI tự động tìm cách chiến thắng hàng phòng thủ đối phương"
          >
            <Bot className="w-4 h-4" />
            <span>{isSimulating ? 'Dừng Giả Lập' : 'Giả Lập AI (Simulate)'}</span>
          </button>

          {/* Help / Guide Button */}
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Hướng dẫn</span>
          </button>
        </div>
      </div>

      {/* Interactive Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">
                  Hướng Dẫn Sử Dụng Sa Bàn Chiến Thuật
                </h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
              <div>
                <h4 className="font-bold text-sky-400 text-sm mb-1">
                  1. Triết lý hệ thống
                </h4>
                <p>
                  Basketball Tactical Lab là phòng thí nghiệm sa bàn bóng rổ mô phỏng sự tương tác giữa các bài chạy tấn công và phản ứng tự động của hệ thống phòng thủ (Man-to-Man, 2-3 Zone, 3-2 Zone, 1-3-1 Zone). Tất cả 10 cầu thủ là các quân cờ chiến thuật bình đẳng, thuần túy dựa trên hình thái đội hình (Team Shape) và vị trí không gian.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sky-400 text-sm mb-1">
                  2. Cách điều khiển tấn công
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Chọn cầu thủ:</strong> Nhấp vào cầu thủ trên sân hoặc thanh chọn PG/SG/SF/PF/C.</li>
                  <li><strong>Di chuyển / Tùy chỉnh:</strong> Kéo thả cầu thủ trực tiếp trên sân (hỗ trợ lưu Custom Formation).</li>
                  <li><strong>Bài chạy có bóng:</strong> Di chuyển, Nhồi bóng, Drive Left/Right, Chuyền bóng (Pass), Ném rổ (Shoot), Trao bóng (Hand-off).</li>
                  <li><strong>Bài chạy không bóng:</strong> Cut, Backdoor Cut, Làm cản (Screen), Roll vào rổ, Pop ra 3 điểm, Relocate.</li>
                  <li><strong>Xác nhận đường chạy:</strong> Sau khi chọn bài, nhấp trên sân để tinh chỉnh điểm đến rồi bấm <strong>Xác nhận</strong>.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-sky-400 text-sm mb-1">
                  3. Xem trước phòng thủ theo thời gian thực (Live Preview)
                </h4>
                <p>
                  Kéo các thanh trượt <strong>Chiều cao, Độ rộng, Compactness, Pressure, Help Defense, Ball-side Shift</strong> ở bảng bên phải để quan sát toàn bộ khối phòng thủ co giãn và dịch chuyển tức thì theo từng pixel chiến thuật!
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sky-400 text-sm mb-1">
                  4. Lịch sử & Timeline
                </h4>
                <p>
                  Mọi hành động đều được ghi nhận vào dòng thời gian. Bạn có thể bấm <strong>Undo</strong>, <strong>Redo</strong>, hoặc bấm trực tiếp vào từng bước trong Timeline để khôi phục trạng thái sa bàn.
                </p>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium text-xs transition"
              >
                Đã hiểu & Bắt đầu
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
