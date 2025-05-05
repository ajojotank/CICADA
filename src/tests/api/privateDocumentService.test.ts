// tests/publicDocumentService.test.ts

import * as publicService from "@/services/api/publicDocumentService";
import { Readable } from "stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => {
  const uploadFn = vi.fn().mockResolvedValue({
    data: { path: "mock-path.pdf" },
    error: null,
  });

  const getPublicUrlFn = vi.fn().mockReturnValue({
    data: {
      publicUrl:
        "https://mock.supabase.co/storage/v1/object/public/mock-path.pdf",
    },
  });

  const removeFn = vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "doc-123", created_at: "2024-01-01" },
          error: null,
        }),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        limit: vi.fn().mockReturnThis(),
      })),
      storage: {
        from: vi.fn(() => ({
          upload: uploadFn,
          getPublicUrl: getPublicUrlFn,
          remove: removeFn,
        })),
      },
    },
  };
});

describe("uploadPublicDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a public document and returns metadata", async () => {
    const fakeFile = {
      name: "test.pdf",
      type: "application/pdf",
      size: 1024,
      arrayBuffer: async () => new TextEncoder().encode("test content").buffer,
      stream: () => Readable.from(["test content"]), // optional if used
      slice: () => fakeFile,
      lastModified: Date.now(),
    } as unknown as File;
    

    const metadata = {
      folder: "Legislation",
      title: "Test Title",
      description: "Test Description",
      tags: ["tag1", "tag2"],
      source: "Test Source",
      date: "2025-05-01",
    };

    const result = await publicService.uploadPublicDocument(fakeFile, metadata);

    expect(result.success).toBe(true);
    expect(result.filename).toContain("test.pdf");
    expect(result.uploadDate).toBe("2024-01-01");
  });

  it("throws an error for invalid category", async () => {
    const fakeFile = {
      name: "test.pdf",
      type: "application/pdf",
      size: 1024,
      arrayBuffer: async () => new TextEncoder().encode("test content").buffer,
      stream: () => Readable.from(["test content"]), // optional if used
      slice: () => fakeFile,
      lastModified: Date.now(),
    } as unknown as File;
    

    const metadata = {
      folder: "Invalid Category",
    };

    await expect(
      publicService.uploadPublicDocument(fakeFile, metadata)
    ).rejects.toThrow(/Invalid category/);
  });
});
