// Document API service facade
import { Document, DocumentMetadata, FileSystemType, UploadDocumentResponse } from './types';
import * as privateDocumentService from './privateDocumentService';
import * as publicDocumentService from './publicDocumentService';
import { supabase } from '@/lib/supabase';

// Database document types
interface DatabaseDocument {
  id: string;
  file_url: string;
  file_name: string;
  title?: string;
  description?: string;
  document_date?: string;
  created_at?: string;
  tags?: string[];
  source?: string;
  category?: string;
  folder?: string;
  metadata?: {
    size?: string;
    contentType?: string;
    originalName?: string;
    storagePath?: string;
  };
  ai_summary?: string | null;
  ai_key_sections?: string | null;
  ai_citations?: string | null;
}

/**
 * Fetches documents based on file system type
 * @param fileSystemType The type of file system (private or public)
 * @returns A promise that resolves to an array of Documents
 */
export const fetchDocuments = async (fileSystemType: FileSystemType = 'private'): Promise<Document[]> => {
  if (fileSystemType === 'private') {
    return privateDocumentService.fetchPrivateDocuments();
  } else {
    return publicDocumentService.fetchPublicDocuments();
  }
};

/**
 * Fetches a single document by ID
 * @param id The ID of the document to fetch
 * @param fileSystemType The type of file system (private or public)
 * @returns A promise that resolves to a Document or null if not found
 */
export const fetchDocumentById = async (id: string, fileSystemType?: FileSystemType): Promise<Document | null> => {
  try {
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("You must be logged in to fetch documents");
    }
    console.log('Current user:', userData.user.id);
    console.log('Fetching document with ID:', id);

    // Try public first if fileSystemType is not specified
    if (!fileSystemType) {
      console.log('Trying public table first...');
      
      const { data: publicData, error: publicError } = await supabase
        .from('documents_public')
        .select(`
          *,
          ai_summary,
          ai_key_sections,
          ai_citations
        `)
        .eq('id', id)
        .eq('uploader_user_id', userData.user.id)
        .single();

      if (!publicError && publicData) {
        console.log('Found in public table:', publicData);
        return formatDocument(publicData, true);
      }

      console.log('Not found in public table, trying private...');
      
      const { data: privateData, error: privateError } = await supabase
        .from('documents_private')
        .select(`
          *,
          ai_summary,
          ai_key_sections,
          ai_citations
        `)
        .eq('id', id)
        .eq('user_id', userData.user.id)
        .single();

      if (!privateError && privateData) {
        console.log('Found in private table:', privateData);
        return formatDocument(privateData, false);
      }

      console.log('Document not found in either table');
      return null;
    }

    // If fileSystemType is specified, query only that table
    const isPublic = fileSystemType === 'public';
    const tableName = isPublic ? 'documents_public' : 'documents_private';
    const userIdField = isPublic ? 'uploader_user_id' : 'user_id';
    
    console.log('Using table:', tableName);
    console.log('Using user ID field:', userIdField);

    const { data, error } = await supabase
      .from(tableName)
      .select(`
        *,
        ai_summary,
        ai_key_sections,
        ai_citations
      `)
      .eq('id', id)
      .eq(userIdField, userData.user.id)
      .single();
    
    if (error) {
      console.error('Database query error:', error);
      throw error;
    }
    
    console.log('Raw database response:', data);

    if (!data) {
      console.log('No document found');
      return null;
    }

    return formatDocument(data, isPublic);
  } catch (error) {
    console.error('Error fetching document by ID:', error);
    throw error;
  }
};

// Helper function to format document data
const formatDocument = (data: DatabaseDocument, isPublic: boolean): Document => {
  const document = {
    id: data.id,
    url: data.file_url,
    title: data.title || data.file_name,
    description: data.description || '',
    type: data.file_name.split('.').pop() || 'unknown',
    date: data.document_date || data.created_at?.split('T')[0],
    tags: data.tags || [],
    source: data.source || '',
    content: '',
    size: data.metadata?.size || 'unknown',
    isPublic,
    folder: isPublic ? data.category || '' : data.folder || '',
    ai_summary: data.ai_summary || null,
    ai_key_sections: data.ai_key_sections || null,
    ai_citations: data.ai_citations || null
  };

  console.log('Formatted document:', document);
  return document;
};

/**
 * Updates a document
 * @param document The document to update
 * @returns A promise that resolves to the updated Document
 */
export const updateDocument = async (document: Document): Promise<Document> => {
  if (!document.isPublic) {
    return privateDocumentService.updatePrivateDocument(document);
  } else {
    return publicDocumentService.updatePublicDocument(document);
  }
};

/**
 * Deletes a document by ID
 * @param id The ID of the document to delete
 * @param fileSystemType The type of file system (private or public)
 * @returns A promise that resolves to a boolean indicating success
 */
export const deleteDocument = async (id: string, fileSystemType: FileSystemType = 'private'): Promise<boolean> => {
  if (fileSystemType === 'private') {
    return privateDocumentService.deletePrivateDocument(id);
  } else {
    return publicDocumentService.deletePublicDocument(id);
  }
};

/**
 * Uploads a new document
 * @param file The file to upload
 * @param metadata Metadata for the document
 * @returns A promise that resolves to an upload response
 */
export const uploadDocument = async (file: File, metadata: DocumentMetadata): Promise<UploadDocumentResponse> => {
  const { fileSystemType = 'private' } = metadata;
  
  if (fileSystemType === 'private') {
    return privateDocumentService.uploadPrivateDocument(file, metadata);
  } else {
    return publicDocumentService.uploadPublicDocument(file, metadata);
  }
};

/**
 * Gets a valid URL for a document
 * - For public files: Returns the stored public URL directly
 * - For private files: Generates a signed URL that is valid for the specified duration
 * 
 * @param document The document for which to get a valid URL
 * @param expiresIn Time in seconds until private URLs expire (default: 3600 = 1 hour)
 * @returns A promise that resolves to a valid URL string
 */
export const getDocumentUrl = async (document: Document, expiresIn = 3600): Promise<string> => {
  try {
    // For public documents, the URL stored in the database is already a valid public URL
    if (document.isPublic) {
      return document.url;
    } 
    // For private documents, we need to generate a signed URL
    else {
      // The url field for private documents contains just the storage path
      const storagePath = document.url;
      return privateDocumentService.getSignedUrl(storagePath, expiresIn);
    }
  } catch (error) {
    console.error('Error getting document URL:', error);
    throw error;
  }
};