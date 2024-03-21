import { TRPCError } from '@trpc/server';
import axios from 'axios';

export const mapAxiosErrorToTRPCError = (error: any): TRPCError => {
  if (axios.isAxiosError(error)) {
    const code = (status: number | undefined) => {
      switch (status) {
        case 400: return 'BAD_REQUEST';
        case 401: return 'UNAUTHORIZED';
        case 403: return 'FORBIDDEN';
        case 404: return 'NOT_FOUND';
        case 408: return 'CLIENT_CLOSED_REQUEST'; // Use CLIENT_CLOSED_REQUEST for timeout-related errors
        case 429: return 'TOO_MANY_REQUESTS';
        // Map 502, 503, and 504 to INTERNAL_SERVER_ERROR or another appropriate code
        case 500:
        case 502: // Bad Gateway
        case 503: // Service Unavailable
        case 504: // Gateway Timeout
          return 'INTERNAL_SERVER_ERROR';
        default: return 'INTERNAL_SERVER_ERROR';
      }
    };

    console.log(error.response?.status)
    console.log(error.response?.data)
    console.log(code(error.response?.status))
    return new TRPCError({
      message: error.response?.data as string,
      code: code(error.response?.status),
    });
  }

  if (error instanceof TRPCError) {
    return error; // Rethrow TRPCError errors directly
  }

  // Handle network errors and other Axios errors without a response (e.g., request cancellation)
  if (error.message === "Network Error" || !error.response) {
    return new TRPCError({
      message: error.message || 'Network error or request cancelled',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  // Handle all other errors that may not have been caught by the above blocks
  return new TRPCError({
    message: 'An unexpected error occurred',
    code: 'INTERNAL_SERVER_ERROR'
  });
};
