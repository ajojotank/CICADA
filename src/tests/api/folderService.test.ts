import { describe, it, expect, vi, beforeEach } from "vitest";
import * as folderService from "@/services/api/folderService";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe("folderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchFolderStructure", () => {
    it("should return public folder structure when fileSystemType is public", async () => {
      const folders = await folderService.fetchFolderStructure("public");
      expect(folders).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "Constitutional Documents" }),
          expect.objectContaining({ name: "Supreme Court Cases" }),
        ])
      );
    });

    it("should fetch and build folder structure for private documents", async () => {
      const mockFolders = [
        { folder: "A" },
        { folder: "A/B" },
        { folder: "A/B/C" },
        { folder: "X/Y" },
      ];
      const selectMock = vi.fn().mockReturnThis();
      const notMock = vi
        .fn()
        .mockResolvedValue({ data: mockFolders, error: null });

      (supabase.from as any).mockReturnValue({
        select: selectMock,
        not: notMock,
      });

      const folders = await folderService.fetchFolderStructure("private");
      expect(folders.find((f) => f.name === "A")).toBeDefined();
      expect(folders.find((f) => f.name === "X")).toBeDefined();
    });
  });

  describe("createFolder", () => {
    it("should throw error if public file system is used", async () => {
      await expect(
        folderService.createFolder("", "MyFolder", "public")
      ).rejects.toThrow("Cannot create folders in the public file system");
    });

    it("should throw error if folder already exists", async () => {
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValue({ data: [{ folder: "MyFolder" }], error: null }),
      });

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: "abc" } },
      });

      await expect(
        folderService.createFolder("", "MyFolder", "private")
      ).rejects.toThrow("Folder 'MyFolder' already exists in this location");
    });
  });

  describe("deleteFolder", () => {
    it("should throw if not authenticated", async () => {
      (supabase.auth.getUser as any).mockResolvedValue({ data: null });

      await expect(
        folderService.deleteFolder("X/Y", "private")
      ).rejects.toThrow("You must be logged in to delete folders");
    });
  });
});
