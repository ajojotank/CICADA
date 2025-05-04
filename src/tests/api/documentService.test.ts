import { supabase } from "@/lib/supabase";
import * as documentService from "@/services/api/documentService";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock("./privateDocumentService", () => ({
  fetchPrivateDocuments: vi.fn(),
  updatePrivateDocument: vi.fn(),
  deletePrivateDocument: vi.fn(),
  uploadPrivateDocument: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock("./publicDocumentService", () => ({
  fetchPublicDocuments: vi.fn(),
  updatePublicDocument: vi.fn(),
  deletePublicDocument: vi.fn(),
  uploadPublicDocument: vi.fn(),
}));

describe("documentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches a private document by ID when user is authenticated", async () => {
    const mockUserId = "user-123";
    const mockDocument = {
      id: "doc-1",
      file_url: "private/path/to/file.pdf",
      file_name: "file.pdf",
      title: "Test Document",
      description: "A test file",
      created_at: "2024-01-01T00:00:00Z",
      metadata: {},
    };

    // Mock user authentication
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: mockUserId } },
    });

    // Mock Supabase query for private document
    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const singleMock = vi
      .fn()
      .mockResolvedValue({ data: mockDocument, error: null });

    (supabase.from as any).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      single: singleMock,
    });

    const result = await documentService.fetchDocumentById("doc-1", "private");

    expect(result).toBeDefined();
    expect(result?.id).toBe("doc-1");
    expect(result?.isPublic).toBe(false);
  });

  it("returns null if document is not found in public table", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "user-abc" } },
    });

    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: null });

    (supabase.from as any).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      single: singleMock,
    });

    const result = await documentService.fetchDocumentById(
      "non-existent-id",
      "public"
    );

    expect(result).toBeNull();
  });
});
