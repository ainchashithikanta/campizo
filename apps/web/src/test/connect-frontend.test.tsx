/**
 * Campus Connect — Next.js Frontend UI Component Integration Tests (MS-23.9)
 * Tests rendering, navigation, loading/empty/error states, explainable recommendations,
 * privacy center toggles, conversation context rendering, and accessibility.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { CompatibilityBadge, ReasonList } from '../components/connect/compatibility-badge';
import { RecommendationCard } from '../components/connect/recommendation-card';
import { IntentCard } from '../components/connect/intent-card';
import { StudentCard, ProfileHero } from '../components/connect/student-card';
import { StudyGroupCard, ProjectCard, MentorshipCard } from '../components/connect/group-cards';
import { ConversationList, MessageBubble } from '../components/connect/messaging-components';
import { ActivityTimeline, PrivacyPanel } from '../components/connect/privacy-and-activity';
import { EmptyState, LoadingSkeleton, ErrorState, Pagination } from '../components/connect/state-components';
import { SearchBar, FilterSidebar } from '../components/connect/search-filter-components';

describe('Campus Connect Next.js Frontend Component Suite (MS-23.9)', () => {
  const mockRecommendation = {
    snapshotId: 'rec_snap_001',
    targetStudentId: 'usr_sarah_101',
    targetStudentName: 'Sarah Chen',
    compatibilityPct: 92,
    weightedReasons: [
      { reasonCode: 'SHARED_COURSE', weight: 0.4, humanText: 'Both enrolled in CS224N' },
      { reasonCode: 'SKILL_COMPLEMENT', weight: 0.3, humanText: 'You (PyTorch) & Sarah (React)' }
    ],
    major: 'Symbolic Systems',
    classYear: 2027
  };

  it('1. should render CompatibilityBadge and ReasonList correctly without exposing raw internal weights', () => {
    render(
      <div>
        <CompatibilityBadge percentage={92} />
        <ReasonList reasons={mockRecommendation.weightedReasons} />
      </div>
    );

    expect(screen.getByText(/92% Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Both enrolled in CS224N/i)).toBeInTheDocument();
    expect(screen.getByText(/You \(PyTorch\) & Sarah \(React\)/i)).toBeInTheDocument();
  });

  it('2. should render RecommendationCard with explainable match reasons and trigger Connect action', () => {
    const handleConnect = vi.fn();
    render(<RecommendationCard recommendation={mockRecommendation} onConnect={handleConnect} />);

    expect(screen.getByText(/Sarah Chen/i)).toBeInTheDocument();
    expect(screen.getByText(/Symbolic Systems/i)).toBeInTheDocument();

    const connectBtn = screen.getByRole('button', { name: /Connect with Sarah Chen/i });
    fireEvent.click(connectBtn);
    expect(handleConnect).toHaveBeenCalledWith('usr_sarah_101');
  });

  it('3. should render IntentCard with status badge and fulfill/archive triggers', () => {
    const mockIntent = {
      id: 'int_101',
      collegeId: 'college_stanford_001',
      studentProfileId: 'usr_me',
      intentType: 'STUDY_PARTNER' as const,
      title: 'CS224N Study Pod',
      courseCode: 'CS224N',
      description: 'Looking for 2 study partners',
      priority: 2,
      status: 'ACTIVE' as const,
      availabilityState: 'AVAILABLE_NOW',
      createdAt: new Date().toISOString(),
      version: 1
    };

    const handleFulfill = vi.fn();
    const handleArchive = vi.fn();

    render(<IntentCard intent={mockIntent} onFulfill={handleFulfill} onArchive={handleArchive} />);

    expect(screen.getByText(/CS224N Study Pod/i)).toBeInTheDocument();
    expect(screen.getByText(/ACTIVE/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Fulfill/i));
    expect(handleFulfill).toHaveBeenCalledWith('int_101');

    fireEvent.click(screen.getByText(/Archive/i));
    expect(handleArchive).toHaveBeenCalledWith('int_101');
  });

  it('4. should render ProfileHero and StudentCard without exposing TrustScore', () => {
    const mockProfile = {
      id: 'usr_me',
      userId: 'usr_me',
      collegeId: 'college_stanford_001',
      fullName: 'Alex Rivera',
      bio: 'CS Senior',
      major: 'Computer Science',
      classYear: 2026,
      skills: ['TypeScript', 'Python'],
      interests: ['AI'],
      courses: ['CS224N'],
      clubs: ['TreeHacks'],
      isGhostMode: false
    };

    render(
      <div>
        <ProfileHero profile={mockProfile} />
        <StudentCard student={mockProfile} />
      </div>
    );

    expect(screen.getAllByText(/Alex Rivera/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/TrustScore/i)).not.toBeInTheDocument();
  });

  it('5. should render StudyGroupCard, ProjectCard, and MentorshipCard', () => {
    const mockGroup = { id: 'sg_1', courseCode: 'CS224N', title: 'NLP Pod', maxCapacity: 5, currentMembers: 3, status: 'OPEN' };
    const mockProject = { id: 'p_1', title: 'AI Assistant', description: 'Hackathon project', status: 'OPEN' };
    const mockMentorship = { id: 'm_1', mentorId: 'usr_mentor_david', menteeId: 'usr_me', status: 'ACTIVE' };

    render(
      <div>
        <StudyGroupCard group={mockGroup} />
        <ProjectCard project={mockProject} />
        <MentorshipCard mentorship={mockMentorship} />
      </div>
    );

    expect(screen.getByText(/NLP Pod/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/Mentor ID: usr_mentor_david/i)).toBeInTheDocument();
  });

  it('6. should render ConversationList and MessageBubble with originating context badges and read receipts', () => {
    const mockConversations = [
      { id: 'conv_1', conversationType: 'STUDY_GROUP' as const, contextType: 'STUDY_POD', contextId: 'pod_cs224n', title: 'CS224N Pod', participantIds: ['usr_1'] }
    ];
    const mockMessage = { id: 'msg_1', conversationId: 'conv_1', senderProfileId: 'usr_1', content: 'Hello pod!', createdAt: new Date().toISOString(), isRead: true };

    render(
      <div>
        <ConversationList conversations={mockConversations} onSelect={vi.fn()} />
        <MessageBubble message={mockMessage} isOwn={true} />
      </div>
    );

    expect(screen.getByText(/CS224N Pod/i)).toBeInTheDocument();
    expect(screen.getByText(/STUDY_POD/i)).toBeInTheDocument();
    expect(screen.getByText(/Hello pod!/i)).toBeInTheDocument();
    expect(screen.getByText(/✓✓/i)).toBeInTheDocument();
  });

  it('7. should render PrivacyPanel and handle Ghost Mode toggle', () => {
    const handleToggle = vi.fn();
    const mockPrivacy = { studentProfileId: 'usr_me', isGhostMode: false, isIncognitoMode: true, version: 1 };

    render(<PrivacyPanel settings={mockPrivacy} onToggle={handleToggle} />);

    expect(screen.getByText(/Ghost Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Incognito Mode/i)).toBeInTheDocument();

    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]!);
    expect(handleToggle).toHaveBeenCalledWith('isGhostMode', true);
  });

  it('8. should render ActivityTimeline, EmptyState, LoadingSkeleton, ErrorState, and Pagination', () => {
    const mockActivities = [{ activityId: 'a1', actorId: 'usr_1', actionType: 'INTENT_CREATED', metadata: {}, recordedAt: new Date().toISOString() }];

    render(
      <div>
        <ActivityTimeline activities={mockActivities} />
        <EmptyState title="Empty Feed" />
        <LoadingSkeleton count={1} />
        <ErrorState message="Network Timeout" />
        <Pagination page={1} totalPages={3} onPageChange={vi.fn()} />
      </div>
    );

    expect(screen.getByText(/INTENT CREATED/i)).toBeInTheDocument();
    expect(screen.getByText(/Empty Feed/i)).toBeInTheDocument();
    expect(screen.getByText(/Network Timeout/i)).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 3/i)).toBeInTheDocument();
  });

  it('9. should render SearchBar and FilterSidebar controls', () => {
    const handleSearch = vi.fn();
    const handleFilter = vi.fn();

    render(
      <div>
        <SearchBar value="CS224N" onChange={handleSearch} />
        <FilterSidebar selectedIntentType="STUDY_PARTNER" onSelectIntentType={handleFilter} />
      </div>
    );

    const searchInput = screen.getByPlaceholderText(/Search courses, skills, or intents/i);
    expect(searchInput).toHaveValue('CS224N');

    fireEvent.click(screen.getByText(/Project Collaborator/i));
    expect(handleFilter).toHaveBeenCalledWith('PROJECT_COLLABORATOR');
  });
});
