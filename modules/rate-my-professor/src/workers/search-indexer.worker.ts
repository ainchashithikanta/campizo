import { logger } from '@college-hub/logger';
import type { ProfessorRepository, ProfessorEntity } from '../domain/repository.interface.js';

export interface IndexedProfessorDocument {
  id: string;
  collegeId: string;
  fullName: string;
  slug: string;
  departmentId: string;
  designation: string;
  status: string;
  searchTokens: string[];
  indexedAt: Date;
}

export class SearchIndexerWorker {
  private searchIndex = new Map<string, IndexedProfessorDocument>();

  constructor(private readonly professorRepo: ProfessorRepository) {}

  public async indexProfessor(professorId: string, collegeId: string): Promise<IndexedProfessorDocument | null> {
    logger.info({ professorId, collegeId }, 'Executing search indexer worker for professor...');

    const professor = await this.professorRepo.findById(professorId, collegeId);
    if (!professor) {
      logger.warn({ professorId, collegeId }, 'Professor entity not found during search indexing.');
      return null;
    }

    const tokens = this.tokenizeProfessor(professor);

    const doc: IndexedProfessorDocument = {
      id: professor.id,
      collegeId: professor.collegeId,
      fullName: professor.fullName,
      slug: professor.slug,
      departmentId: professor.departmentId,
      designation: professor.designation,
      status: professor.status,
      searchTokens: tokens,
      indexedAt: new Date()
    };

    this.searchIndex.set(`${collegeId}:${professor.id}`, doc);
    logger.info(
      { professorId: professor.id, collegeId, tokenCount: tokens.length },
      'Professor document successfully indexed for full-text search.'
    );

    return doc;
  }

  public searchIndexQuery(collegeId: string, query: string): IndexedProfessorDocument[] {
    const term = query.toLowerCase().trim();
    if (!term) return [];

    const results: IndexedProfessorDocument[] = [];
    for (const doc of this.searchIndex.values()) {
      if (doc.collegeId === collegeId) {
        const matches = doc.searchTokens.some((tok) => tok.includes(term));
        if (matches) {
          results.push(doc);
        }
      }
    }
    return results;
  }

  private tokenizeProfessor(prof: ProfessorEntity): string[] {
    const parts = [
      prof.fullName.toLowerCase(),
      prof.slug.toLowerCase(),
      prof.designation.toLowerCase(),
      prof.departmentId.toLowerCase()
    ];

    const tokens = new Set<string>();
    for (const part of parts) {
      for (const word of part.split(/[\s\-_]+/)) {
        if (word.length > 1) {
          tokens.add(word);
        }
      }
    }
    return Array.from(tokens);
  }

  public clear(): void {
    this.searchIndex.clear();
  }
}
