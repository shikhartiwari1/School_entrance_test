import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generateRetestKey } from '../lib/slotManagement';
import { Copy, Trash2, Check, AlertCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Submission = Database['public']['Tables']['submissions']['Row'] & {
    tests: { title: string };
    slot_number: number;
    student_code: string;
};

interface RetestKey {
    id: string;
    key: string;
    student_name: string;
    created_at: string;
    is_used: boolean;
    expires_at: string;
    used_by_submission_id: string | null;
}

export default function ManageRetests() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [retestKeys, setRetestKeys] = useState<RetestKey[]>([]);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const [lastGeneratedKey, setLastGeneratedKey] = useState<{ key: string, name: string } | null>(null);

    useEffect(() => {
        loadSubmissions();
        loadRetestKeys();
    }, []);

    const loadSubmissions = async () => {
        const { data } = await supabase
            .from('submissions')
            .select('*, tests(title)')
            .in('status', ['completed', 'auto_submitted'])
            .order('submitted_at', { ascending: false })
            .limit(50); // Limit to recent 50 for performance

        if (data) setSubmissions(data as any);
    };

    const loadRetestKeys = async () => {
        const { data } = await supabase
            .from('retest_keys')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setRetestKeys(data);
    };

    const handleGenerateKey = async (submission: Submission) => {
        setGeneratingFor(submission.id);
        try {
            const key = generateRetestKey();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

            const { error } = await supabase
                .from('retest_keys')
                .insert({
                    submission_id: submission.id,
                    test_id: submission.test_id,
                    slot_number: submission.slot_number,
                    student_name: submission.student_name,
                    key: key,
                    expires_at: expiresAt
                });

            if (error) throw error;

            setLastGeneratedKey({ key, name: submission.student_name });
            loadRetestKeys();
        } catch (err) {
            console.error("Error generating key", err);
            alert("Failed to generate retest key");
        } finally {
            setGeneratingFor(null);
        }
    };

    const handleDeleteKey = async (id: string) => {
        if (!confirm("Delete this retest key?")) return;

        const { error } = await supabase
            .from('retest_keys')
            .delete()
            .eq('id', id);

        if (!error) loadRetestKeys();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    return (
        <div className="space-y-8">
            {/* Generate Retest Key Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Generate Retest Key</h2>
                <p className="text-sm text-gray-600 mb-4">Select a recent submission to generate a retest key. The key expires in 24 hours.</p>

                {lastGeneratedKey && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-green-800 font-bold">Key Generated for {lastGeneratedKey.name}</h3>
                            <p className="text-green-700 font-mono text-xl mt-1">{lastGeneratedKey.key}</p>
                            <p className="text-xs text-green-600 mt-1">Expires in 24 hours</p>
                        </div>
                        <button
                            onClick={() => copyToClipboard(lastGeneratedKey.key)}
                            className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-green-300 text-green-700 hover:bg-green-50 shadow-sm"
                        >
                            <Copy className="w-4 h-4" /> Copy
                        </button>
                    </div>
                )}

                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left">Student</th>
                                <th className="px-4 py-2 text-left">Test</th>
                                <th className="px-4 py-2 text-left">Score</th>
                                <th className="px-4 py-2 text-left">Date</th>
                                <th className="px-4 py-2 text-left">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {submissions.map(sub => (
                                <tr key={sub.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">
                                        <span className="font-medium block">{sub.student_name}</span>
                                        <span className="text-xs text-gray-500">{sub.student_code}</span>
                                    </td>
                                    <td className="px-4 py-2">{sub.tests?.title} (Slot {sub.slot_number})</td>
                                    <td className="px-4 py-2">
                                        <span className={sub.percentage && sub.percentage < 40 ? 'text-red-600' : 'text-green-600'}>
                                            {sub.percentage}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-500">
                                        {new Date(sub.submitted_at!).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-2">
                                        <button
                                            onClick={() => handleGenerateKey(sub)}
                                            disabled={generatingFor === sub.id}
                                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {generatingFor === sub.id ? 'Generating...' : 'Generate Key'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Retest History Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Retest Key History</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Key</th>
                                <th className="px-4 py-2 text-left">Student</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-left">Created At</th>
                                <th className="px-4 py-2 text-left">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {retestKeys.map(key => {
                                const isExpired = new Date(key.expires_at) < new Date();
                                return (
                                    <tr key={key.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-mono font-medium">{key.key}</td>
                                        <td className="px-4 py-2">{key.student_name}</td>
                                        <td className="px-4 py-2">
                                            {key.is_used ? (
                                                <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded text-xs">
                                                    <Check className="w-3 h-3" /> Used
                                                </span>
                                            ) : isExpired ? (
                                                <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded text-xs">
                                                    <AlertCircle className="w-3 h-3" /> Expired
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-1 rounded text-xs">
                                                    Unused
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-gray-500">
                                            {new Date(key.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2">
                                            {!key.is_used && (
                                                <button
                                                    onClick={() => handleDeleteKey(key.id)}
                                                    className="text-red-600 hover:bg-red-50 p-1 rounded"
                                                    title="Delete Unused Key"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
