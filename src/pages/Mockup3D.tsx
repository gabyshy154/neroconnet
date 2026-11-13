import { Component, Suspense, useMemo, useRef, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import type { PageId } from '../App'

interface Props {
  isLoggedIn: boolean
  navigate: (page: PageId) => void
}

type DesignSource = 'client' | 'nero'
type ReviewStatus = 'draft' | 'review' | 'revision' | 'approved'
type Side = 'front' | 'back'

const SOURCE_CONFIG = {
  client: { label: 'Client Design', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  nero: { label: 'Nero Design', color: 'bg-olive-50 text-olive-700 border-olive-200', dot: 'bg-olive-500' },
}

const REVIEW_CONFIG = {
  draft: { label: 'Draft', color: 'bg-stone-100 text-stone-600 border-stone-200', dot: 'bg-stone-400' },
  review: { label: 'Under Review', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  revision: { label: 'Revision Required', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  approved: { label: 'Approved', color: 'bg-olive-50 text-olive-700 border-olive-200', dot: 'bg-olive-500' },
}

const PRODUCTS = ['Grandsler Shirt', 'Crown Shirt']

const COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#1A1918' },
  { name: 'Navy', value: '#1B3A6B' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Red', value: '#B91C1C' },
  { name: 'Forest', value: '#166534' },
]

/* ------------------------------------------------------------------ */
/*  3D scene (Three.js via React Three Fiber)                          */
/* ------------------------------------------------------------------ */

// Print area (F1 / B1) in scene units
const PRINT_BOX = { w: 1.5, h: 1.9 }

function useShirtGeometry() {
  return useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.5, 1.8)
    s.lineTo(-1.25, 1.65)
    s.lineTo(-2.1, 0.9)
    s.lineTo(-1.75, 0.4)
    s.lineTo(-1.2, 0.8)
    s.lineTo(-1.2, -1.8)
    s.lineTo(1.2, -1.8)
    s.lineTo(1.2, 0.8)
    s.lineTo(1.75, 0.4)
    s.lineTo(2.1, 0.9)
    s.lineTo(1.25, 1.65)
    s.lineTo(0.5, 1.8)
    s.quadraticCurveTo(0, 1.0, -0.5, 1.8) // neckline

    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.3,
      bevelEnabled: true,
      bevelSize: 0.05,
      bevelThickness: 0.05,
      bevelSegments: 4,
      curveSegments: 24,
    })
    geo.translate(0, 0, -0.15)
    return geo
  }, [])
}

function Decal({ url, side }: { url: string; side: Side }) {
  const tex = useLoader(THREE.TextureLoader, url)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8

  const img = tex.image as { width: number; height: number }
  const ratio = img.width && img.height ? img.width / img.height : 1
  let w = PRINT_BOX.w
  let h = w / ratio
  if (h > PRINT_BOX.h) {
    h = PRINT_BOX.h
    w = h * ratio
  }

  const z = 0.205
  return (
    <mesh position={[0, 0.15, side === 'front' ? z : -z]} rotation={[0, side === 'front' ? 0 : Math.PI, 0]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} transparent roughness={0.85} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  )
}

