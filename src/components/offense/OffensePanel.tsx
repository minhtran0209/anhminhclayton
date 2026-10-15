import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import {
  OffenseFormation,
  OffensiveActionType,
  Position,
} from '../../types/basketball';
import { POSITIONS } from '../../config/constants';
import { FORMATION_DESCRIPTIONS } from '../../tactics/offense/formations';
import {
  Users,
  Play,
  RotateCcw,
  Save,
  ArrowRight,
  ShieldAlert,
  Shield,
  Target,
  CircleDot,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';

export const OffensePanel: React.FC = () => {
  const {
    offense,
    selectedPlayer,
    ballHolder,
    currentFormation,
    actionDraft,
    activeScreen,
    isPremoveMode,
    premoveQueue,
    isExecutingPremove,
    selectPlayer,
    setBallHolder,
    setFormation,
    saveCustomFormation,
    resetPositions,
    startDraft,
    clearActiveScreen,
    togglePremoveMode,
    undoLastPremove,
    clearPremoveQueue,
    executePremoveQueue,
  } = useGameStore();

  const [passTarget, setPassTarget] = useState<Position>('SG');
  const [screenTarget, setScreenTarget] = useState<Position>('PG');
  const [handoffTarget, setHandoffTarget] = useState<Position>('SG');
  const [saveToast, setSaveToast] = useState(false);
  const [resetToast, setResetToast] = useState(false);

  const handleResetPositions = () => {
    resetPositions();
    setResetToast(true);
    setTimeout(() => setResetToast(false), 2000);
  };

  const isBallHandler = selectedPlayer === ballHolder;

  const formations: OffenseFormation[] = [
    '5-Out',
    '4-Out 1-In',
    '3-Out 2-In',
    'Horns',
    'Box',
    'Stack',
    'Custom',
  ];

  const handleSaveCustom = () => {
    saveCustomFormation();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 shadow-lg h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-md">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-sky-400 uppercase">
              TẤN CÔNG (OFFENSE)
            </h2>
            <p className="text-xs text-slate-400">Kiểm soát bài chạy & đội hình</p>
          </div>
        </div>
      </div>

      {/* Premove (Play Designer) Section */}
      {!isPremoveMode ? (
        <button
          onClick={togglePremoveMode}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-300 transition text-xs font-semibold shadow-sm group"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition">
              <Zap className="w-4 h-4 fill-emerald-400/30" />
            </div>
            <div className="text-left">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>Chế độ Premove</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-300 font-mono">
                  MỚI
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-normal">
                Soạn chuỗi bài chạy (Hậu vệ đứng yên chờ kích hoạt)
              </div>
            </div>
          </div>
          <span className="px-2 py-1 rounded-md bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 text-[11px] font-bold">
            BẬT
          </span>
        </button>
      ) : (
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-emerald-500/60 bg-emerald-950/40 text-xs shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400 animate-pulse fill-emerald-400/20" />
              <div>
                <div className="font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                  <span>Premove Đang Bật</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 font-mono">
                    {premoveQueue.length} bước
                  </span>
                </div>
                <div className="text-[10px] text-slate-300">
                  ❄️ Hàng thủ đối phương đang đóng băng
                </div>
              </div>
            </div>
            <button
              onClick={togglePremoveMode}
              disabled={isExecutingPremove}
              className="p-1 text-slate-400 hover:text-red-300 transition"
              title="Thoát chế độ Premove"
            >
              ✕
            </button>
          </div>

          {/* Queued Steps List */}
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-0.5">
            {premoveQueue.length === 0 ? (
              <div className="text-[11px] text-emerald-300/70 italic py-2 text-center bg-slate-950/40 rounded border border-emerald-900/30">
                Chưa có bước nào. Hãy chọn cầu thủ & thao tác bài chạy bên dưới!
              </div>
            ) : (
              premoveQueue.map((step, idx) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between gap-1.5 p-1.5 rounded bg-slate-900/80 border border-emerald-800/40 text-[11px]"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="text-slate-200 truncate">{step.description}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Execute and management buttons */}
          <div className="flex flex-col gap-1.5 pt-1">
            <button
              onClick={executePremoveQueue}
              disabled={premoveQueue.length === 0 || isExecutingPremove}
              className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isExecutingPremove
                  ? 'ĐANG THỰC THI BÀI CHẠY...'
                  : `KÍCH HOẠT CHUỖI BÀI CHẠY (${premoveQueue.length} BƯỚC)`}
              </span>
            </button>

            {premoveQueue.length > 0 && !isExecutingPremove && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={undoLastPremove}
                  className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] border border-slate-700 transition text-center"
                >
                  ↩️ Hủy bước gần nhất
                </button>
                <button
                  onClick={clearPremoveQueue}
                  className="flex-1 py-1 px-2 bg-slate-800 hover:bg-red-950/60 text-red-300 rounded text-[11px] border border-slate-700 transition text-center"
                >
                  🗑️ Xóa chuỗi
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. Offensive Formations */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Đội hình (Formation)</span>
          <span className="text-[11px] font-normal text-sky-400 lowercase">
            {currentFormation}
          </span>
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          {formations.map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormation(fmt)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition border text-left ${
                currentFormation === fmt
                  ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>

        {/* Formation Description */}
        <p className="text-[11px] text-slate-400 italic bg-slate-950/50 p-2 rounded border border-slate-800/80">
          {FORMATION_DESCRIPTIONS[currentFormation]}
        </p>

        {/* Formation Quick Actions: Reset & Save */}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={handleResetPositions}
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-amber-600/40 rounded-md text-xs font-medium text-amber-300 transition flex-1"
            title="Đưa các cầu thủ về vị trí chuẩn ban đầu của đội hình"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset vị trí ban đầu</span>
          </button>
          {resetToast && (
            <span className="text-xs text-amber-400 animate-pulse font-medium whitespace-nowrap">
              Đã reset vị trí!
            </span>
          )}
        </div>

        {currentFormation === 'Custom' && (
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handleSaveCustom}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-medium text-slate-200 transition"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lưu Custom Formation</span>
            </button>
            {saveToast && (
              <span className="text-xs text-emerald-400 animate-pulse whitespace-nowrap">
                Đã lưu!
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Player Selection & Ball Possession */}
      <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Cầu thủ đang chọn</span>
          <span className="text-xs font-bold text-amber-400">
            {selectedPlayer ? `Đang chọn: ${selectedPlayer}` : 'Chưa chọn'}
          </span>
        </label>

        <div className="grid grid-cols-5 gap-1">
          {POSITIONS.map((pos) => {
            const isSelected = selectedPlayer === pos;
            const hasBall = ballHolder === pos;
            return (
              <button
                key={pos}
                data-player-select={pos}
                aria-label={`Chọn cầu thủ ${pos}`}
                onClick={() => selectPlayer(pos)}
                className={`relative py-2 px-1 text-xs font-bold rounded flex flex-col items-center justify-center border transition ${
                  isSelected
                    ? 'bg-sky-500 text-white border-sky-400 shadow-md ring-2 ring-sky-400/30'
                    : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-300'
                }`}
              >
                <span>{pos}</span>
                {hasBall && (
                  <span className="w-2 h-2 rounded-full bg-orange-400 mt-1 border border-white"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Transfer Ball Button */}
        {selectedPlayer && !isBallHandler && (
          <button
            onClick={() => setBallHolder(selectedPlayer)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-orange-600/30 hover:bg-orange-600/40 border border-orange-500/50 rounded-md text-xs font-medium text-orange-200 transition mt-1"
          >
            <CircleDot className="w-3.5 h-3.5 text-orange-400" />
            <span>Chuyển bóng cho {selectedPlayer}</span>
          </button>
        )}
      </div>

      {/* 3. Offensive Tactical Actions */}
      <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {isBallHandler ? 'Hành động người cầm bóng' : 'Hành động không bóng (Off-ball)'}
          </label>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            {isBallHandler ? 'Ball-Handler' : 'Off-Ball'}
          </span>
        </div>

        {isBallHandler ? (
          /* BALL-HANDLER ACTIONS */
          <div className="flex flex-col gap-2">
            {/* Pick & Roll: Exploiting Active Screen */}
            {activeScreen && activeScreen.target === selectedPlayer && (
              <div className="flex flex-col gap-2 p-2.5 bg-amber-950/40 border border-amber-500/60 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    Có Screen từ {activeScreen.screener}!
                  </span>
                  <button
                    type="button"
                    onClick={clearActiveScreen}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    title="Hủy bỏ Screen hiện tại"
                  >
                    Hủy cản
                  </button>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-tight">
                  {activeScreen.screener} đã lập cản người chắn hậu vệ. Chọn cách phối hợp:
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    data-action="drive-off-screen"
                    onClick={() => startDraft('drive_off_screen')}
                    className="p-2 bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/60 rounded-lg text-left transition active:scale-95"
                    title="Đột phá lướt vòng qua vai của Screener vào thẳng khu vực hình thang"
                  >
                    <div className="text-xs font-bold text-amber-200">Đột phá qua Screen</div>
                    <div className="text-[10px] text-amber-300/80">Lướt qua cản vào sơn</div>
                  </button>

                  <button
                    type="button"
                    data-action="shoot-off-screen"
                    onClick={() => startDraft('shoot_off_screen')}
                    className="p-2 bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/60 rounded-lg text-left transition active:scale-95"
                    title="Ném rổ nhảy ngay sau lưng Screener (Hậu vệ kèm bị cản, tăng tỉ lệ ném)"
                  >
                    <div className="text-xs font-bold text-emerald-200">Ném sau Screen</div>
                    <div className="text-[10px] text-emerald-300/80">Ném thoáng khi có chắn</div>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              <ActionButton
                title="Di chuyển"
                desc="Move có bóng"
                onClick={() => startDraft('move')}
              />
              <ActionButton
                title="Nhồi bóng"
                desc="Dribble điều phối"
                onClick={() => startDraft('dribble')}
              />
              <ActionButton
                title="Drive Trái"
                desc="Đột phá nách trái"
                onClick={() => startDraft('drive_left')}
              />
              <ActionButton
                title="Drive Phải"
                desc="Đột phá nách phải"
                onClick={() => startDraft('drive_right')}
              />
            </div>

            {/* Pass Option with Teammate selector */}
            <div className="flex flex-col gap-1 p-2 bg-slate-800/50 rounded-lg border border-slate-700/60 mt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">Chuyền bóng (Pass):</span>
                <select
                  value={passTarget}
                  onChange={(e) => setPassTarget(e.target.value as Position)}
                  className="bg-slate-900 border border-slate-700 text-sky-300 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-sky-500"
                >
                  {POSITIONS.filter((p) => p !== selectedPlayer).map((p) => (
                    <option key={p} value={p}>
                      Đồng đội {p}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  if (isPremoveMode) {
                    setBallHolder(passTarget);
                  } else {
                    startDraft('pass', passTarget);
                  }
                }}
                className="w-full mt-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold shadow transition active:scale-98"
              >
                Chuyền cho {passTarget}
              </button>
            </div>

            {/* Dedicated Hand-off (DHO) Section with Direction Controls */}
            <div className="flex flex-col gap-1.5 p-2 bg-slate-800/60 rounded-lg border border-orange-500/30 mt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-orange-300">Hand-off (DHO) cho:</span>
                <select
                  value={handoffTarget}
                  onChange={(e) => setHandoffTarget(e.target.value as Position)}
                  className="bg-slate-900 border border-slate-700 text-orange-300 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-orange-500"
                >
                  {POSITIONS.filter((p) => p !== selectedPlayer).map((p) => (
                    <option key={p} value={p}>
                      Đồng đội {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-[11px] text-slate-400 font-medium">Chọn hướng chạy Hand-off:</div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  data-action="handoff-left"
                  onClick={() => startDraft('handoff', handoffTarget, 'left')}
                  className="py-1.5 px-1 text-xs font-semibold rounded border transition text-center bg-slate-900 hover:bg-slate-800 text-orange-200 border-slate-700 active:scale-95"
                  title="Chạy dẫn bóng sang cánh trái để trao bóng"
                >
                  ← Trái
                </button>
                <button
                  type="button"
                  data-action="handoff-direct"
                  onClick={() => startDraft('handoff', handoffTarget, 'direct')}
                  className="py-1.5 px-1 text-xs font-semibold rounded border transition text-center bg-slate-900 hover:bg-slate-800 text-orange-200 border-slate-700 active:scale-95"
                  title="Chạy thẳng trực diện về phía đồng đội để trao bóng"
                >
                  ↕ Trực diện
                </button>
                <button
                  type="button"
                  data-action="handoff-right"
                  onClick={() => startDraft('handoff', handoffTarget, 'right')}
                  className="py-1.5 px-1 text-xs font-semibold rounded border transition text-center bg-slate-900 hover:bg-slate-800 text-orange-200 border-slate-700 active:scale-95"
                  title="Chạy dẫn bóng sang cánh phải để trao bóng"
                >
                  Phải →
                </button>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                * Click trên sa bàn để đặt điểm hẹn trao bóng tự do.
              </p>
            </div>

            {/* Finishing Actions: Layup & Shoot */}
            <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Dứt điểm (Finishing)
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  data-action="layup"
                  onClick={() => startDraft('layup')}
                  className="p-2 bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-500/50 rounded-lg text-left transition active:scale-95"
                  title="Lên rổ cận thành (2Đ). Nếu xuất phát từ ngoài vạch 3 điểm mà không dùng Screen, hậu vệ sẽ đeo bám suốt đường chạy làm giảm tỉ lệ thành công."
                >
                  <div className="text-xs font-bold text-emerald-300">Lên rổ (Layup)</div>
                  <div className="text-[10px] text-emerald-200/70">Đột phá cận rổ (2Đ)</div>
                </button>

                <button
                  type="button"
                  data-action="shoot"
                  onClick={() => startDraft('shoot')}
                  className="p-2 bg-amber-600/25 hover:bg-amber-600/35 border border-amber-500/50 rounded-lg text-left transition active:scale-95"
                  title="Ném rổ nhảy (Tỉ lệ vào tính theo cự ly rổ & khoảng cách hậu vệ contest)"
                >
                  <div className="text-xs font-bold text-amber-300">Ném rổ (Shoot)</div>
                  <div className="text-[10px] text-amber-200/70">Ném 2Đ / 3Đ (Contest)</div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* OFF-BALL ACTIONS */
          <div className="flex flex-col gap-2">
            {/* Screener Action Options: Roll, Pop, or Clear */}
            {activeScreen && activeScreen.screener === selectedPlayer && (
              <div className="flex flex-col gap-2 p-2.5 bg-amber-950/40 border border-amber-500/60 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    Đang làm Screen cho {activeScreen.target}
                  </span>
                  <button
                    type="button"
                    onClick={clearActiveScreen}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    title="Hủy bỏ Screen"
                  >
                    Hủy cản
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    data-action="roll"
                    onClick={() => startDraft('roll')}
                    className="p-2 bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/60 rounded-lg text-left transition active:scale-95"
                    title="Lướt cắt thẳng vào rổ đón bóng dứt điểm cận thành"
                  >
                    <div className="text-xs font-bold text-emerald-300">Roll vào rổ</div>
                    <div className="text-[10px] text-emerald-200/70">Cắt thẳng vào bảng rổ</div>
                  </button>

                  <button
                    type="button"
                    data-action="pop"
                    onClick={() => startDraft('pop')}
                    className="p-2 bg-sky-600/30 hover:bg-sky-600/40 border border-sky-500/60 rounded-lg text-left transition active:scale-95"
                    title="Dạt ra cánh ngoài vạch 3 điểm đón bóng ném xa"
                  >
                    <div className="text-xs font-bold text-sky-300">Pop ra 3 điểm</div>
                    <div className="text-[10px] text-sky-200/70">Dạt ra cánh ném xa</div>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              <ActionButton
                title="Di chuyển"
                desc="Move tìm vị trí"
                onClick={() => startDraft('move')}
              />
              <ActionButton
                title="Cắt bóng (Cut)"
                desc="Cut vào khoảng trống"
                onClick={() => startDraft('cut')}
              />
              <ActionButton
                title="Backdoor Cut"
                desc="Luồn sau lưng hậu vệ"
                onClick={() => startDraft('backdoor')}
              />
              <ActionButton
                title="Tìm góc ném"
                desc="Relocate 3 điểm"
                onClick={() => startDraft('relocate')}
              />
            </div>

            {/* Screen Action with Direction Controls */}
            <div className="flex flex-col gap-1.5 p-2 bg-slate-800/60 rounded-lg border border-amber-500/30 mt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-300">Làm cản (Screen) cho:</span>
                <select
                  value={screenTarget}
                  onChange={(e) => setScreenTarget(e.target.value as Position)}
                  className="bg-slate-900 border border-slate-700 text-amber-300 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-amber-500"
                >
                  {POSITIONS.filter((p) => p !== selectedPlayer).map((p) => (
                    <option key={p} value={p}>
                      {p} {p === ballHolder ? '(Cầm bóng)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-[11px] text-slate-400 font-medium">Chọn hướng đặt Screen:</div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  data-action="screen-left"
                  onClick={() => startDraft('screen', screenTarget, 'left')}
                  className="py-1.5 px-1 text-xs font-semibold rounded border transition text-center bg-slate-900 hover:bg-slate-800 text-amber-200 border-slate-700 active:scale-95"
                  title="Cản người bên cánh trái của đồng đội"
                >
                  ← Cản Trái
                </button>
                <button
                  type="button"
                  data-action="screen-top"
                  onClick={() => startDraft('screen', screenTarget, 'top')}
                  className="py-1.5 px-1 text-xs font-semibold rounded border transition text-center bg-slate-900 hover:bg-slate-800 text-amber-200 border-slate-700 active:scale-95"
                  title="Cản phía sau lưng hoặc trên đỉnh (Back/Flare Screen)"
                >
                  ↑ Đỉnh/Sau
                </button>
                <button
                  type="button"
                  data-action="screen-right"
                  onClick={() => startDraft('screen', screenTarget, 'right')}
                  className="py-1.5 px-1 text-xs font-semibold rounded border transition text-center bg-slate-900 hover:bg-slate-800 text-amber-200 border-slate-700 active:scale-95"
                  title="Cản người bên cánh phải của đồng đội"
                >
                  Cản Phải →
                </button>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                * Click trên sa bàn để đặt vị trí screen tự do.
              </p>
            </div>

            {/* Roll and Pop Actions */}
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              <ActionButton
                title="Roll"
                desc="Lướt cắt vào rổ"
                onClick={() => startDraft('roll')}
              />
              <ActionButton
                title="Pop"
                desc="Dạt ra 3 điểm"
                onClick={() => startDraft('pop')}
              />
            </div>

            <ActionButton
              title="Spot Up"
              desc="Đứng sẵn chờ bóng ngoài vạch"
              onClick={() => startDraft('spot_up')}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const ActionButton: React.FC<{
  title: string;
  desc: string;
  onClick: () => void;
}> = ({ title, desc, onClick }) => (
  <button
    onClick={onClick}
    className="p-2 bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/80 rounded-lg text-left transition active:scale-98"
  >
    <div className="text-xs font-bold text-slate-200">{title}</div>
    <div className="text-[10px] text-slate-400">{desc}</div>
  </button>
);
