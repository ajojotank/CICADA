/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared interface types for API services

// Chat service types
export interface ChatSource {
  id: string;
  title: string;
  domain: string;
  snippet: string;
  preview: string;
}

export interface ChatResponse {
  text: string;
  sources: ChatSource[];
}

// Document service types
export interface Document {
  id: string;
  url: string;
  title: string;
  description?: string;
  type?: string;
  date?: string;
  tags?: string[];
  source?: string;
  content?: string;
  size?: string;
  isPublic: boolean;
  folder?: string;
  pdfUrl?: string;
  ai_summary?: string;
  // Changed from object array to string to handle markdown format
  ai_key_sections?: string;
  ai_citations?: string;
}

export interface DocumentMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  source?: string;
  date?: string;
  folder?: string;
  fileSystemType?: FileSystemType;
}

export type FileSystemType = 'private' | 'public';

export interface UploadDocumentResponse {
  success: boolean;
  id: string;
  filename: string;
  size: string;
  uploadDate: string;
}

// Folder service types
export interface FolderStructure {
  name: string;
  path: string;
  children?: FolderStructure[];
}

// Admin service types
export interface AdminStats {
  documentCount: number;
  recentUploads: number;
  storageUsed: string;
  totalStorage: string;
  popularSearches: string[];
}