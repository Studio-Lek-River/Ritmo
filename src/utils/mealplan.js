import { genId } from './genId';

export const CURRENT_USER_ID = 'local-self';

export const DEFAULT_MEALPLAN_CONFIG = {
  enabled: true,
  householdName: '',
  defaultStatus: 'yes',
  deadlineEnabled: true,
  deadlineTime: '14:00',
};

export function createSelfMember() {
  return { id: CURRENT_USER_ID, name: '', role: 'admin', color: 'amber' };
}

export function generateMemberId() {
  return genId('member');
}

export function generateGuestId() {
  return genId('guest');
}

// null-status erft de default; anders het expliciete value
export function effectiveStatus(rawStatus, defaultStatus) {
  return rawStatus ?? defaultStatus;
}

// Tel mee-eters + gasten voor een dag
export function countForDay(planForDate, members, defaultStatus) {
  if (!planForDate || !members) return 0;
  let count = 0;
  for (const member of members) {
    const entry = planForDate[member.id];
    const status = effectiveStatus(entry?.status ?? null, defaultStatus);
    if (status === 'yes') {
      count += 1 + (entry?.guests?.length ?? 0);
    }
  }
  return count;
}

// Is de deadline voor een bepaalde datum al verstreken?
export function isDeadlinePassed(dateKey, deadlineTime, deadlineEnabled) {
  if (!deadlineEnabled) return false;
  const [y, m, d] = dateKey.split('-').map(Number);
  const [h, min] = deadlineTime.split(':').map(Number);
  const deadline = new Date(y, m - 1, d, h, min, 0);
  return new Date() > deadline;
}

// Mag deze userId de status van memberId wijzigen?
export function canEditMember({ userId, userRole, memberId, deadlinePassed }) {
  if (deadlinePassed && userRole !== 'admin') return false;
  if (userId === memberId) return true;
  return userRole === 'admin';
}
