import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
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
          <div className="relative flex items-center justify-center min-h-[56px]">
            <div
              className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition"
              onClick={() => setActiveTab('dashboard')}
            >
              <img
                src="/logo.jpeg"
                alt="Azneeta Academy Logo"
                className="w-16 h-16 rounded-full object-cover border-2 border-white/20 shadow-sm"
              />
              <div className="text-center">
                <h1 className="text-2xl font-bold leading-tight uppercase tracking-wide">Azneeta Academy</h1>
                <p className="text-xs text-blue-100 font-medium">Entrance Examination Portal | Admin Console</p>
              </div>
            </div>

            <div className="absolute right-0 flex items-center gap-4">
              <nav className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm font-medium ${activeTab === 'dashboard' ? 'bg-white/20 text-white' : 'text-blue-100 hover:bg-white/10'
                    }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('retests')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm font-medium ${activeTab === 'retests' ? 'bg-white/20 text-white' : 'text-blue-100 hover:bg-white/10'
                    }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  Manage Retests
                </button>
              </nav>
              <div className="h-6 w-px bg-blue-400 mx-2"></div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-100 hover:bg-red-500/20 hover:text-white transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {activeTab === 'dashboard' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Tests</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalTests}</p>
                  </div>
                  <FileText className="w-10 h-10 text-blue-500 opacity-80" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Published Tests</p>
                    <p className="text-3xl font-bold text-green-600">{stats.publishedTests}</p>
                  </div>
                  <BarChart className="w-10 h-10 text-green-500 opacity-80" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Submissions</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.totalSubmissions}</p>
                  </div>
                  <Users className="w-10 h-10 text-purple-500 opacity-80" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-500" /> All Tests
                  </h2>
                  <button
                    onClick={() => {
                      setEditingTest(null);
                      setShowCreateModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create New Test
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Test Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Duration & Marks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Current Slot Access Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No tests created yet. Click "Create New Test" to get started.
                        </td>
                      </tr>
                    ) : (
                      tests.map((test) => (
                        <tr key={test.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{test.title}</p>
                              {test.description && (
                                <p className="text-xs text-gray-500 mt-1 max-w-xs truncate">{test.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <div className="flex flex-col">
                              <span>{test.duration_minutes} min</span>
                              <span className="text-gray-500 text-xs">{test.total_marks} Marks</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <SlotAccessCode testId={test.id} />
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleTogglePublish(test)}
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${test.is_published
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                                }`}
                            >
                              {test.is_published ? 'Published' : 'Unpublished'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingTest(test);
                                  setShowCreateModal(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit Test"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setViewingTestResults(test.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                title="View Results"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleExportResults(test.id)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                title="Export to Excel"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTest(test.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete Test"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <ManageRetests />
        )}
      </div>

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
