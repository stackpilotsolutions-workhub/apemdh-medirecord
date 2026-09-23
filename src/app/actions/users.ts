'use server';

import { getDb, saveDb, hashPassword } from '@/lib/services/db';
import { getCurrentUser, logAuditEvent } from '@/lib/services/auth';
import { User, UserRole } from '@/lib/types';
import { forceResetPassword } from '@/lib/services/auth';

export async function getUsersAction(): Promise<User[]> {
  const adminUser = await getCurrentUser();
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const db = await getDb();
  // Return user profiles without password hashes
  return db.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    title_position: u.title_position || '',
    address: u.address || '',
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt,
  }));
}

export async function createUserAction(data: {
  name: string;
  email: string;
  role: UserRole;
  title_position?: string;
  address?: string;
}): Promise<User> {
  const adminUser = await getCurrentUser();
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const db = await getDb();
  const exists = db.users.some(
    (u) => u.email.toLowerCase() === data.email.toLowerCase()
  );
  if (exists) {
    throw new Error('An account with this email address already exists.');
  }

  // Pre-configured temporary password
  const tempPassword = `Temp-${Math.random().toString(36).substring(2, 7)}!`;
  const defaultHash = hashPassword(tempPassword);

  const newUser = {
    id: `usr_${Date.now()}`,
    name: data.name,
    email: data.email,
    role: data.role,
    title_position: data.title_position?.trim() || '',
    address: data.address?.trim() || '',
    status: 'ACTIVE' as const,
    mustChangePassword: true,
    passwordHash: defaultHash,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  await saveDb(db);

  await logAuditEvent(
    adminUser.id,
    adminUser.email,
    adminUser.role,
    'USER_CREATE',
    `Created new ${data.role} account: ${data.name} (${data.email})`
  );

  // Return user profile and the temporary password (to display to admin)
  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    status: newUser.status,
    title_position: newUser.title_position,
    address: newUser.address,
    mustChangePassword: newUser.mustChangePassword,
    createdAt: newUser.createdAt,
    // Hack: Append temporary password so client can display it once
    notes: tempPassword,
  } as any;
}

export async function toggleUserStatusAction(userId: string): Promise<User> {
  const adminUser = await getCurrentUser();
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  if (userId === adminUser.id) {
    throw new Error('You cannot deactivate your own administrator account.');
  }

  const db = await getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found.');

  user.status = user.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
  await saveDb(db);

  await logAuditEvent(
    adminUser.id,
    adminUser.email,
    adminUser.role,
    'USER_STATUS_CHANGE',
    `Updated status of ${user.name} (${user.email}) to ${user.status}`
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  };
}

export async function resetUserPasswordAction(userId: string): Promise<string> {
  const adminUser = await getCurrentUser();
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const tempPassword = await forceResetPassword(adminUser.id, userId);
  return tempPassword;
}
