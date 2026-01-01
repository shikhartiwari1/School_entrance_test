import * as XLSX from 'xlsx';
import type { Database } from './database.types';

type Submission = Database['public']['Tables']['submissions']['Row'];

export function exportToExcel(submissions: Submission[]) {
  const worksheetData = submissions.map((submission) => ({
    'Student Code': submission.student_code || 'N/A',
    'Student Name': submission.student_name,
    "Father's Name": submission.father_name || 'N/A',
    'Class Applying For': submission.class_applying_for,
    'Slot Number': submission.slot_number || 'N/A',
    'Score': submission.score,
    'Total Marks': submission.total_marks,
    'Percentage': submission.percentage.toFixed(2) + '%',
    'Correct Answers': submission.correct_count,
    'Wrong Answers': submission.wrong_count,
    'Tab Switches': submission.tab_switch_count,
    'Malpractice Detected': submission.malpractice_detected ? 'Yes' : 'No',
    'Time Taken (minutes)': (submission.time_taken_seconds / 60).toFixed(2),
    'Status': submission.status,
    'Needs Manual Review': submission.needs_manual_review ? 'Yes' : 'No',
    'Submitted At': submission.submitted_at
      ? new Date(submission.submitted_at).toLocaleString()
      : 'N/A',
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Results');

  const colWidths = [
    { wch: 16 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `Test_Results_${new Date().toISOString().split('T')[0]}.xlsx`);
}
