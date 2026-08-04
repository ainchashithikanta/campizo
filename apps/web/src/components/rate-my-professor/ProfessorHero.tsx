import React from 'react';
import styles from './ProfessorHero.module.css';
import { Button } from '@web/components/ui/Button/Button';
import { Badge } from '@web/components/ui/Badge/Badge';
import type { ProfessorProfileDto } from '@web/lib/types';
import { getInitials } from '@web/lib/types';

export interface ProfessorHeroProps {
  profile: ProfessorProfileDto;
  onRateClick: () => void;
}

export function ProfessorHero({ profile, onRateClick }: ProfessorHeroProps) {
  const initials = getInitials(profile.fullName);

  return (
    <div className={styles.heroCard}>
      <div className={styles.left}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.info}>
          <div className={styles.titleRow}>
            <h1 className={styles.name}>{profile.fullName}</h1>
            <Badge variant="primary">Verified Faculty</Badge>
            <Badge variant={profile.status === 'ACTIVE' ? 'success' : 'default'}>{profile.status}</Badge>
          </div>
          <div className={styles.subTitle}>
            {profile.designation} • {profile.department?.name || profile.department?.code}
          </div>
          {profile.biography && <p className={styles.biography}>{profile.biography}</p>}
        </div>
      </div>

      <div className={styles.right}>
        <Button variant="primary" size="lg" onClick={onRateClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 22 12 18.56 5.82 22 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Rate This Professor
        </Button>
      </div>
    </div>
  );
}
