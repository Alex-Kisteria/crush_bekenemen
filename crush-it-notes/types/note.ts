export interface Note {
  id: string;
  author: string; 
  to: string; 
  content: string;
  color: string;
  x: number;
  y: number;
  rotation: number;
  created_at?: string;
  updated_at?: string;
}