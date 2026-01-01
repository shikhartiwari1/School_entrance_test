import { useState, useEffect } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import { getOrCreateSlot, getOrCreateAccessCode } from '../lib/slotManagement';
import { supabase } from '../lib/supabase';

interface SlotAccessCodeProps {
    testId: string;
}

export default function SlotAccessCode({ testId }: SlotAccessCodeProps) {
    const [code, setCode] = useState<string | null>(null);
    const [slotNumber, setSlotNumber] = useState<number>(0);
    const [expiry, setExpiry] = useState<Date | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [statusColor, setStatusColor] = useState<'green' | 'yellow' | 'red'>('green');
    const [loading, setLoading] = useState(false);

    const fetchCode = async () => {
        setLoading(true);
        try {
            const slot = await getOrCreateSlot(testId);
            setSlotNumber(slot.slot_number);
            const accessCode = await getOrCreateAccessCode(slot.id);
            setCode(accessCode);

            // Fetch expiry from DB for the code
            const { data } = await supabase
                .from('access_codes')
                .select('valid_until')
                .eq('code', accessCode)
                .single();

            if (data) {
                setExpiry(new Date((data as any).valid_until));
            }
        } catch (error) {
            console.error('Error fetching code:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchCode();
    }, [testId]);

    // Timer logic
    useEffect(() => {
        if (!expiry) return;

        const updateTimer = () => {
            const now = new Date();
            const diff = expiry.getTime() - now.getTime();

            if (diff <= 0) {
                // Expired, refresh automatically if not already loading
                if (!loading) {
                    fetchCode();
                }
                setTimeLeft('Expired');
                setStatusColor('red');
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                // Display HH:MM
                setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);

                if (diff < 10 * 60 * 1000) { // Less than 10 mins
                    setStatusColor('yellow');
                } else {
                    setStatusColor('green');
                }
            }
        };

        updateTimer(); // Run immediately
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [expiry]);

    if (!code) return <span className="text-gray-400">Loading...</span>;

    return (
        <div className={`flex flex-col items-start p-2 rounded-lg border ${statusColor === 'green' ? 'bg-green-50 border-green-200' :
            statusColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
            }`}>
            <div className="flex items-center gap-2 mb-1">
                <span className="font-mono font-bold text-lg tracking-wider text-gray-800">
                    {code} <span className="text-xs font-sans text-gray-500 font-normal">(Slot {slotNumber})</span>
                </span>
                <button
                    onClick={fetchCode}
                    disabled={loading}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                    title="Refresh Code"
                >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <div className={`text-xs flex items-center gap-1 ${statusColor === 'green' ? 'text-green-700' :
                statusColor === 'yellow' ? 'text-yellow-700' :
                    'text-red-700'
                }`}>
                <Clock className="w-3 h-3" />
                <span>Expires in {timeLeft}</span>
            </div>
        </div>
    );
}
