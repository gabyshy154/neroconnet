import { useState, useRef, useEffect } from 'react'
import type { PageId } from '../App'

interface Props {
  navigate: (page: PageId) => void
  isLoggedIn: boolean
  userName?: string
}

type FlowStep = 'welcome' | 'interest' | 'quantity' | 'recommend' | 'npc' | 'done'

interface Message {
  id: string
  from: 'octavia' | 'user'
  text: string
}

const FLOW: Record<FlowStep, { text: string; options?: string[]; next?: FlowStep }> = {
  welcome: {
    text: "Hi, I'm Octavia, your guide to NeroConnect. What can I explain first?",
    options: ["Printing services", "How to order", "Quotations", "Membership"],
  },
  interest: {
    text: "I can guide you step by step. Roughly how many pieces are you considering?",
    options: ["Less than 25", "25–100 pieces", "100+ pieces", "Not sure yet"],
  },
  quantity: {
    text: "Got it! Here's what I'd suggest based on your needs:",
    options: ["Show me the catalog", "Open the configurator", "Get a quotation"],
  },
  recommend: {
    text: "For 25+ pieces, you may qualify for a volume discount. Use Customization to build your item, then add it to a quotation. Want to learn about membership?",
    options: ["Yes, tell me about NPC", "Skip for now"],
  },
  npc: {
    text: "The Nero Privilege Card (NPC) earns 1 point per ₱1,000 spent and offers tier discounts. Your account QR is scanned at the shop's Billing System counter.",
    options: ["Enroll in NPC", "View all benefits", "Maybe later"],
  },
  done: {
    text: "You're all set. Feel free to explore NeroConnect, and open this guide whenever you need help.",
    options: [],
  },
}

const FLOW_ORDER: FlowStep[] = ['welcome', 'interest', 'quantity', 'recommend', 'npc', 'done']

export default function Octavia({ navigate, isLoggedIn, userName }: Props) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentStep, setCurrentStep] = useState<FlowStep>('welcome')
  const [started, setStarted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function startFlow() {
    setStarted(true)
    addOctavia(FLOW.welcome.text)
  }

  function addOctavia(text: string) {
    const id = Date.now().toString()
    setMessages((prev) => [...prev, { id, from: 'octavia', text }])
  }

  function addUser(text: string) {
    const id = (Date.now() + 1).toString()
    setMessages((prev) => [...prev, { id, from: 'user', text }])
  }

  function handleOption(option: string) {
    addUser(option)

    if (option === 'Show me the catalog') { navigate('catalog'); return }
    if (option === 'Open the configurator') { navigate('customize'); return }
    if (option === 'Get a quotation') { navigate('quotation'); return }
    if (option === 'Enroll in NPC') { navigate('loyalty'); return }
    if (option === 'View all benefits') { navigate('loyalty'); return }

    const nextIdx = FLOW_ORDER.indexOf(currentStep) + 1
    if (nextIdx < FLOW_ORDER.length) {
      const nextStep = FLOW_ORDER[nextIdx]
      setCurrentStep(nextStep)
      setTimeout(() => addOctavia(FLOW[nextStep].text), 500)
    }
  }

  const currentOptions = FLOW[currentStep]?.options ?? []

  if (dismissed) return null

  return (
    <>
      {/* Trigger banner (for non-logged-in / first-time visitors) */}
      {!open && !isLoggedIn && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-xl p-4 max-w-xs animate-slide-in-up">
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-3 right-3 text-stone-300 hover:text-stone-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-olive-500 flex items-center justify-center text-white font-display font-700 text-sm flex-shrink-0">
                O
              </div>
              <div>
                <p className="font-display font-700 text-ink text-sm">New here? Let Octavia help</p>
                <p className="text-stone-500 text-xs">A step-by-step guide to ordering</p>
              </div>
            </div>
            <button
              onClick={() => { setOpen(true); if (!started) startFlow() }}
              className="w-full bg-olive-500 hover:bg-olive-600 text-white font-display font-700 py-2.5 rounded-xl text-sm transition-all"
            >
              Chat with Octavia
            </button>
          </div>
        </div>
      )}

      {/* Returning-customer trigger */}
      {!open && isLoggedIn && (
        <button
          onClick={() => { setOpen(true); if (!started) startFlow() }}
          className="fixed bottom-6 right-6 z-50 bg-white border border-stone-200 hover:border-olive-400 text-ink rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
          </svg>
          <span className="text-sm font-700">Welcome back · Ask Octavia</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 max-h-[520px] flex flex-col bg-white border border-stone-200 rounded-2xl shadow-2xl animate-slide-in-right overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-olive-500 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-display font-700 text-sm">
                O
              </div>
              <div>
                <p className="font-display font-700 text-sm">Octavia</p>
                <p className="text-olive-200 text-xs">NeroConnect Guide</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>

          {/* Returning user greeting */}
          {isLoggedIn && !started && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 bg-olive-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-olive-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"/>
                </svg>
              </div>
              <p className="font-display font-700 text-ink mb-1">Welcome back, {userName?.split(' ')[0] ?? 'there'}!</p>
              <p className="text-stone-500 text-sm mb-5">How can I help you today?</p>
              <div className="flex flex-col gap-2 w-full">
                {['Start a new order', 'Check order status', 'View my membership', 'Contact support'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      if (opt === 'Start a new order') navigate('customize')
                      else if (opt === 'Check order status') navigate('orders')
                      else if (opt === 'View my membership') navigate('loyalty')
                      else navigate('contact')
                      setOpen(false)
                    }}
                    className="w-full border border-stone-200 hover:border-olive-400 hover:bg-olive-50 text-ink text-sm font-500 py-2.5 rounded-xl transition-all"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {(!isLoggedIn || started) && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!started && (
                  <div className="text-center py-8">
                    <button
                      onClick={startFlow}
                      className="bg-olive-500 hover:bg-olive-600 text-white font-display font-700 px-6 py-2.5 rounded-xl transition-all text-sm"
                    >
                      Start guided tour
                    </button>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.from === 'octavia' && (
                      <div className="w-6 h-6 rounded-full bg-olive-500 flex items-center justify-center text-white text-xs font-700 mr-2 mt-1 flex-shrink-0">
                        O
                      </div>
                    )}
                    <div
                      className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.from === 'user'
                          ? 'bg-ink text-white rounded-tr-sm'
                          : 'bg-stone-100 text-ink rounded-tl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Options */}
              {currentOptions.length > 0 && started && (
                <div className="px-4 pb-4 pt-2 border-t border-stone-100 flex-shrink-0">
                  <div className="flex flex-col gap-2">
                    {currentOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleOption(opt)}
                        className="text-left border border-stone-200 hover:border-olive-400 hover:bg-olive-50 text-ink text-sm font-500 px-3.5 py-2 rounded-xl transition-all"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
