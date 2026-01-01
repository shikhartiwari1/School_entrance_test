import { useState, useEffect } from 'react';
import StudentEntry from './pages/StudentEntry';
import TestTaking from './pages/TestTaking';
import TestResult from './pages/TestResult';
import AdminPanel from './pages/AdminPanel';
import Navigation from './components/Navigation';
import Footer from './components/Footer';

type Page =
  | { type: 'home' }
  | { type: 'test'; testId: string; studentName: string; fatherName: string; classApplyingFor: string; retestKeyId?: string; isMasterKey?: boolean }
  | { type: 'result'; submissionId: string }
  | { type: 'admin' };

function App() {
  const [currentPage, setCurrentPage] = useState<Page>({ type: 'home' });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/azneeta-admin-2025') {
      setCurrentPage({ type: 'admin' });
      setIsAdmin(true);
    }
  }, []);

  const handleNavigation = (page: string) => {
    if (page === 'home') {
      setCurrentPage({ type: 'home' });
    } else if (page === 'admin-login-success') {
      setIsAdmin(true);
      setCurrentPage({ type: 'admin' });
    } else if (page === 'admin') {
      setCurrentPage({ type: 'admin' });
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setCurrentPage({ type: 'home' });
  };

  const navigateToTest = (
    testId: string,
    studentName: string,
    fatherName: string,
    classApplyingFor: string,
    retestKeyId?: string,
    isMasterKey?: boolean
  ) => {
    setCurrentPage({
      type: 'test',
      testId,
      studentName,
      fatherName,
      classApplyingFor,
      retestKeyId,
      isMasterKey
    });
  };

  const navigateToResult = (submissionId: string) => {
    setCurrentPage({ type: 'result', submissionId });
  };

  const navigateToHome = () => {
    setCurrentPage({ type: 'home' });
  };

  const currentPageType = currentPage.type === 'home' ? 'home' : currentPage.type === 'admin' ? 'admin' : 'other';

  return (
    <div className="flex flex-col min-h-screen">
      {currentPage.type !== 'admin' && currentPage.type !== 'test' && (
        <Navigation
          currentPage={currentPageType}
          isAdmin={isAdmin}
          onNavigate={handleNavigation}
          onAdminLogout={handleAdminLogout}
        />
      )}

      <div className="flex-1">
        {currentPage.type === 'admin' && <AdminPanel onLogout={handleAdminLogout} />}

        {currentPage.type === 'test' && (
          <TestTaking
            testId={currentPage.testId}
            studentName={currentPage.studentName}
            fatherName={currentPage.fatherName}
            classApplyingFor={currentPage.classApplyingFor}
            retestKeyId={currentPage.retestKeyId}
            isMasterKey={currentPage.isMasterKey}
            onComplete={navigateToResult}
          />
        )}

        {currentPage.type === 'result' && (
          <TestResult submissionId={currentPage.submissionId} onBackToHome={navigateToHome} />
        )}

        {currentPage.type === 'home' && (
          <StudentEntry onStartTest={navigateToTest} />
        )}
      </div>

      {currentPage.type !== 'test' && <Footer />}
    </div>
  );
}

export default App;
