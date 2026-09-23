import { cookies } from 'next/headers';
import { getDb, saveDb, hashPassword } from './db';
import { User, UserRole, AuditLog } from '../types';

const SESSION_COOKIE_NAME = 'medirecord_session';
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

interface SessionData {
  userId: string;
  role: UserRole;
  email: string;
  name: string;
  mustChangePassword: boolean;
  lastActive: string; // ISO string
}

// Log audit helpers
export async function logAuditEvent(
  userId: string,
  userEmail: string,
  userRole: UserRole,
  action: AuditLog['action'],
  description: string,
  ipAddress?: string
): Promise<void> {
  const db = await getDb();
  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    userEmail,
    userRole,
    action,
    description,
    ipAddress: ipAddress || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(newLog); // Put at the top of the array
  await saveDb(db);
}

export async function login(email: string, password: string, ipAddress?: string): Promise<User> {
  console.log('====== [LOGIN DEBUG START] ======');
  console.log('Attempting login for:', email);

  const db = await getDb();
  
  console.log('Total users loaded in DB object:', db?.users?.length || 0);
  console.log('Emails found in DB:', db?.users?.map((u) => u.email) || []);

  const userRecord = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!userRecord) {
    console.error('❌ LOGIN FAIL: Email not found in loaded DB array.');
    console.log('====== [LOGIN DEBUG END] ======');
    throw new Error('Invalid email or password.');
  }

  console.log('User found:', userRecord.email, '| Role:', userRecord.role, '| Status:', userRecord.status);

  if (userRecord.status === 'DEACTIVATED') {
    console.error('❌ LOGIN FAIL: Account status is DEACTIVATED.');
    console.log('====== [LOGIN DEBUG END] ======');
    throw new Error('This account has been deactivated. Please contact the administrator.');
  }

  const hashedPassword = hashPassword(password);
  console.log('Password provided:', password);
  console.log('Computed hash:   ', hashedPassword);
  console.log('Stored DB hash:  ', userRecord.passwordHash);

  if (userRecord.passwordHash !== hashedPassword) {
    console.error('❌ LOGIN FAIL: Password hash mismatch.');
    console.log('====== [LOGIN DEBUG END] ======');
    throw new Error('Invalid email or password.');
  }

  console.log('✅ LOGIN SUCCESS: Credentials verified.');
  console.log('====== [LOGIN DEBUG END] ======');

  // Create session
  const sessionData: SessionData = {
    userId: userRecord.id,
    role: userRecord.role,
    email: userRecord.email,
    name: userRecord.name,
    mustChangePassword: !!userRecord.mustChangePassword,
    lastActive: new Date().toISOString(),
  };

  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: Buffer.from(JSON.stringify(sessionData)).toString('base64'),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day cookie, but session timeout logic will limit to 15m of inactivity
  });

  // Log audit
  await logAuditEvent(
    userRecord.id,
    userRecord.email,
    userRecord.role,
    'LOGIN',
    `${userRecord.name} logged in successfully`,
    ipAddress
  );

  return {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    role: userRecord.role,
    status: userRecord.status,
    mustChangePassword: userRecord.mustChangePassword,
    createdAt: userRecord.createdAt,
  };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (sessionCookie) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      const sessionData: SessionData = JSON.parse(decoded);
      const db = await getDb();
      const user = db.users.find((u) => u.id === sessionData.userId);
      if (user) {
        await logAuditEvent(user.id, user.email, user.role, 'LOGOUT', `${user.name} logged out`);
      }
    } catch (_) {}
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie) return null;

  try {
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    const sessionData: SessionData = JSON.parse(decoded);
    
    // Check timeout
    const lastActiveTime = new Date(sessionData.lastActive).getTime();
    const currentTime = Date.now();
    
    if (currentTime - lastActiveTime > SESSION_TIMEOUT_MS) {
      // Inactivity limit reached, destroy session
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    const db = await getDb();
    const user = db.users.find((u) => u.id === sessionData.userId);
    if (!user || user.status === 'DEACTIVATED') return null;

    // Session is valid. Update last active timestamp and sync mustChangePassword database status
    sessionData.lastActive = new Date().toISOString();
    sessionData.mustChangePassword = !!user.mustChangePassword;

    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: Buffer.from(JSON.stringify(sessionData)).toString('base64'),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
    };
  } catch (error) {
    console.error('Failed to parse current user session cookie', error);
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }
}

export async function changePassword(
  userId: string,
  oldPassword?: string, // optional for admin force reset logic
  newPassword?: string,
  ipAddress?: string
): Promise<void> {
  if (!newPassword) throw new Error('New password is required.');

  const db = await getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found.');

  // If oldPassword is provided, verify it first (user self-change)
  if (oldPassword) {
    const oldHash = hashPassword(oldPassword);
    if (user.passwordHash !== oldHash) {
      throw new Error('Incorrect current password.');
    }
  }

  // Update password
  user.passwordHash = hashPassword(newPassword);
  user.mustChangePassword = false;
  await saveDb(db);

  // Directly update the session cookie if it exists to unlock user access in the middleware
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (sessionCookie) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      const sessionData: SessionData = JSON.parse(decoded);
      sessionData.mustChangePassword = false;
      sessionData.lastActive = new Date().toISOString();
      
      cookieStore.set({
        name: SESSION_COOKIE_NAME,
        value: Buffer.from(JSON.stringify(sessionData)).toString('base64'),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24,
      });
    } catch (_) {}
  }

  await logAuditEvent(
    user.id,
    user.email,
    user.role,
    'PASSWORD_CHANGE',
    `Password updated successfully`,
    ipAddress
  );
}

export async function forceResetPassword(
  adminId: string,
  targetUserId: string,
  ipAddress?: string
): Promise<string> {
  const db = await getDb();
  const admin = db.users.find((u) => u.id === adminId);
  const target = db.users.find((u) => u.id === targetUserId);

  if (!admin || admin.role !== 'ADMIN') {
    throw new Error('Unauthorized action.');
  }

  if (!target) {
    throw new Error('User account not found.');
  }

  // Generate temporary password
  const tempPassword = `TempPass-${Math.random().toString(36).substring(2, 7)}!`;
  target.passwordHash = hashPassword(tempPassword);
  target.mustChangePassword = true;
  await saveDb(db);

  await logAuditEvent(
    admin.id,
    admin.email,
    admin.role,
    'PASSWORD_RESET',
    `Administratively reset password for ${target.name} (${target.email})`,
    ipAddress
  );

  return tempPassword;
}
