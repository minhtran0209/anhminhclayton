import React from 'react';
import { PremoveStep } from '../../types/basketball';

interface PremoveQueueOverlayProps {
  queue: PremoveStep[];
  visible: boolean;
}

export const PremoveQueueOverlay: React.FC<PremoveQueueOverlayProps> = ({
  queue,
  visible,
}) => {
  if (!visible || queue.length === 0) return null;

  return (
    <g className="premove-queue-overlay pointer-events-none select-none">
      <defs>
        <marker
          id="premove-arrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
        </marker>
      </defs>

      {queue.map((step) => {
        const path = step.draft.path;
        if (!path || path.length < 2) return null;

        const startPt = path[0];
        const endPt = path[path.length - 1];

        // Build SVG path data
        let d = `M ${startPt.x} ${startPt.y}`;
        if (path.length === 2) {
          d += ` L ${endPt.x} ${endPt.y}`;
        } else if (path.length === 3) {
          d += ` Q ${path[1].x} ${path[1].y} ${endPt.x} ${endPt.y}`;
        } else {
          path.slice(1).forEach((pt) => {
            d += ` L ${pt.x} ${pt.y}`;
          });
        }

        const midX = (startPt.x + endPt.x) / 2;
        const midY = (startPt.y + endPt.y) / 2;

        const actionName =
          step.draft.action === 'screen'
            ? `Screen ${step.draft.targetPlayer || ''}`
            : step.draft.action === 'handoff'
            ? `Handoff ${step.draft.targetPlayer || ''}`
            : step.draft.action === 'pass'
            ? `Chuyền ${step.draft.targetPlayer || ''}`
            : step.draft.action === 'layup'
            ? 'Lên rổ'
            : step.draft.action === 'shoot' || step.draft.action === 'shoot_off_screen'
            ? 'Ném rổ'
            : step.draft.action === 'cut' || step.draft.action === 'backdoor'
            ? 'Cắt bóng'
            : step.draft.action === 'roll'
            ? 'Roll vào rổ'
            : step.draft.action === 'pop'
            ? 'Pop ra 3P'
            : step.draft.action;

        return (
          <g key={step.id} className="premove-step">
            {/* Action dashed path with emerald glow */}
            <path
              d={d}
              fill="none"
              stroke="#047857"
              strokeWidth="2.2"
              opacity="0.4"
            />
            <path
              d={d}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.1"
              strokeDasharray="2.5, 1.2"
              markerEnd="url(#premove-arrow)"
            />

            {/* Target End Step Marker Badge */}
            <circle
              cx={endPt.x}
              cy={endPt.y}
              r="2.4"
              fill="#064e3b"
              stroke="#34d399"
              strokeWidth="0.6"
            />
            <text
              x={endPt.x}
              y={endPt.y + 0.8}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="2.1"
              fontWeight="bold"
              fontFamily="ui-monospace, monospace"
            >
              {step.stepNumber}
            </text>

            {/* Step summary tag pill */}
            <g transform={`translate(${midX}, ${midY - 2.5})`}>
              <rect
                x="-10"
                y="-1.8"
                width="20"
                height="3.6"
                rx="1.2"
                fill="#022c22"
                stroke="#10b981"
                strokeWidth="0.4"
                opacity="0.95"
              />
              <text
                x="0"
                y="0.6"
                textAnchor="middle"
                fontSize="1.5"
                fontWeight="bold"
                fill="#6ee7b7"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                #{step.stepNumber} {step.draft.player}: {actionName}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
};
