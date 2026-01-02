import { useState } from 'react';
import { LogOut, Menu, X as CloseIcon } from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  isAdmin: boolean;
  onNavigate: (page: string) => void;
  onAdminLogout: () => void;
}

export default function Navigation({
  currentPage,
  isAdmin,
  onNavigate,
  onAdminLogout,
}: NavigationProps) {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (adminPassword === 'Azneeeta@071931_admin-2025') {
      onNavigate('admin-login-success');
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      setPasswordError('Invalid admin password');
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <>
      <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center md:justify-center relative min-h-[56px]">
            <div className="flex items-center gap-3 md:gap-4 cursor-pointer md:mx-auto" onClick={() => onNavigate('home')}>
              <img
                src="/logo.jpeg"
                alt="Azneeta Academy Logo"
                className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover shadow-sm"
              />
              <div>
                <h1 className="font-bold text-lg md:text-2xl text-gray-900 leading-tight">Azneeta Academy</h1>
                <p className="text-[10px] md:text-sm font-medium text-blue-600 uppercase tracking-wider">Entrance Examination Portal</p>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              onClick={toggleMenu}
            >
              {isMenuOpen ? <CloseIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4 absolute right-0">
              {!isAdmin ? (
                <>
                  <button
                    onClick={() => onNavigate('home')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${currentPage === 'home'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    Student Entry
                  </button>

                  <button
                    onClick={() => setShowAdminLogin(true)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                  >
                    Admin
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onNavigate('admin')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${currentPage === 'admin'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    Admin Panel
                  </button>

                  <button
                    onClick={onAdminLogout}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Navigation Dropdown */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
              {!isAdmin ? (
                <>
                  <button
                    onClick={() => {
                      onNavigate('home');
                      setIsMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${currentPage === 'home'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Student Entry
                  </button>

                  <button
                    onClick={() => {
                      setShowAdminLogin(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium transition"
                  >
                    Admin Portal
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onNavigate('admin');
                      setIsMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${currentPage === 'admin'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Admin Panel
                  </button>

                  <button
                    onClick={() => {
                      onAdminLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 bg-red-50 text-red-600 rounded-lg font-medium transition flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {showAdminLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Access</h2>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter admin password"
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-red-600 text-sm mt-2">{passwordError}</p>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminLogin(false);
                      setAdminPassword('');
                      setPasswordError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                  >
                    Login
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
