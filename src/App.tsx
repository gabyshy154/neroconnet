import { useState } from 'react'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Catalog from './pages/Catalog'
import SizeGuide from './pages/SizeGuide'
import Customize from './pages/Customize'
import Mockup3D from './pages/Mockup3D'
import Quotation from './pages/Quotation'
import OrderTracking from './pages/OrderTracking'
import Loyalty from './pages/Loyalty'
import About from './pages/About'
import Contact from './pages/Contact'
import Octavia from './components/Octavia'

export type PageId =
  | 'home' | 'auth' | 'catalog' | 'size-guide' | 'customize'
  | 'mockup' | 'quotation' | 'orders' | 'loyalty' | 'about' | 'contact'

export interface QuotationItem {
  id: string
  product: string
  material: string
  printType: string
  zones: string[]
  sizes: { size: string; qty: number }[]
  unitPrice: number
  totalQty: number
  subtotal: number
}

interface User {
  name: string
  email: string
}

const NAV_LINKS: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'catalog', label: 'All Items' },
  { id: 'size-guide', label: 'Size Guide' },
  { id: 'customize', label: 'Customization' },
  { id: 'orders', label: 'Order Tracking' },
  { id: 'loyalty', label: 'Membership' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
]

function Nav({
  current,
  navigate,
  quotationCount,
  isLoggedIn,
  user,
  onLogout,
}: {
  current: PageId
  navigate: (p: PageId) => void
  quotationCount: number
  isLoggedIn: boolean
  user: User | null
  onLogout: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  function go(p: PageId) {
    navigate(p)
    setMenuOpen(false)
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-16 gap-4">
            {/* Logo */}
            <button
              onClick={() => go('home')}
              className="flex items-center gap-2 flex-shrink-0 mr-2"
            >
              <div className="w-8 h-8 bg-olive-500 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <rect x="3" y="5" width="18" height="14" rx="2" fill="white" fillOpacity="0.9"/>
                  <path d="M7 9h10M7 12h6" stroke="#5b6e42" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-display font-800 text-ink text-lg leading-none">
                Nero<span className="text-olive-500">Connect</span>
              </span>
            </button>

            {/* Desktop links */}
            <div className="hidden lg:flex items-center gap-1 flex-1 overflow-x-auto">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => go(link.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-500 whitespace-nowrap transition-all duration-150 ${
                    current === link.id
                      ? 'bg-olive-50 text-olive-700 font-700'
                      : 'text-stone-600 hover:text-ink hover:bg-stone-50'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              {/* Quotation cart */}
              <button
                onClick={() => go('quotation')}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors text-stone-600 hover:text-ink"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
                </svg>
                {quotationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-olive-500 text-white text-xs font-700 rounded-full flex items-center justify-center leading-none">
                    {quotationCount}
                  </span>
                )}
              </button>

              {/* Account */}
              {isLoggedIn ? (
                <div className="relative group">
                  <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                    <div className="w-6 h-6 bg-olive-500 rounded-full flex items-center justify-center text-white text-xs font-700">
                      {user?.name?.[0] ?? 'U'}
                    </div>
                    <span className="text-sm font-500 text-ink hidden sm:block">{user?.name?.split(' ')[0]}</span>
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-stone-200 rounded-xl shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                    <button onClick={() => go('orders')} className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">My Orders</button>
                    <button onClick={() => go('loyalty')} className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">Membership</button>
                    <div className="border-t border-stone-100 my-1"/>
                    <button onClick={onLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">Log Out</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => go('auth')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-olive-500 hover:bg-olive-600 text-white text-sm font-display font-700 rounded-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
                  </svg>
                  Log In
                </button>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors text-stone-600"
              >
                {menuOpen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-stone-100 bg-white py-3 px-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => go(link.id)}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm font-500 transition-colors ${
                    current === link.id
                      ? 'bg-olive-50 text-olive-700 font-700'
                      : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>
            {!isLoggedIn && (
              <div className="mt-3 pt-3 border-t border-stone-100">
                <button
                  onClick={() => go('auth')}
                  className="w-full bg-olive-500 text-white font-display font-700 py-2.5 rounded-xl text-sm"
                >
                  Log In / Register
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Spacer for fixed nav */}
      <div className="h-16" />
    </>
  )
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('home')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([])

  function navigate(page: PageId) {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleLogin(u: User) {
    setUser(u)
    setIsLoggedIn(true)
  }

  function handleLogout() {
    setUser(null)
    setIsLoggedIn(false)
    navigate('home')
  }

  function addToQuotation(item: QuotationItem) {
    setQuotationItems((prev) => [...prev, item])
  }

  return (
    <div className="min-h-screen bg-parchment">
      <Nav
        current={currentPage}
        navigate={navigate}
        quotationCount={quotationItems.length}
        isLoggedIn={isLoggedIn}
        user={user}
        onLogout={handleLogout}
      />

      <main>
        {currentPage === 'home' && <Home navigate={navigate} />}
        {currentPage === 'auth' && (
          <Auth navigate={navigate} onLogin={handleLogin} />
        )}
        {currentPage === 'catalog' && <Catalog navigate={navigate} />}
        {currentPage === 'size-guide' && <SizeGuide />}
        {currentPage === 'customize' && (
          <Customize navigate={navigate} addToQuotation={addToQuotation} isLoggedIn={isLoggedIn} />
        )}
        {currentPage === 'mockup' && <Mockup3D isLoggedIn={isLoggedIn} navigate={navigate} />}
        {currentPage === 'quotation' && (
          <Quotation navigate={navigate} quotationItems={quotationItems} isLoggedIn={isLoggedIn} />
        )}
        {currentPage === 'orders' && (
          <OrderTracking navigate={navigate} isLoggedIn={isLoggedIn} />
        )}
        {currentPage === 'loyalty' && (
          <Loyalty navigate={navigate} isLoggedIn={isLoggedIn} user={user} />
        )}
        {currentPage === 'about' && <About />}
        {currentPage === 'contact' && <Contact />}
      </main>

      {/* Octavia chatbot widget */}
      <Octavia navigate={navigate} isLoggedIn={isLoggedIn} userName={user?.name} />
    </div>
  )
}
