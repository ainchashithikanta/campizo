/**
 * Placement Guidance Module — Domain Events
 */

export interface PlacementExperienceSubmittedEvent {
  eventType: 'PlacementExperienceSubmitted';
  experienceId: string;
  collegeId: string;
  companyId: string;
  authorId: string;
  roleTitle: string;
  timestamp: string;
}

export interface PlacementExperienceHelpfulMarkedEvent {
  eventType: 'PlacementExperienceHelpfulMarked';
  experienceId: string;
  collegeId: string;
  timestamp: string;
}

export interface PlacementExperienceReportedEvent {
  eventType: 'PlacementExperienceReported';
  experienceId: string;
  collegeId: string;
  reason: string;
  timestamp: string;
}

export type PlacementDomainEvent =
  PlacementExperienceSubmittedEvent | PlacementExperienceHelpfulMarkedEvent | PlacementExperienceReportedEvent;
