import { toCamelCase } from "@server/utils/camelCase";
import { mapAxiosErrorToTRPCError } from "@server/utils/mapErrors";
import { TRPCError } from "@trpc/server";
import axios from "axios";
import { cruxApi } from "./axiosInstance";

interface BuildMintTxParams {
  mintType: MintType;
  userAddresses: string;
  targetAddress: string;
  ergAmount: number;
  feeToken: string;
}

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

  async getInstances(): Promise<DexyInstance[]> {
    try {
      const response = await cruxApi.get("/dexy/instances");
      return (response.data as any[]).map(
        (instance) => toCamelCase(instance) as DexyInstance,
      );
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

  async getMintStatus(
    instanceName: string,
    mintType: MintType,
    feeToken: string,
  ): Promise<MintStatus | null> {
    try {
      const response = await cruxApi.get(`/dexy/mint_status/${instanceName}`, {
        params: {
          mint_type: mintType,
          fee_token: feeToken,
        },
      });
      return toCamelCase(response.data) as MintStatus;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return null;
        }
        // Handle 400 errors which may contain constraint info
        if (error.response?.status === 400) {
          const errorData = error.response.data as any;
          if (errorData?.error) {
            // Return a MintStatus with isAvailable=false and the constraint
            return {
              instance: instanceName,
              mintType: mintType,
              isAvailable: false,
              maxMintAmount: 0,
              ergRequiredForMax: 0,
              boxState: {} as MintBoxState,
              constraints: [toCamelCase(errorData.error) as MintConstraint],
              feeAmount: 0,
              feeToken: feeToken,
              feeUsd: 0,
            };
          }
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

  async buildMintTx(
    instanceName: string,
    params: BuildMintTxParams,
  ): Promise<BuildMintTxResponse> {
    try {
      const response = await cruxApi.get(
        `/dexy/build_mint_tx/${instanceName}`,
        {
          params: {
            mint_type: params.mintType,
            user_addresses: params.userAddresses,
            target_address: params.targetAddress,
            erg_amount: params.ergAmount,
            fee_token: params.feeToken,
          },
        },
      );
      return toCamelCase(response.data) as BuildMintTxResponse;
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
