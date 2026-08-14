/**
 * College Registry — Edu-domain gating for Clerk authentication
 * Maps tenant IDs to their official .edu email domains.
 */

export interface College {
  id: string;
  name: string;
  shortName: string;
  emailDomain: string;
  description: string;
  color: string;
  logo?: string;
}

export const COLLEGES: College[] = [
  {
    id: 'college-nitk-003',
    name: 'National Institute of Technology Karnataka',
    shortName: 'NITK Surathkal',
    emailDomain: 'nitk.edu.in',
    description: 'Mangalore, Karnataka',
    color: '#006B3F',
    logo: '🎓'
  }
];

export function getCollegeById(id: string): College | undefined {
  return COLLEGES.find((c) => c.id === id);
}

export function getCollegeBySlug(slug: string): College | undefined {
  return COLLEGES.find((c) => c.id.endsWith(`-${slug}`) || c.id.includes(slug));
}

export function getCollegeForEmail(email: string): College | undefined {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return undefined;
  return COLLEGES.find((c) => c.emailDomain.toLowerCase() === domain);
}

export function isEmailAllowedForCollege(email: string, collegeId: string): boolean {
  const college = getCollegeById(collegeId);
  if (!college) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain === college.emailDomain.toLowerCase();
}

export function getDefaultCollege(): College {
  return COLLEGES[0];
}