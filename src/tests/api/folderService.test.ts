import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as folderService from '@/services/api/folderService';
import { supabase } from '@/lib/supabase';

// Mock the dependencies
vi.mock('@/lib/supabase');

describe('folderService', () => {
  const mockUser = {
    id: 'user123',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-03-20T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchFolderStructure', () => {
    it('should fetch private folder structure', async () => {
      const mockFolders = [
        { folder: 'Documents' },
        { folder: 'Documents/Work' },
        { folder: 'Documents/Personal' }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: mockFolders, error: null })
      } as any);

      const result = await folderService.fetchFolderStructure('private');
      
      expect(result).toHaveLength(1); // Root folder
      expect(result[0].name).toBe('Documents');
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].name).toBe('Work');
      expect(result[0].children[1].name).toBe('Personal');
    });

    it('should return predefined categories for public folders', async () => {
      const result = await folderService.fetchFolderStructure('public');
      
      expect(result).toHaveLength(7); // 7 predefined categories
      expect(result[0].name).toBe('Constitutional Documents');
      expect(result[1].name).toBe('Supreme Court Cases');
      expect(result[2].name).toBe('Legislation');
    });
  });

  describe('createFolder', () => {
    it('should create a new private folder', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });
      
      const mockSupabase = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockReturnThis()
      };

      mockSupabase.select.mockImplementation(() => mockSupabase);
      mockSupabase.insert.mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({ 
          data: [{ id: '123', folder: 'Documents/NewFolder' }], 
          error: null 
        })
      }));

      vi.mocked(supabase.from).mockReturnValue(mockSupabase as any);

      const result = await folderService.createFolder('Documents', 'NewFolder', 'private');
      
      expect(result.name).toBe('NewFolder');
      expect(result.path).toBe('Documents/NewFolder');
      expect(result.children).toHaveLength(0);
    });

    it('should throw error when creating public folder', async () => {
      await expect(folderService.createFolder('Documents', 'NewFolder', 'public'))
        .rejects
        .toThrow('Cannot create folders in the public file system');
    });

    it('should throw error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null });

      await expect(folderService.createFolder('Documents', 'NewFolder', 'private'))
        .rejects
        .toThrow('You must be logged in to create folders');
    });
  });

  describe('updateFolder', () => {
    it('should update a private folder name', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });
      
      const mockSupabase = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis()
      };

      // Mock the chained methods
      mockSupabase.select.mockImplementation(() => mockSupabase);
      mockSupabase.eq.mockImplementation(() => mockSupabase);
      mockSupabase.like.mockImplementation(() => mockSupabase);
      mockSupabase.update.mockImplementation(() => ({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      }));

      vi.mocked(supabase.from).mockReturnValue(mockSupabase as any);

      const result = await folderService.updateFolder('Documents/OldName', 'NewName', 'private');
      
      expect(result.name).toBe('NewName');
      expect(result.path).toBe('Documents/NewName');
    });

    it('should throw error when updating public folder', async () => {
      await expect(folderService.updateFolder('Documents/OldName', 'NewName', 'public'))
        .rejects
        .toThrow('Cannot rename folders in the public file system');
    });
  });

  describe('deleteFolder', () => {
    it('should delete a private folder and its contents', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });
      
      const mockSupabase = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis()
      };

      // Mock the chained methods
      mockSupabase.delete.mockImplementation(() => mockSupabase);
      mockSupabase.eq.mockImplementation(() => mockSupabase);
      mockSupabase.like.mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }));

      vi.mocked(supabase.from).mockReturnValue(mockSupabase as any);

      const result = await folderService.deleteFolder('Documents/ToDelete', 'private');
      
      expect(result).toBe(true);
    });

    it('should throw error when deleting public folder', async () => {
      await expect(folderService.deleteFolder('Documents/ToDelete', 'public'))
        .rejects
        .toThrow('Cannot delete folders in the public file system');
    });

    it('should throw error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null });

      await expect(folderService.deleteFolder('Documents/ToDelete', 'private'))
        .rejects
        .toThrow('You must be logged in to delete folders');
    });
  });
}); 