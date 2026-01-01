import { supabase } from './supabase';

const SLOT_DURATION_MINUTES = 120;

export function getSlotNumber(): number {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const elapsed = now.getTime() - startOfDay.getTime();
  const slotDuration = SLOT_DURATION_MINUTES * 60 * 1000;
  return Math.floor(elapsed / slotDuration) + 1;
}

export function getSlotStartAndEnd(slotNumber: number): { start: Date; end: Date } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const slotDuration = SLOT_DURATION_MINUTES * 60 * 1000;

  const start = new Date(startOfDay.getTime() + (slotNumber - 1) * slotDuration);
  const end = new Date(start.getTime() + slotDuration);

  return { start, end };
}

export function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateRetestKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 8; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function getOrCreateSlot(testId: string): Promise<{ id: string; slot_number: number }> {
  const slotNumber = getSlotNumber();
  const { start, end } = getSlotStartAndEnd(slotNumber);

  const { data: existingSlot, error: fetchError } = await supabase
    .from('slots')
    .select('id, slot_number')
    .eq('test_id', testId)
    .eq('slot_number', slotNumber)
    .limit(1)
    .maybeSingle();

  if (existingSlot) {
    return { id: existingSlot.id, slot_number: existingSlot.slot_number };
  }

  const { data: newSlot, error: insertError } = await supabase
    .from('slots')
    .insert({
      test_id: testId,
      slot_number: slotNumber,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_minutes: SLOT_DURATION_MINUTES,
    })
    .select('id, slot_number')
    .single();

  if (insertError) throw insertError;
  return newSlot;
}

export async function getOrCreateAccessCode(slotId: string): Promise<string> {
  const { data: existingCode, error: fetchError } = await supabase
    .from('access_codes')
    .select('code')
    .eq('slot_id', slotId)
    .gt('valid_until', new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (existingCode) {
    return existingCode.code;
  }

  const code = generateAccessCode();
  const validUntil = new Date(Date.now() + SLOT_DURATION_MINUTES * 60 * 1000).toISOString();

  const { data: newCode, error: insertError } = await supabase
    .from('access_codes')
    .insert({
      slot_id: slotId,
      code,
      valid_until: validUntil,
    })
    .select('code')
    .single();

  if (insertError) throw insertError;
  return newCode.code;
}

export async function validateAccessCode(
  testId: string,
  code: string
): Promise<{ valid: boolean; slotNumber: number; reason?: string }> {
  console.log('Validating code (NEW STRATEGY):', { code, testId });

  // Strategy: Fetch ALL slots for this test with their access codes
  // This mimics the Admin Panel approach which is known to work.
  const { data: slots, error: slotsError } = await supabase
    .from('slots')
    .select(`
      slot_number,
      test_id,
      access_codes (
        code,
        valid_until
      )
    `)
    .eq('test_id', testId);

  if (slotsError) {
    console.error('Error fetching slots:', slotsError);
    return { valid: false, slotNumber: 0, reason: 'Database error fetching slots' };
  }

  if (!slots || slots.length === 0) {
    return { valid: false, slotNumber: 0, reason: 'No slots found for this test' };
  }

  // Find the matching code in the fetched data
  let foundSlot = null;
  let foundCode = null;

  for (const slot of slots) {
    if (slot.access_codes && Array.isArray(slot.access_codes)) {
      for (const ac of slot.access_codes) {
        if (ac.code === code) {
          foundSlot = slot;
          foundCode = ac;
          break;
        }
      }
    }
    if (foundSlot) break;
  }

  if (!foundCode || !foundSlot) {
    console.log('Code not found in any slot.');
    return { valid: false, slotNumber: 0, reason: 'Code not found' };
  }

  // Check Expiry
  if (new Date(foundCode.valid_until) <= new Date()) {
    return { valid: false, slotNumber: 0, reason: 'Code has expired' };
  }

  console.log('Validation successful via nested query');
  return { valid: true, slotNumber: foundSlot.slot_number };
}

export function generateStudentCode(className: string, studentName: string, serial: number): string {
  const classNumber = className.replace('Class ', '');
  const nameInitials = studentName
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .join('');
  const serialStr = serial.toString().padStart(4, '0');
  // Add random suffix to ensure uniqueness and prevent collision errors
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AZN-${classNumber}-${nameInitials}-${serialStr}-${randomSuffix}`;
}

export async function getNextSerialForSlot(
  testId: string,
  slotNumber: number,
  className: string
): Promise<number> {
  const { count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('test_id', testId)
    .eq('slot_number', slotNumber)
    .eq('class_applying_for', className);

  return (count || 0) + 1;
}

export async function checkAlreadyAttempted(
  testId: string,
  slotNumber: number,
  studentName: string,
  fatherName: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('submissions')
    .select('id')
    .eq('test_id', testId)
    .eq('slot_number', slotNumber)
    .eq('student_name', studentName)
    .eq('father_name', fatherName)
    .eq('status', 'completed')
    .maybeSingle();

  return !!existing;
}

export async function validateRetestKey(
  key: string,
  testId: string
): Promise<{
  valid: boolean;
  retestKeyId?: string;
  originalSubmissionId?: string;
  studentName?: string;
  isMasterKey?: boolean;
}> {
  // Check for master key
  if (key === 'Azneeta-entrance_retest') {
    return { valid: true, isMasterKey: true };
  }

  const { data: retestKey, error } = await supabase
    .from('retest_keys')
    .select('*')
    .eq('key', key)
    .eq('test_id', testId)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!retestKey) {
    return { valid: false };
  }

  return {
    valid: true,
    retestKeyId: retestKey.id,
    originalSubmissionId: retestKey.submission_id,
    studentName: retestKey.student_name
  };
}

export async function invalidatePreviousSubmission(
  testId: string,
  slotNumber: number,
  studentName: string,
  fatherName: string,
  retestKeyId?: string
): Promise<void> {
  // Find the previous completed/auto_submitted submission
  const { data: previousSubmission } = await supabase
    .from('submissions')
    .select('id')
    .eq('test_id', testId)
    .eq('slot_number', slotNumber)
    .eq('student_name', studentName)
    .eq('father_name', fatherName)
    .in('status', ['completed', 'auto_submitted'])
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousSubmission) {
    // Determine update data
    const updateData: any = {
      status: 'invalidated_by_retest'
    };

    // Use unsafe direct update if type checking fails for the status, 
    // strictly speaking should work if migration is applied.
    await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', previousSubmission.id);
  }

  // If a retest key was used (not master key), mark it as used
  if (retestKeyId) {
    // We can't link the NEW submission ID here yet because this runs before the new one is created?
    // Actually, usually we mark the key as used AFTER the new submission is created or DURING.
    // The prompt says "mark the previous submission as 'invalidated_by_retest'".
    // And "update the submissions table by adding a retest_key_used reference" (for the NEW submission).
    // And "retest_keys table... is_used, used_by_submission_id".

    // We should probably mark the retest key as used only when the new submission is created.
    // So this function might just handle the invalidation of the OLD submission.
  }
}

export async function markRetestKeyAsUsed(keyId: string, newSubmissionId: string) {
  await supabase
    .from('retest_keys')
    .update({
      is_used: true,
      used_by_submission_id: newSubmissionId
    })
    .eq('id', keyId);
}
