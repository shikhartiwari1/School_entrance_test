import { useState } from 'react';
import { LogOut } from 'lucide-react';

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

  return (
    <>
      <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="relative flex items-center justify-center min-h-[56px]">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => onNavigate('home')}>
              <img
                src="/logo.jpeg"
                alt="Azneeta Academy Logo"
                className="w-16 h-16 rounded-full object-cover shadow-sm"
              />
              <div className="text-center">
                <h1 className="font-bold text-2xl text-gray-900 leading-tight">Azneeta Academy</h1>
                <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">Entrance Examination Portal</p>
              </div>
            </div>

            <div className="absolute right-0 flex items-center gap-4">
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
