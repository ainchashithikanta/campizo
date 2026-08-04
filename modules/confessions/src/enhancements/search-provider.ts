export interface SearchDocument {
  id: string;
  collegeId: string;
  title: string;
  content: string;
  categoryCode: string;
}

export interface SearchProvider {
  index(doc: SearchDocument): Promise<void>;
  search(collegeId: string, query: string): Promise<SearchDocument[]>;
  remove(id: string, collegeId: string): Promise<void>;
}

export class MeilisearchProvider implements SearchProvider {
  private docs = new Map<string, SearchDocument>();

  async index(doc: SearchDocument): Promise<void> {
    this.docs.set(`${doc.collegeId}:${doc.id}`, doc);
  }

  async search(collegeId: string, query: string): Promise<SearchDocument[]> {
    return Array.from(this.docs.values()).filter(
      d => d.collegeId === collegeId && (d.title.includes(query) || d.content.includes(query))
    );
  }

  async remove(id: string, collegeId: string): Promise<void> {
    this.docs.delete(`${collegeId}:${id}`);
  }
}

export class OpenSearchProvider implements SearchProvider {
  private docs = new Map<string, SearchDocument>();

  async index(doc: SearchDocument): Promise<void> {
    this.docs.set(`${doc.collegeId}:${doc.id}`, doc);
  }

  async search(collegeId: string, query: string): Promise<SearchDocument[]> {
    return Array.from(this.docs.values()).filter(
      d => d.collegeId === collegeId && (d.title.includes(query) || d.content.includes(query))
    );
  }

  async remove(id: string, collegeId: string): Promise<void> {
    this.docs.delete(`${collegeId}:${id}`);
  }
}
