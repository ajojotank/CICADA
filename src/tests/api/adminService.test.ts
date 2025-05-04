import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { getAdminStats, AdminStats } from "@/services/api"; 
import { supabase } from "@/lib/supabase"; 


vi.mock("@/lib/supabase", () => {
  const mockInvoke = vi.fn();
  return {
    // return a mock supabase client 
    supabase: {
      functions: {
        invoke: mockInvoke,
      },
      auth: {},
    },
  };
});


describe("adminService", () => {
  let mockedInvoke: Mock;

  const defaultStats: AdminStats = {
    documentCount: 0,
    recentUploads: 0,
    storageUsed: "0.00GB",
    totalStorage: "8GB",
    popularSearches: [],
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mockedInvoke = supabase.functions.invoke as Mock;

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks(); // so spy's work
  });

  describe("getAdminStats", () => {
    it("should return admin stats on successful API call", async () => {
      const mockStats: AdminStats = {
        documentCount: 123,
        recentUploads: 15,
        storageUsed: "1.23GB",
        totalStorage: "8GB",
        popularSearches: ["query1", "query2"],
      };

      mockedInvoke.mockResolvedValue({ data: mockStats, error: null });

      const result = await getAdminStats();

      expect(result).toEqual(mockStats); 
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1); 
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "getDashboardStats"
      ); 
      expect(console.error).not.toHaveBeenCalled(); // no errors should be logged
    });

    it("should return default stats and log error when Supabase function returns an error", async () => {
      const mockError = new Error("Supabase function invocation failed");

      mockedInvoke.mockResolvedValue({ data: null, error: mockError });

      const result = await getAdminStats();

      expect(result).toEqual(defaultStats); 
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1); 
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "getDashboardStats"
      ); 
      expect(console.error).toHaveBeenCalledTimes(2); // once for the initial error, once in the catch block
      expect(console.error).toHaveBeenCalledWith(
        "Error fetching admin stats:",
        mockError
      );
      expect(console.error).toHaveBeenCalledWith(
        "Error in getAdminStats:",
        new Error("Failed to fetch admin statistics") 
      );
    });

    it("should return default stats and log error if an unexpected error occurs during the call", async () => {
      
      const unexpectedError = new Error("Network error or something else");

      mockedInvoke.mockRejectedValue(unexpectedError);// simulate network failure etc.

      const result = await getAdminStats();

      expect(result).toEqual(defaultStats); 
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1); 
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "getDashboardStats"
      );
      expect(console.error).toHaveBeenCalledTimes(1); // only called once in the catch block
      expect(console.error).toHaveBeenCalledWith(
        "Error in getAdminStats:",
        unexpectedError
      );
    });
  });
});
