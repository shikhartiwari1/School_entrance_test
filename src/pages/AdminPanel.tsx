import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Users,
  BarChart,
  LayoutDashboard,
  RotateCcw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportToExcel } from '../lib/excelExport';
import type { Database } from '../lib/database.types';
import CreateTestModal from '../components/CreateTestModal';
import ViewResultsModal from '../components/ViewResultsModal';
import SlotAccessCode from '../components/SlotAccessCode';
import ManageRetests from '../components/ManageRetests';

type Test = Database['public']['Tables']['tests']['Row'];

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'retests'>('dashboard');
  const [tests, setTests] = useState<Test[]>([]);
  // ... rest of state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [viewingTestResults, setViewingTestResults] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalTests: 0,
    publishedTests: 0,
    totalSubmissions: 0,
  });

  useEffect(() => {
    loadTests();
    loadStats();
  }, []);

  const loadTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error('Error loading tests:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { count: totalTests } = await supabase
        .from('tests')
        .select('*', { count: 'exact', head: true });

      const { count: publishedTests } = await supabase
        .from('tests')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      const { count: totalSubmissions } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalTests: totalTests || 0,
        publishedTests: publishedTests || 0,
        totalSubmissions: totalSubmissions || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.from('tests').delete().eq('id', testId);

      if (error) throw error;
      loadTests();
      loadStats();
    } catch (error) {
      console.error('Error deleting test:', error);
      alert('Failed to delete test');
    }
  };

  const handleTogglePublish = async (test: Test) => {
    try {
      const { error } = await (supabase.from('tests') as any)
        .update({ is_published: !test.is_published })
        .eq('id', test.id);

      if (error) throw error;
      loadTests();
      loadStats();
    } catch (error) {
      console.error('Error toggling publish:', error);
      alert('Failed to update test status');
    }
  };

  const handleExportResults = async (testId: string) => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('test_id', testId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('No submissions found for this test');
        return;
      }

      exportToExcel(data);
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Failed to export results');
    }
  };

  const handleTestCreated = () => {
    setShowCreateModal(false);
    setEditingTest(null);
    loadTests();
    loadStats();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 min-h-[56px] py-2 md:py-0">
            <div
              className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition w-full md:w-auto justify-center md:justify-start"
              onClick={() => setActiveTab('dashboard')}
            >
              <img
                src="/logo.jpeg"
                alt="Azneeta Academy Logo"
                className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-white/20 shadow-sm"
              />
              <div className="text-center md:text-left">
                <h1 className="text-lg md:text-2xl font-bold leading-tight uppercase tracking-wide">Azneeta Academy</h1>
                <p className="text-[10px] md:text-xs text-blue-100 font-medium">Entrance Examination Portal | Admin Console</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 w-full md:w-auto">
              <nav className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-3 py-1.5 md:py-2 rounded-lg transition text-xs md:text-sm font-medium ${activeTab === 'dashboard' ? 'bg-white/20 text-white' : 'text-blue-100 hover:bg-white/10'
                    }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('retests')}
                  className={`flex items-center gap-2 px-3 py-1.5 md:py-2 rounded-lg transition text-xs md:text-sm font-medium ${activeTab === 'retests' ? 'bg-white/20 text-white' : 'text-blue-100 hover:bg-white/10'
                    }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Retests</span>
                </button>
              </nav>
              <div className="hidden md:block h-6 w-px bg-blue-400 mx-1"></div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium text-red-100 hover:bg-red-500/20 hover:text-white transition bg-white/10 md:bg-transparent"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-sm md:text-base text-gray-600">Manage your tests and view student results</p>
          </div>
          <button
            onClick={() => {
              setEditingTest(null);
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Test</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 md:mb-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 border-b-2 font-medium text-sm md:text-base transition whitespace-nowrap ${activeTab === 'dashboard'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <LayoutDashboard className="w-4 h-4 md:w-5 md:h-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('retests')}
            className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 border-b-2 font-medium text-sm md:text-base transition whitespace-nowrap ${activeTab === 'retests'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
            Manage Retests
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                  <FileText className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Total Tests</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalTests}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                  <BarChart className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Live Tests</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.publishedTests}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                  <Users className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Total Submissions</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-100">
                <h3 className="text-lg md:text-xl font-bold text-gray-900">Manage Tests</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap md:whitespace-normal">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Test Information</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Duration & Marks</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Access Codes</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tests.map((test) => (
                      <tr key={test.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 md:px-6 py-4">
                          <span className="text-sm md:text-base font-semibold text-gray-900 block truncate max-w-[200px] md:max-w-none">{test.title}</span>
                          <span className="text-[10px] md:text-xs text-gray-500 block truncate max-w-[200px] md:max-w-none">{test.description}</span>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <span className="text-sm md:text-base text-gray-700 block">{test.duration_minutes} Mins</span>
                          <span className="text-[10px] md:text-xs text-gray-500">{test.total_marks} Marks</span>
                        </td>
                        <td className="px-4 md:px-6 py-4 min-w-[150px]">
                          <SlotAccessCode testId={test.id} />
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <button
                            onClick={() => handleTogglePublish(test)}
                            className={`inline-flex px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold uppercase transition ${test.is_published
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}
                          >
                            {test.is_published ? 'Live' : 'Draft'}
                          </button>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-center gap-1 md:gap-2">
                            <button
                              onClick={() => setViewingTestResults(test.id)}
                              className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="View Results"
                            >
                              <Users className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingTest(test);
                                setShowCreateModal(true);
                              }}
                              className="p-1.5 md:p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                              title="Edit Test"
                            >
                              <Edit className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTest(test.id)}
                              className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Test"
                            >
                              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <ManageRetests />
        )}
      </main>

      {showCreateModal && (
        <CreateTestModal
          test={editingTest}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTest(null);
          }}
          onSuccess={handleTestCreated}
        />
      )}

      {viewingTestResults && (
        <ViewResultsModal
          testId={viewingTestResults}
          onClose={() => setViewingTestResults(null)}
        />
      )}
    </div>
  );
}
