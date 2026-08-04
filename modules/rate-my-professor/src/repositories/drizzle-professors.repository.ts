import { eq, and, ilike } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { professors } from '../schema/rate-my-professor.schema.js';
import type { ProfessorEntity, ProfessorRepository } from '../domain/repository.interface.js';

export class DrizzleProfessorRepository implements ProfessorRepository {
  constructor(private readonly db: NodePgDatabase<any>) {}

  public async findById(id: string, collegeId: string): Promise<ProfessorEntity | null> {
    const rows = await this.db
      .select()
      .from(professors)
      .where(and(eq(professors.id, id), eq(professors.collegeId, collegeId)))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0]!;

    return {
      id: row.id,
      collegeId: row.collegeId,
      departmentId: row.departmentId,
      fullName: row.fullName,
      slug: row.slug,
      designation: row.designation,
      status: row.status,
      biography: row.biography ?? undefined,
      photoUrl: row.photoUrl ?? undefined
    };
  }

  public async findBySlug(slug: string, collegeId: string): Promise<ProfessorEntity | null> {
    const rows = await this.db
      .select()
      .from(professors)
      .where(and(eq(professors.slug, slug), eq(professors.collegeId, collegeId)))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0]!;

    return {
      id: row.id,
      collegeId: row.collegeId,
      departmentId: row.departmentId,
      fullName: row.fullName,
      slug: row.slug,
      designation: row.designation,
      status: row.status,
      biography: row.biography ?? undefined,
      photoUrl: row.photoUrl ?? undefined
    };
  }

  public async search(collegeId: string, query?: string): Promise<ProfessorEntity[]> {
    let baseQuery = this.db
      .select()
      .from(professors)
      .where(and(eq(professors.collegeId, collegeId)));

    if (query) {
      baseQuery = this.db
        .select()
        .from(professors)
        .where(and(eq(professors.collegeId, collegeId), ilike(professors.fullName, `%${query}%`)));
    }

    const rows = await baseQuery;
    return rows.map((row) => ({
      id: row.id,
      collegeId: row.collegeId,
      departmentId: row.departmentId,
      fullName: row.fullName,
      slug: row.slug,
      designation: row.designation,
      status: row.status,
      biography: row.biography ?? undefined,
      photoUrl: row.photoUrl ?? undefined
    }));
  }

  public async save(professor: ProfessorEntity): Promise<ProfessorEntity> {
    await this.db
      .insert(professors)
      .values({
        id: professor.id,
        collegeId: professor.collegeId,
        departmentId: professor.departmentId,
        fullName: professor.fullName,
        slug: professor.slug,
        designation: professor.designation,
        status: professor.status,
        biography: professor.biography ?? null,
        photoUrl: professor.photoUrl ?? null
      })
      .onConflictDoUpdate({
        target: professors.id,
        set: {
          fullName: professor.fullName,
          designation: professor.designation,
          status: professor.status,
          biography: professor.biography ?? null,
          photoUrl: professor.photoUrl ?? null,
          updatedAt: new Date()
        }
      });

    return professor;
  }
}
