import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { fetchChatResponse, ChatEventListener, ChatResponse } from "@/services/api";
import { supabase, getCurrentUser } from "@/lib/supabase"; 

vi.mock("@/lib/supabase", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/supabase")>();
  const mockInsert = vi.fn();
  const mockFrom = vi.fn(() => ({ insert: mockInsert }));
  const mockGetCurrentUser = vi.fn();

  return {
    ...original, 
    supabase: {
      ...original.supabase,
      from: mockFrom, 
      functions: {
        invoke: vi.fn(),
      },
      auth: {
        ...original.supabase.auth,
      },
    },
    getCurrentUser: mockGetCurrentUser, 
  };
});

// helper to create SSE formatted strings
const createSseEvent = (event: string, data: unknown): string => {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
};

// helper to create a mock ReadableStream from SSE events
const createMockStream = (events: string[]): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  let eventIndex = 0;

  return new ReadableStream({
    async pull(controller) {
      if (eventIndex < events.length) {
        const chunk = encoder.encode(events[eventIndex]);
        controller.enqueue(chunk);
        eventIndex++;
      } else {
        controller.close();
      }
    },
  });
};

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("chatService", () => {

  let mockedGetCurrentUser: Mock;
  let mockedFrom: Mock;
  let mockedInsert: Mock;

  const mockQuestion = "What is Vitest?";
  const mockContext = [{ key: "msg_0", value: "Previous message" }];
  const mockEndpoint =
    "https://oiffhjrgslgblewwonrs.supabase.co/functions/v1/test"; // Match endpoint in service

  const mockSources: ChatResponse["sources"] = [
    {
      id: "s1",
      title: "Source 1",
      domain: "vitest.dev",
      snippet: "...",
      preview: "...",
    },
  ];
  const mockFinalText = "Vitest is a testing framework.";
  const mockFinalResponse: ChatResponse = {
    text: mockFinalText,
    sources: mockSources,
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mockedGetCurrentUser = getCurrentUser as Mock; // vi mock only runs once so have to re-assign
    mockedFrom = supabase.from as Mock;

    mockedInsert = mockedFrom.mock.results[0]?.value?.insert || vi.fn(); // nested mock :(
    mockedFrom.mockReturnValue({ insert: mockedInsert });

    mockFetch.mockClear();

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks(); // so spy's work
  });

  describe("fetchChatResponse", () => {
    it("should fetch response, log query for authenticated user, and call listeners correctly", async () => {
      // Arrange
      const mockUserId = "user-test-123";
      mockedGetCurrentUser.mockResolvedValue({ id: mockUserId }); // user logged in
      mockedInsert.mockResolvedValue({ error: null }); // successful DB insert

      const mockStreamEvents = [
        createSseEvent("data", "Vitest is "),
        createSseEvent("data", "a testing framework."),
        createSseEvent("sources", mockSources),
        createSseEvent("result", mockFinalResponse),
      ];
      const mockStream = createMockStream(mockStreamEvents);
      const mockResponse = new Response(mockStream, { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const eventListener: ChatEventListener = {
        onData: vi.fn(),
        onSources: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      const result = await fetchChatResponse(
        mockQuestion,
        mockContext,
        eventListener
      );

      expect(mockedGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockedFrom).toHaveBeenCalledTimes(1);
      expect(mockedFrom).toHaveBeenCalledWith("logs");
      expect(mockedInsert).toHaveBeenCalledTimes(1);
      expect(mockedInsert).toHaveBeenCalledWith([
        {
          user_id: mockUserId,
          event_type: "search",
          event_data: { query: mockQuestion },
        },
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(mockEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mockQuestion,
          user_id: mockUserId,
          history: [{ role: "user", text: "Previous message" }], 
        }),
      });

      expect(eventListener.onData).toHaveBeenCalledTimes(2);
      expect(eventListener.onData).toHaveBeenNthCalledWith(1, "Vitest is ");
      expect(eventListener.onData).toHaveBeenNthCalledWith(
        2,
        "a testing framework."
      );
      expect(eventListener.onSources).toHaveBeenCalledTimes(1);
      expect(eventListener.onSources).toHaveBeenCalledWith(mockSources);
      expect(eventListener.onComplete).toHaveBeenCalledTimes(1);
      expect(eventListener.onComplete).toHaveBeenCalledWith(mockFinalResponse);
      expect(eventListener.onError).not.toHaveBeenCalled();

      expect(result).toEqual(mockFinalResponse);
    });

    it("should fetch response as anonymous, skip logging, and call listeners", async () => {
      mockedGetCurrentUser.mockResolvedValue(null); // curent user is anon

      const mockStreamEvents = [
        createSseEvent("data", "Data chunk"),
        createSseEvent("sources", mockSources),
        createSseEvent("result", mockFinalResponse),
      ];
      const mockStream = createMockStream(mockStreamEvents);
      const mockResponse = new Response(mockStream, { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const eventListener: ChatEventListener = {
        onData: vi.fn(),
        onSources: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      const result = await fetchChatResponse(
        mockQuestion,
        undefined,
        eventListener
      ); //no context

      expect(mockedGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockedFrom).not.toHaveBeenCalled(); //logging skipped
      expect(mockedInsert).not.toHaveBeenCalled();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(mockEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mockQuestion,
          user_id: "anonymous",
          history: [],
        }),
      });

      expect(eventListener.onData).toHaveBeenCalledTimes(1);
      expect(eventListener.onData).toHaveBeenCalledWith("Data chunk");
      expect(eventListener.onSources).toHaveBeenCalledTimes(1);
      expect(eventListener.onSources).toHaveBeenCalledWith(mockSources);
      expect(eventListener.onComplete).toHaveBeenCalledTimes(1);
      expect(eventListener.onComplete).toHaveBeenCalledWith(mockFinalResponse);
      expect(eventListener.onError).not.toHaveBeenCalled();

      expect(result).toEqual(mockFinalResponse);
      expect(console.log).toHaveBeenCalledWith("👤 Anonymous user");
    });

    it("should handle errors during user fetching but proceed as anonymous", async () => {
      const userError = new Error("Failed to get user");
      mockedGetCurrentUser.mockRejectedValue(userError); 

      const mockStreamEvents = [createSseEvent("result", mockFinalResponse)];
      const mockStream = createMockStream(mockStreamEvents);
      const mockResponse = new Response(mockStream, { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const result = await fetchChatResponse(mockQuestion);

      expect(mockedGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        "❌ Error getting user ID:",
        userError
      );
      expect(mockedFrom).not.toHaveBeenCalled(); // logging skipped
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"user_id":"anonymous"'), 
        })
      );
      expect(result).toEqual(mockFinalResponse);
    });

    it("should handle errors during logging but proceed with fetch", async () => {
      const mockUserId = "user-log-error-456";
      const logError = new Error("DB insert failed");
      mockedGetCurrentUser.mockResolvedValue({ id: mockUserId });
      mockedInsert.mockRejectedValue(logError); //search logging failure

      const mockStreamEvents = [createSseEvent("result", mockFinalResponse)];
      const mockStream = createMockStream(mockStreamEvents);
      const mockResponse = new Response(mockStream, { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const result = await fetchChatResponse(mockQuestion);

      expect(mockedGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockedFrom).toHaveBeenCalledTimes(1);
      expect(mockedInsert).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        "❌ Error logging search query:",
        logError
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(`"user_id":"${mockUserId}"`),
        })
      );
      expect(result).toEqual(mockFinalResponse);
    });

    it("should throw error if fetch response has no body", async () => {
      mockedGetCurrentUser.mockResolvedValue(null); // curent user is anon
      const mockResponse = new Response(null, { status: 200 }); // no body
      mockFetch.mockResolvedValue(mockResponse);

      await expect(fetchChatResponse(mockQuestion)).rejects.toThrow(
        "No response body received"
      );
      expect(console.error).toHaveBeenCalledWith(
        "❌ No response body received"
      );
      expect(mockFetch).toHaveBeenCalledTimes(1); //fetch still attempted
    });

    it("should handle stream error event and call onError listener", async () => {
      mockedGetCurrentUser.mockResolvedValue(null); // curent user is anon
      const streamErrorMsg = "Error processing request in edge function";
      const mockStreamEvents = [
        createSseEvent("error", { error: streamErrorMsg }),
      ];
      const mockStream = createMockStream(mockStreamEvents);
      const mockResponse = new Response(mockStream, { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const eventListener: ChatEventListener = {
        onError: vi.fn(),
        onComplete: vi.fn(),
      };

      await expect(
        fetchChatResponse(mockQuestion, undefined, eventListener)
      ).rejects.toThrow(streamErrorMsg);

      expect(eventListener.onError).toHaveBeenCalledTimes(1);
      expect(eventListener.onError).toHaveBeenCalledWith(streamErrorMsg);
      expect(eventListener.onComplete).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        "❌ Error event received:",
        streamErrorMsg
      );
    });

    it("should return accumulated data if stream ends without a result event", async () => {
      mockedGetCurrentUser.mockResolvedValue(null); // curent user is anon
      const mockStreamEvents = [
        createSseEvent("data", "Partial "),
        createSseEvent("sources", mockSources),
        createSseEvent("data", "answer."),
      ];
      const mockStream = createMockStream(mockStreamEvents);
      const mockResponse = new Response(mockStream, { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const eventListener: ChatEventListener = {
        onData: vi.fn(),
        onSources: vi.fn(),
        onComplete: vi.fn(),
      };

      const result = await fetchChatResponse(
        mockQuestion,
        undefined,
        eventListener
      );

      const expectedAccumulatedResponse: ChatResponse = {
        text: "Partial answer.",
        sources: mockSources,
      };
      expect(result).toEqual(expectedAccumulatedResponse);
      expect(eventListener.onData).toHaveBeenCalledTimes(2);
      expect(eventListener.onSources).toHaveBeenCalledTimes(1);
      expect(eventListener.onComplete).toHaveBeenCalledTimes(1); // onComplete still called
      expect(eventListener.onComplete).toHaveBeenCalledWith(
        expectedAccumulatedResponse
      );
      expect(console.log).toHaveBeenCalledWith("✅ Stream complete");
      expect(console.log).toHaveBeenCalledWith(
        "⚠️ No result event received, returning accumulated data"
      );
    });
  });
});
