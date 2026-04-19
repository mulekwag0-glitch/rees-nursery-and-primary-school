import { supabase } from '@/integrations/supabase/client';

interface NotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

export async function sendNotification({ userId, title, message, type = 'info', link }: NotificationParams) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    link,
  });
  if (error) console.error('Failed to send notification:', error);
}

export async function notifyStudentAdmitted(studentUserId: string, studentId: string, programName: string) {
  await sendNotification({
    userId: studentUserId,
    title: 'Welcome to Rees Daycare Nursery & Primary School!',
    message: `You have been admitted as ${studentId} in ${programName}. Please change your temporary password.`,
    type: 'success',
    link: '/profile',
  });
}

export async function notifyPaymentRecorded(studentUserId: string, amount: number, receiptNumber: string) {
  await sendNotification({
    userId: studentUserId,
    title: 'Payment Received',
    message: `Payment of UGX ${amount.toLocaleString()} recorded. Receipt: ${receiptNumber}`,
    type: 'success',
    link: '/payments',
  });
}

export async function notifyResultsApproved(studentUserId: string, courseName: string) {
  await sendNotification({
    userId: studentUserId,
    title: 'Results Published',
    message: `Results for ${courseName} have been approved and published.`,
    type: 'info',
    link: '/results',
  });
}

export async function notifyResultsSubmitted(adminUserIds: string[], tutorName: string, courseName: string) {
  for (const adminId of adminUserIds) {
    await sendNotification({
      userId: adminId,
      title: 'Results Submitted',
      message: `${tutorName} submitted results for ${courseName}. Review and approve.`,
      type: 'warning',
      link: '/results',
    });
  }
}

export async function notifyDocumentGenerated(adminUserIds: string[], studentName: string, documentType: 'transcript' | 'certificate') {
  const docLabel = documentType === 'transcript' ? 'Academic Transcript' : 'Certificate of Completion';
  for (const adminId of adminUserIds) {
    await sendNotification({
      userId: adminId,
      title: `${docLabel} Generated`,
      message: `${docLabel} for ${studentName} was generated and printed.`,
      type: 'info',
      link: '/transcripts',
    });
  }
}
