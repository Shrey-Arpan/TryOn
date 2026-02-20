export interface Note {
  id: number;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

export interface AIInsight {
  summary: string;
  category: string;
  tags: string[];
  suggestions: string[];
}
