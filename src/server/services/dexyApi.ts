import { toCamelCase } from "@server/utils/camelCase";
import { mapAxiosErrorToTRPCError } from "@server/utils/mapErrors";
import { TRPCError } from "@trpc/server";
import axios from "axios";
import { cruxApi } from "./axiosInstance";

export const dexyApi = {
  async getAnalytics(instanceName: string): Promise<DexyAnalytics | null> {
    try {
      const response = await cruxApi.get(`/dexy/analytics/${instanceName}`);
      return toCamelCase(response.data) as DexyAnalytics;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return null;
        }
        throw mapAxiosErrorToTRPCError(error);
      } else {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unknown error occurred",
        });
      }
    }
  },

  async getAnalyticsHistory(
    instanceName: string,
    metric: DexyMetric,
    from: number,
    to: number,
    resolution: DexyResolution,
  ): Promise<DexyHistoryPoint[]> {
    try {
      const response = await cruxApi.get(
        `/dexy/analytics/${instanceName}/history`,
        {
          params: {
            metric,
            from,
            to,
            resolution,
          },
        },
      );
      return (response.data as any[]).map((point) => ({
        timestamp: point.timestamp,
        value: point.value,
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw mapAxiosErrorToTRPCError(error);
      } else {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unknown error occurred",
        });
      }
    }
  },
};
