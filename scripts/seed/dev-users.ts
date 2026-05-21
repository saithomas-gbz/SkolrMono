/**
 * Stable dev IDs shared across service seeds (auth → class, future services).
 * Keep in sync when adding personas or entities.
 */
export const DEV_USER_IDS = {
  admin: '11111111-1111-1111-1111-111111111101',
  user: '11111111-1111-1111-1111-111111111102',
  teacher: '11111111-1111-1111-1111-111111111103',
  student: '11111111-1111-1111-1111-111111111104',
} as const;

export const DEV_CLASS_IDS = {
  cm2a: '22222222-2222-2222-2222-222222222201',
  sciences6: '22222222-2222-2222-2222-222222222202',
} as const;
