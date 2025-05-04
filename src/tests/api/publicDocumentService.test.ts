// src/tests/api/publicDocumentService.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as publicService from "@/services/api/publicDocumentService";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
      storage: {
        from: vi.fn(),
      },
    },
  };
});

describe("publicDocumentService", () => {
  const mockUser = { user: { id: "user-123" } };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a public document and returns metadata", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: mockUser });

    // Check if file already exists (returns empty list)
    (supabase.from as any).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    });

    // Mock file upload
    const mockUpload = vi.fn().mockResolvedValue({
      data: { path: "mock-path.pdf" },
      error: null,
    });

    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://public.url/mock-path.pdf" },
      error: null,
    });

    const mockRemove = vi.fn();

    (supabase.storage.from as any).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
      remove: mockRemove,
    });

    // Mock insert into DB
    (supabase.from as any).mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "new-id",
              created_at: "2024-01-01",
            },
            error: null,
          }),
        }),
      }),
    });

    const fakeFile = new File(["test"], "test.pdf", {
      type: "application/pdf",
    });
    const result = await publicService.uploadPublicDocument(fakeFile, {
      folder: "Legislation",
    });

    expect(result.success).toBe(true);
    expect(result.filename).toContain("test.pdf");
    expect(result.uploadDate).toBe("2024-01-01");
  });

  it("updates a public document and returns updated fields", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: mockUser });

    (supabase.from as any).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "doc-123",
                  title: "Updated Title",
                  description: "Updated Description",
                  document_date: "2024-05-04",
                  tags: ["updated"],
                  source: "updated source",
                  category: "Case Law",
                  created_at: "2024-05-04T12:00:00",
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const doc = {
      id: "doc-123",
      title: "Updated Title",
      description: "Updated Description",
      date: "2024-05-04",
      tags: ["updated"],
      source: "updated source",
      folder: "Case Law",
      url: "",
      isPublic: true,
      content: "",
      type: "pdf",
      size: "20KB",
      ai_summary: null,
      ai_key_sections: null,
      ai_citations: null,
    };

    const result = await publicService.updatePublicDocument(doc);
    expect(result.title).toBe("Updated Title");
    expect(result.folder).toBe("Case Law");
    expect(result.tags).toEqual(["updated"]);
  });
});
