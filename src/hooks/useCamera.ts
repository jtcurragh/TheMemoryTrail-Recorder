import { useState, useRef, useCallback, useEffect } from 'react'

const MAX_CAPTURE_DIMENSION = 1200

function getMaxCaptureDimension(): number {
  return MAX_CAPTURE_DIMENSION
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  isReady: boolean
  error: string | null
  stopCamera: () => void
  captureFrame: () => Promise<Blob | null>
  /** Starts camera if no stream, or reattaches existing stream. Call when entering live view. */
  ensureCameraRunning: () => Promise<void>
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: MAX_CAPTURE_DIMENSION },
            height: { ideal: MAX_CAPTURE_DIMENSION },
          },
          audio: false,
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsReady(true)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Camera not available'
      setError(message)
      setIsReady(false)
    }
  }, [])

  const reattachStream = useCallback(() => {
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    if (video.srcObject === stream && video.readyState >= 2) return
    video.srcObject = stream
    void video.play().then(() => setIsReady(true))
  }, [])

  const ensureInProgressRef = useRef(false)
  const ensureCameraRunning = useCallback(async () => {
    if (ensureInProgressRef.current) return
    ensureInProgressRef.current = true
    try {
      if (streamRef.current) {
        reattachStream()
      } else {
        await startCamera()
      }
    } finally {
      ensureInProgressRef.current = false
    }
  }, [reattachStream, startCamera])

  const captureFrame = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current
      if (!video || !isReady) {
        resolve(null)
        return
      }

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
      }
      const canvas = canvasRef.current

      const maxDim = getMaxCaptureDimension()
      let w = video.videoWidth
      let h = video.videoHeight
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(video, 0, 0, w, h)

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      canvas.toBlob(
        (blob) => resolve(blob ?? null),
        'image/jpeg',
        isIOS ? 0.75 : 0.85,
      )
    })
  }, [isReady])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  return { videoRef, isReady, error, stopCamera, captureFrame, ensureCameraRunning }
}
