import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as publicDocumentService from '@/services/api/publicDocumentService';
import { supabase } from '@/lib/supabase';

// Mock the dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    },
    storage: {
      from: vi.fn()
    }
  }
}));

describe('publicDocumentService', () => {
  const mockUser = {
    id: 'user123',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-03-20T00:00:00Z'
  };

  const mockDocument = {
    id: '123',
    file_url: 'https://example.com/test.pdf',
    file_name: 'test.pdf',
    title: 'Test Document',
    description: 'Test Description',
    document_date: '2024-03-20',
    created_at: '2024-03-20T00:00:00Z',
    tags: ['test'],
    source: 'test',
    category: 'Legislation',
    metadata: {
      size: '1MB',
      contentType: 'application/pdf',
      originalName: 'test.pdf',
      storagePath: 'user123/Legislation/test.pdf'
    },
    ai_summary: null,
    ai_key_sections: null,
    ai_citations: null,
    uploader_user_id: 'user123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchPublicDocuments', () => {
    it('should fetch public documents', async () => {
      const mockDocuments = [mockDocument];
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockDocuments, error: null })
      } as any);

      const result = await publicDocumentService.fetchPublicDocuments();
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('123');
      expect(result[0].isPublic).toBe(true);
      expect(result[0].type).toBe('pdf');
    });

    it('should handle database errors', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
      } as any);

      await expect(publicDocumentService.fetchPublicDocuments())
        .rejects
        .toThrow('Database error');
    });
  });

  describe('updatePublicDocument', () => {
    it('should update a public document', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });
      
      const updatedDoc = {
        ...mockDocument,
        title: 'Updated Title',
        description: 'Updated Description'
      };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedDoc, error: null })
      } as any);

      const result = await publicDocumentService.updatePublicDocument({
        id: '123',
        url: 'https://example.com/test.pdf',
        title: 'Updated Title',
        description: 'Updated Description',
        type: 'pdf',
        date: '2024-03-20',
        tags: ['test'],
        source: 'test',
        content: '',
        size: '1MB',
        isPublic: true,
        folder: 'Legislation',
        ai_summary: null,
        ai_key_sections: null,
        ai_citations: null
      });

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated Description');
    });

    it('should throw error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null });

      await expect(publicDocumentService.updatePublicDocument({
        id: '123',
        url: 'test.pdf',
        title: 'Test',
        type: 'pdf',
        isPublic: true,
        folder: 'Legislation'
      } as any))
        .rejects
        .toThrow('You must be logged in to update documents');
    });

    it('should throw error for invalid category', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });

      await expect(publicDocumentService.updatePublicDocument({
        id: '123',
        url: 'test.pdf',
        title: 'Test',
        type: 'pdf',
        isPublic: true,
        folder: 'Invalid Category'
      } as any))
        .rejects
        .toThrow('Invalid category: Invalid Category');
    });
  });

  describe('deletePublicDocument', () => {
    it('should delete a public document successfully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });
      
      const mockDocumentData = {
        file_url: 'https://example.com/test.pdf',
        metadata: {
          storagePath: 'user123/Legislation/test.pdf'
        }
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDocumentData, error: null }),
        delete: vi.fn().mockReturnThis(),
        match: vi.fn().mockResolvedValue({ error: null })
      } as any);

      const mockStorage = {
        remove: vi.fn().mockResolvedValue({ error: null })
      };
      
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any);

      const result = await publicDocumentService.deletePublicDocument('123');
      
      expect(result).toBe(true);
      expect(supabase.storage.from).toHaveBeenCalledWith('public-files');
      expect(mockStorage.remove).toHaveBeenCalledWith(['user123/Legislation/test.pdf']);
    });

    it('should throw error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null });

      await expect(publicDocumentService.deletePublicDocument('123'))
        .rejects
        .toThrow('You must be logged in to delete documents');
    });
  });

  describe('uploadPublicDocument', () => {
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const mockMetadata = {
      folder: 'Legislation',
      title: 'Test Document',
      description: 'Test Description',
      tags: ['test'],
      source: 'test',
      date: '2024-03-20'
    };

    it('should upload a public document successfully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });
      
      // Mock Date.now() to return a fixed timestamp
      const mockTimestamp = 1234567890;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
      
      const mockStoragePath = `user123/Legislation/${mockTimestamp}_test.pdf`;
      const mockStorageResponse = { path: mockStoragePath };
      
      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ data: mockStorageResponse, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.pdf' } })
      };
      
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any);

      const mockDocumentResponse = {
        id: '123',
        created_at: '2024-03-20T00:00:00Z'
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        match: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDocumentResponse, error: null })
      } as any);

      const result = await publicDocumentService.uploadPublicDocument(mockFile, mockMetadata);
      
      expect(result.success).toBe(true);
      expect(result.id).toBe('123');
      expect(result.filename).toBe(mockStoragePath);
      expect(result.size).toBe('0.0KB');
      expect(result.uploadDate).toBe('2024-03-20T00:00:00Z');
    });

    it('should throw error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null });

      await expect(publicDocumentService.uploadPublicDocument(mockFile, mockMetadata))
        .rejects
        .toThrow('You must be logged in to upload documents');
    });

    it('should throw error for invalid category', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });

      await expect(publicDocumentService.uploadPublicDocument(mockFile, {
        ...mockMetadata,
        folder: 'Invalid Category'
      }))
        .rejects
        .toThrow('Invalid category: Invalid Category');
    });
  });
}); 