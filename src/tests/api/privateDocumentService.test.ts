import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as privateDocumentService from '@/services/api/privateDocumentService';
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

describe('privateDocumentService', () => {
  const mockUser = {
    id: 'user123',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-03-20T00:00:00Z'
  };

  const mockDocument = {
    id: '123',
    file_url: 'private-files/user123/test.pdf',
    file_name: 'test.pdf',
    title: 'Test Document',
    description: 'Test Description',
    document_date: '2024-03-20',
    created_at: '2024-03-20T00:00:00Z',
    tags: ['test'],
    source: 'test',
    folder: 'Documents',
    metadata: {
      size: '1MB',
      contentType: 'application/pdf',
      originalName: 'test.pdf',
      storagePath: 'user123/Documents/test.pdf'
    },
    ai_summary: null,
    ai_key_sections: null,
    ai_citations: null,
    user_id: 'user123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchPrivateDocuments', () => {
    it('should fetch private documents', async () => {
      const mockDocuments = [mockDocument];
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockDocuments, error: null })
      } as any);

      const result = await privateDocumentService.fetchPrivateDocuments();
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('123');
      expect(result[0].isPublic).toBe(false);
      expect(result[0].type).toBe('pdf');
    });

    it('should handle database errors', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
      } as any);

      await expect(privateDocumentService.fetchPrivateDocuments())
        .rejects
        .toThrow('Database error');
    });
  });

  describe('getSignedUrl', () => {
    it('should generate a signed URL for a private document', async () => {
      const mockSignedUrl = 'https://example.com/signed-url';
      
      const mockStorage = {
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: mockSignedUrl }, error: null })
      };
      
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any);

      const result = await privateDocumentService.getSignedUrl('user123/test.pdf');
      
      expect(result).toBe(mockSignedUrl);
      expect(supabase.storage.from).toHaveBeenCalledWith('private-files');
    });
  });

  describe('updatePrivateDocument', () => {
    it('should update a private document', async () => {
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

      const result = await privateDocumentService.updatePrivateDocument({
        id: '123',
        url: 'private-files/user123/test.pdf',
        title: 'Updated Title',
        description: 'Updated Description',
        type: 'pdf',
        date: '2024-03-20',
        tags: ['test'],
        source: 'test',
        content: '',
        size: '1MB',
        isPublic: false,
        folder: 'Documents',
        ai_summary: null,
        ai_key_sections: null,
        ai_citations: null
      });

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated Description');
    });

    it('should throw error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null });

      await expect(privateDocumentService.updatePrivateDocument({
        id: '123',
        url: 'test.pdf',
        title: 'Test',
        type: 'pdf',
        isPublic: false
      } as any))
        .rejects
        .toThrow('You must be logged in to update documents');
    });
  });

  describe('uploadPrivateDocument', () => {
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const mockMetadata = {
      folder: 'Documents',
      title: 'Test Document',
      description: 'Test Description',
      tags: ['test'],
      source: 'test',
      date: '2024-03-20'
    };

    it('should upload a private document successfully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });
      
      // Mock Date.now() to return a fixed timestamp
      const mockTimestamp = 1234567890;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
      
      const mockStoragePath = `user123/Documents/${mockTimestamp}_test.pdf`;
      const mockStorageResponse = { path: mockStoragePath };
      
      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ data: mockStorageResponse, error: null })
      };
      
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any);

      const mockDocumentResponse = {
        id: '123',
        created_at: '2024-03-20T00:00:00Z'
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDocumentResponse, error: null })
      } as any);

      const result = await privateDocumentService.uploadPrivateDocument(mockFile, mockMetadata);
      
      expect(result.success).toBe(true);
      expect(result.id).toBe('123');
      expect(result.filename).toBe(mockStoragePath);
      expect(result.size).toBe('0.0KB');
      expect(result.uploadDate).toBe('2024-03-20T00:00:00Z');
    });

    it('should throw error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null });

      await expect(privateDocumentService.uploadPrivateDocument(mockFile, mockMetadata))
        .rejects
        .toThrow('You must be logged in to upload documents');
    });

    it('should throw error when file already exists in folder', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockResolvedValue({ data: [{ file_name: 'test.pdf' }], error: null })
      } as any);

      await expect(privateDocumentService.uploadPrivateDocument(mockFile, mockMetadata))
        .rejects
        .toThrow('A file named "test.pdf" already exists in this folder');
    });
  });

  describe('deletePrivateDocument', () => {
    it('should delete a private document successfully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });
      
      const mockDocumentData = {
        file_url: 'user123/Documents/test.pdf',
        metadata: {
          storagePath: 'user123/Documents/test.pdf'
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

      const result = await privateDocumentService.deletePrivateDocument('123');
      
      expect(result).toBe(true);
      expect(supabase.storage.from).toHaveBeenCalledWith('private-files');
      expect(mockStorage.remove).toHaveBeenCalledWith(['user123/Documents/test.pdf']);
    });

    it('should throw error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null });

      await expect(privateDocumentService.deletePrivateDocument('123'))
        .rejects
        .toThrow('You must be logged in to delete documents');
    });

    it('should handle storage deletion failure gracefully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });
      
      const mockDocumentData = {
        file_url: 'user123/Documents/test.pdf',
        metadata: {
          storagePath: 'user123/Documents/test.pdf'
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
        remove: vi.fn().mockResolvedValue({ error: new Error('Storage error') })
      };
      
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any);

      const result = await privateDocumentService.deletePrivateDocument('123');
      
      expect(result).toBe(true); // Should still return true even if storage deletion fails
      expect(supabase.storage.from).toHaveBeenCalledWith('private-files');
      expect(mockStorage.remove).toHaveBeenCalledWith(['user123/Documents/test.pdf']);
    });
  });

}); 