// Stops a bad image file from crashing the whole 3D view
class DecalBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function Shirt({
  color,
  side,
  dragOffset,
  frontUrl,
  backUrl,
  onDecalError,
}: {
  color: string
  side: Side
  dragOffset: number
  frontUrl?: string
  backUrl?: string
  onDecalError: () => void
}) {
  const group = useRef<THREE.Group>(null)
  const geometry = useShirtGeometry()

  useFrame((_, delta) => {
    if (!group.current) return
    const target = (side === 'front' ? 0 : Math.PI) + dragOffset
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, target, 6, delta)
  })

  return (
    <group ref={group}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {frontUrl && (
        <DecalBoundary key={frontUrl} onError={onDecalError}>
          <Decal url={frontUrl} side="front" />
        </DecalBoundary>
      )}
      {backUrl && (
        <DecalBoundary key={backUrl} onError={onDecalError}>
          <Decal url={backUrl} side="back" />
        </DecalBoundary>
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Mockup3D({ isLoggedIn, navigate }: Props) {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0])
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [frontUrl, setFrontUrl] = useState<string | undefined>()
  const [backUrl, setBackUrl] = useState<string | undefined>()
  const [designSource, setDesignSource] = useState<DesignSource>('client')
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('draft')
  const [side, setSide] = useState<Side>('front')
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // drag-to-rotate on top of the Front / Back toggle
  const [dragOffset, setDragOffset] = useState(0)
  const spin = useRef<{ x: number; base: number } | null>(null)

  const currentUrl = side === 'front' ? frontUrl : backUrl
  const hasDesign = Boolean(frontUrl || backUrl)
  const locked = isLoggedIn && (reviewStatus === 'review' || reviewStatus === 'approved')

  function setCurrentUrl(url: string | undefined) {
    if (currentUrl) URL.revokeObjectURL(currentUrl)
    if (side === 'front') setFrontUrl(url)
    else setBackUrl(url)
  }

  function handleFile(file: File) {
    setFileError(null)
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['png', 'svg', 'psd'].includes(extension ?? '')) {
      setFileError('Upload a PNG, SVG, or PSD file.')
      return
    }
    if (extension === 'psd') {
      setFileError("PSD files can't be previewed yet. Export your design as PNG or SVG to see it on the shirt.")
      return
    }
    setCurrentUrl(URL.createObjectURL(file))
    if (reviewStatus === 'revision') setReviewStatus('draft')
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (locked) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function chooseSide(next: Side) {
    setSide(next)
    setDragOffset(0)
    setFileError(null)
  }

  const sourceCfg = SOURCE_CONFIG[designSource]
  const reviewCfg = REVIEW_CONFIG[reviewStatus]

  return (
    <div className="min-h-screen bg-parchment pb-20">
      <div className="bg-white border-b border-stone-200 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-olive-600 text-xs font-semibold tracking-widest uppercase mb-2">Preview</p>
          <h1 className="font-display text-4xl font-700 text-ink">3D Mockup</h1>
          <p className="text-stone-500 mt-2">Optional preview for T-shirts only. Upload a design and check both sides before submitting.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-10">
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Preview Panel */}
          <div className="bg-white border border-stone-200 rounded-2xl p-8 flex flex-col items-center">
            <div className="flex bg-stone-100 rounded-lg p-1 mb-6">
              {(['front', 'back'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => chooseSide(view)}
                  className={`px-6 py-2 rounded-md text-sm font-700 capitalize ${side === view ? 'bg-white text-ink shadow-sm' : 'text-stone-500'}`}
                >
                  {view}
                </button>
              ))}
            </div>

            {isLoggedIn && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-display font-600 ${sourceCfg.color}`}>
                  <span className={`w-2 h-2 rounded-full ${sourceCfg.dot}`} />
                  {sourceCfg.label}
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-display font-600 ${reviewCfg.color}`}>
                  <span className={`w-2 h-2 rounded-full ${reviewCfg.dot}`} />
                  {reviewCfg.label}
                </div>
              </div>
            )}

            {/* 3D shirt */}
            <div
              className="relative w-full h-[420px] rounded-xl bg-stone-100 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => {
                spin.current = { x: e.clientX, base: dragOffset }
              }}
              onPointerMove={(e) => {
                if (!spin.current) return
                setDragOffset(spin.current.base + (e.clientX - spin.current.x) * 0.01)
              }}
              onPointerUp={() => {
                spin.current = null
                setDragOffset(0)
              }}
              onPointerLeave={() => {
                spin.current = null
                setDragOffset(0)
              }}
            >
              <Canvas camera={{ position: [0, 0, 6.5], fov: 35 }} dpr={[1, 2]}>
                <hemisphereLight args={['#ffffff', '#bdb8aa', 0.9]} />
                <directionalLight position={[3, 4, 5]} intensity={1.1} />
                <directionalLight position={[-3, 2, -5]} intensity={0.6} />
                <Suspense fallback={null}>
                  <Shirt
                    color={selectedColor.value}
                    side={side}
                    dragOffset={dragOffset}
                    frontUrl={frontUrl}
                    backUrl={backUrl}
                    onDecalError={() => setFileError("That image couldn't be loaded. Try exporting it again as PNG or SVG.")}
                  />
                </Suspense>
              </Canvas>
              {!hasDesign && (
                <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-sm text-stone-400">
                  Upload a design to preview it on the shirt.
                </p>
              )}
              <span className="pointer-events-none absolute right-3 top-3 text-xs text-stone-400">Drag to rotate</span>
            </div>

            <p className="text-stone-400 text-sm mt-4 text-center">
              {selectedProduct} — {selectedColor.name} — {side === 'front' ? 'Front' : 'Back'}
            </p>
            <p className="text-stone-400 text-xs mt-1 text-center">Sample preview only. Nero confirms final print placement and colors.</p>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Product selector */}
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <p className="font-display font-700 text-ink text-sm mb-3">Garment</p>
              <div className="space-y-1.5">
                {PRODUCTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedProduct(p)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-500 transition-all ${
                      selectedProduct === p ? 'bg-olive-500 text-white' : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Color selector */}
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <p className="font-display font-700 text-ink text-sm mb-3">Color</p>
              <div className="flex flex-wrap gap-2.5">
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c)}
                    title={c.name}
                    aria-label={c.name}
                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                      selectedColor.name === c.name ? 'border-olive-500 scale-110' : 'border-stone-300'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
              <p className="text-xs text-stone-400 mt-2">{selectedColor.name}</p>
            </div>

            {/* Upload */}
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <p className="font-display font-700 text-ink text-sm mb-1">Design File ({side === 'front' ? 'Front' : 'Back'})</p>
              <p className="text-xs text-stone-400 mb-3">Each side has its own design. Max print size is 10" x 15" (A3).</p>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (!locked) setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onClick={() => {
                  if (!locked) fileRef.current?.click()
                }}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  locked
                    ? 'border-stone-200 opacity-50 cursor-not-allowed'
                    : dragging
                      ? 'border-olive-500 bg-olive-50 cursor-pointer'
                      : 'border-stone-200 hover:border-olive-300 hover:bg-stone-50 cursor-pointer'
                }`}
              >
                <svg className="w-8 h-8 mx-auto text-stone-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-stone-500">Drop PNG, SVG, or PSD here</p>
                <p className="text-xs text-stone-400 mt-1">or click to browse</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/svg+xml,.psd"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0])
                    e.target.value = '' // lets the same file be picked again
                  }}
                />
              </div>
              {fileError && (
                <p role="alert" className="mt-2 text-sm text-red-700">
                  {fileError}
                </p>
              )}
              {currentUrl && !locked && (
                <button
                  onClick={() => {
                    setCurrentUrl(undefined)
                    setFileError(null)
                  }}
                  className="mt-2 text-xs text-stone-400 hover:text-red-500 transition-colors"
                >
                  Remove {side} design
                </button>
              )}
            </div>

            {isLoggedIn && (
              <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-5">
                <div>
                  <p className="font-display font-700 text-ink text-sm mb-3">Design Source</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(SOURCE_CONFIG) as DesignSource[]).map((source) => (
                      <button
                        key={source}
                        onClick={() => setDesignSource(source)}
                        className={`px-3 py-2.5 rounded-lg border text-sm font-600 ${designSource === source ? SOURCE_CONFIG[source].color : 'border-stone-200 text-stone-500'}`}
                      >
                        {SOURCE_CONFIG[source].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-display font-700 text-ink text-sm mb-1">Review State Preview</p>
                  <p className="text-xs text-stone-400 mb-3">Compare the four logged-in frames.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(REVIEW_CONFIG) as ReviewStatus[]).map((state) => (
                      <button
                        key={state}
                        onClick={() => setReviewStatus(state)}
                        className={`px-3 py-2.5 rounded-lg border text-sm font-600 ${reviewStatus === state ? REVIEW_CONFIG[state].color : 'border-stone-200 text-stone-500'}`}
                      >
                        {REVIEW_CONFIG[state].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!isLoggedIn && (
              <div>
                <button disabled className="w-full bg-stone-200 text-stone-400 font-display font-700 py-3.5 rounded-xl cursor-not-allowed">
                  Submit for Quotation
                </button>
                <p className="text-sm text-stone-500 text-center mt-3">
                  Log in to submit your design for review.{' '}
                  <button onClick={() => navigate('auth')} className="text-olive-700 font-700 hover:underline">
                    Log in
                  </button>
                </p>
                <p className="text-xs text-stone-400 text-center mt-2">Your preview won't be saved until you log in.</p>
              </div>
            )}

            {isLoggedIn && reviewStatus === 'draft' && (
              <div>
                <button
                  onClick={() => setReviewStatus('review')}
                  disabled={!hasDesign}
                  className="w-full bg-olive-500 hover:bg-olive-600 text-white font-display font-700 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  Submit for Quotation
                </button>
                {!hasDesign && <p className="text-xs text-stone-400 text-center mt-2">Upload a design to submit it for review.</p>}
              </div>
            )}

            {isLoggedIn && reviewStatus === 'review' && (
              <div>
                <button disabled className="w-full bg-stone-200 text-stone-400 font-display font-700 py-3.5 rounded-xl cursor-not-allowed">
                  Waiting for Nero's review
                </button>
                <p className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 leading-relaxed">
                  Your design has been submitted and needs to be reviewed by Nero before it is quoted.
                </p>
              </div>
            )}

            {isLoggedIn && reviewStatus === 'revision' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <p className="text-sm font-700 text-red-800">Note from Nero</p>
                <p className="text-sm text-red-700 mt-1 mb-4">Image resolution is too low for printing.</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full bg-white border border-red-300 text-red-700 font-700 py-3 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Re-upload Design
                </button>
              </div>
            )}

            {isLoggedIn && reviewStatus === 'approved' && (
              <div className="bg-olive-50 border border-olive-200 rounded-xl p-5">
                <p className="text-sm font-700 text-olive-800 mb-4">Your design is approved</p>
                <button
                  onClick={() => navigate('quotation')}
                  className="w-full bg-olive-500 hover:bg-olive-600 text-white font-700 py-3 rounded-lg transition-colors"
                >
                  Continue to Quotation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}