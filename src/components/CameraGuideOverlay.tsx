/**
 * Viewfinder-style centering guide for the camera preview.
 * Renders four L-shaped corner markers only — no solid border or filled background.
 */
const CORNER_LENGTH = 22
const CORNER_THICKNESS = 3

const base =
  'absolute pointer-events-none [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.5))]'

export function CameraGuideOverlay() {
  return (
    <div
      data-testid="camera-guide-overlay"
      className="absolute inset-[8%] pointer-events-none"
      aria-hidden
    >
      {/* Top-left: L opens down-right */}
      <div
        data-testid="guide-corner"
        className={`${base} top-0 left-0`}
        style={{
          width: CORNER_LENGTH,
          height: CORNER_LENGTH,
          borderTop: `${CORNER_THICKNESS}px solid white`,
          borderLeft: `${CORNER_THICKNESS}px solid white`,
        }}
      />
      {/* Top-right: L opens down-left */}
      <div
        data-testid="guide-corner"
        className={`${base} top-0 right-0`}
        style={{
          width: CORNER_LENGTH,
          height: CORNER_LENGTH,
          borderTop: `${CORNER_THICKNESS}px solid white`,
          borderRight: `${CORNER_THICKNESS}px solid white`,
        }}
      />
      {/* Bottom-left: L opens up-right */}
      <div
        data-testid="guide-corner"
        className={`${base} bottom-0 left-0`}
        style={{
          width: CORNER_LENGTH,
          height: CORNER_LENGTH,
          borderBottom: `${CORNER_THICKNESS}px solid white`,
          borderLeft: `${CORNER_THICKNESS}px solid white`,
        }}
      />
      {/* Bottom-right: L opens up-left */}
      <div
        data-testid="guide-corner"
        className={`${base} bottom-0 right-0`}
        style={{
          width: CORNER_LENGTH,
          height: CORNER_LENGTH,
          borderBottom: `${CORNER_THICKNESS}px solid white`,
          borderRight: `${CORNER_THICKNESS}px solid white`,
        }}
      />
    </div>
  )
}
