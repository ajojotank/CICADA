import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as documentService from '@/services/api/documentService';
import * as privateDocumentService from '@/services/api/privateDocumentService';
import * as publicDocumentService from '@/services/api/publicDocumentService';
import { supabase } from '@/lib/supabase';

// Mock the dependencies
vi.mock('@/services/api/privateDocumentService');
vi.mock('@/services/api/publicDocumentService');
vi.mock('@/lib/supabase');

describe('documentService', () => {
  const mockDocument = {
    id: '123',
    url: 'https://example.com/doc.pdf',
    title: 'Test Document',
    description: 'Test Description',
    type: 'pdf',
    date: '2024-03-20',
    tags: ['test'],
    source: 'test',
    content: '',
    size: '1MB',
    isPublic: false,
    folder: 'test-folder',
    ai_summary: null,
    ai_key_sections: null,
    ai_citations: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchDocuments', () => {
    it('should fetch private documents', async () => {
      const mockPrivateDocs = [mockDocument];
      vi.mocked(privateDocumentService.fetchPrivateDocuments).mockResolvedValue(mockPrivateDocs);

      const result = await documentService.fetchDocuments('private');
      expect(result).toEqual(mockPrivateDocs);
      expect(privateDocumentService.fetchPrivateDocuments).toHaveBeenCalled();
    });

    it('should fetch public documents', async () => {
      const mockPublicDocs = [{ ...mockDocument, isPublic: true }];
      vi.mocked(publicDocumentService.fetchPublicDocuments).mockResolvedValue(mockPublicDocs);

      const result = await documentService.fetchDocuments('public');
      expect(result).toEqual(mockPublicDocs);
      expect(publicDocumentService.fetchPublicDocuments).toHaveBeenCalled();
    });
  });

  describe('fetchDocumentById', () => {
    it('should fetch a private document by id', async () => {
      const mockUser = {
        id: 'user123',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-03-20T00:00:00Z'
      };
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });
      
      const mockPrivateDoc = {
        id: '123',
        file_url: 'https://example.com/doc.pdf',
        file_name: 'test.pdf',
        title: 'Test Document',
        description: 'Test Description',
        document_date: '2024-03-20',
        created_at: '2024-03-20T00:00:00Z',
        tags: ['test'],
        source: 'test',
        category: 'test-category',
        folder: 'test-folder',
        metadata: {
          size: '1MB',
          contentType: 'application/pdf',
          originalName: 'test.pdf',
          storagePath: 'private/user123/test.pdf'
        },
        ai_summary: null,
        ai_key_sections: null,
        ai_citations: null,
        user_id: 'user123'
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPrivateDoc, error: null })
      } as any);

      const result = await documentService.fetchDocumentById('123', 'private');
      expect(result).toBeTruthy();
      expect(result?.id).toBe('123');
      expect(result?.type).toBe('pdf');
    });

    it('should fetch a public document by id', async () => {
      const mockPublicDoc = {
        id: '123',
        file_url: 'https://example.com/doc.pdf',
        file_name: 'test.pdf',
        title: 'Test Document',
        description: 'Test Description',
        document_date: '2024-03-20',
        created_at: '2024-03-20T00:00:00Z',
        tags: ['test'],
        source: 'test',
        category: 'test-category',
        folder: 'test-folder',
        metadata: {
          size: '1MB',
          contentType: 'application/pdf',
          originalName: 'test.pdf',
          storagePath: 'public/test.pdf'
        },
        ai_summary: null,
        ai_key_sections: null,
        ai_citations: null,
        uploader_user_id: 'user123'
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPublicDoc, error: null })
      } as any);

      const result = await documentService.fetchDocumentById('123', 'public');
      expect(result).toBeTruthy();
      expect(result?.id).toBe('123');
      expect(result?.isPublic).toBe(true);
    });

    it('should throw error when trying to access private document without authentication', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null });

      await expect(documentService.fetchDocumentById('123', 'private'))
        .rejects
        .toThrow('You must be logged in to access private documents');
    });

    it('should handle database errors gracefully', async () => {
      const mockUser = {
        id: 'user123',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-03-20T00:00:00Z'
      };
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
      } as any);

      await expect(documentService.fetchDocumentById('123', 'private'))
        .rejects
        .toThrow('Database error');
    });

    it('should handle document with missing fields', async () => {
      const mockUser = {
        id: 'user123',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-03-20T00:00:00Z'
      };
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });
      
      const mockPrivateDoc = {
        id: '123',
        file_url: 'https://example.com/doc.pdf',
        file_name: 'test.pdf',
        user_id: 'user123'
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPrivateDoc, error: null })
      } as any);

      const result = await documentService.fetchDocumentById('123', 'private');
      expect(result).toBeTruthy();
      expect(result?.id).toBe('123');
      expect(result?.title).toBe('test.pdf');
      expect(result?.description).toBe('');
      expect(result?.tags).toEqual([]);
    });
  });

  describe('updateDocument', () => {
    it('should update a private document', async () => {
      vi.mocked(privateDocumentService.updatePrivateDocument).mockResolvedValue(mockDocument);

      const result = await documentService.updateDocument(mockDocument);
      expect(result).toEqual(mockDocument);
      expect(privateDocumentService.updatePrivateDocument).toHaveBeenCalledWith(mockDocument);
    });

    it('should update a public document', async () => {
      const publicDoc = { ...mockDocument, isPublic: true };
      vi.mocked(publicDocumentService.updatePublicDocument).mockResolvedValue(publicDoc);

      const result = await documentService.updateDocument(publicDoc);
      expect(result).toEqual(publicDoc);
      expect(publicDocumentService.updatePublicDocument).toHaveBeenCalledWith(publicDoc);
    });
  });

  describe('deleteDocument', () => {
    it('should delete a private document', async () => {
      vi.mocked(privateDocumentService.deletePrivateDocument).mockResolvedValue(true);

      const result = await documentService.deleteDocument('123', 'private');
      expect(result).toBe(true);
      expect(privateDocumentService.deletePrivateDocument).toHaveBeenCalledWith('123');
    });

    it('should delete a public document', async () => {
      vi.mocked(publicDocumentService.deletePublicDocument).mockResolvedValue(true);

      const result = await documentService.deleteDocument('123', 'public');
      expect(result).toBe(true);
      expect(publicDocumentService.deletePublicDocument).toHaveBeenCalledWith('123');
    });
  });

  describe('getDocumentUrl', () => {
    it('should return public URL for public documents', async () => {
      const publicDoc = { ...mockDocument, isPublic: true };
      const result = await documentService.getDocumentUrl(publicDoc);
      expect(result).toBe(publicDoc.url);
    });

    it('should get signed URL for private documents', async () => {
      const signedUrl = 'https://example.com/signed-url';
      vi.mocked(privateDocumentService.getSignedUrl).mockResolvedValue(signedUrl);

      const result = await documentService.getDocumentUrl(mockDocument);
      expect(result).toBe(signedUrl);
      expect(privateDocumentService.getSignedUrl).toHaveBeenCalledWith(mockDocument.url, 3600);
    });
  });

  describe('uploadDocument', () => {
    it('should upload a private document', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const metadata = {
        title: 'Test Document',
        description: 'Test Description',
        tags: ['test'],
        fileSystemType: 'private' as const
      };

      const mockResponse = {
        id: '123',
        url: 'https://example.com/doc.pdf',
        title: 'Test Document',
        success: true,
        filename: 'test.pdf',
        size: '1MB',
        uploadDate: new Date().toISOString()
      };

      vi.mocked(privateDocumentService.uploadPrivateDocument).mockResolvedValue(mockResponse);

      const result = await documentService.uploadDocument(file, metadata);
      expect(result).toEqual(mockResponse);
      expect(privateDocumentService.uploadPrivateDocument).toHaveBeenCalledWith(file, metadata);
    });

    it('should upload a public document', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const metadata = {
        title: 'Test Document',
        description: 'Test Description',
        tags: ['test'],
        fileSystemType: 'public' as const
      };

      const mockResponse = {
        id: '123',
        url: 'https://example.com/doc.pdf',
        title: 'Test Document',
        success: true,
        filename: 'test.pdf',
        size: '1MB',
        uploadDate: new Date().toISOString()
      };

      vi.mocked(publicDocumentService.uploadPublicDocument).mockResolvedValue(mockResponse);

      const result = await documentService.uploadDocument(file, metadata);
      expect(result).toEqual(mockResponse);
      expect(publicDocumentService.uploadPublicDocument).toHaveBeenCalledWith(file, metadata);
    });
  });
}); 