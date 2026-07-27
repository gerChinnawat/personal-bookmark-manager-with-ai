// Single envelope shape for every response, success or error
// (API_DESIGN.md §2/§6). Success bodies are wrapped by
// ResponseEnvelopeInterceptor; error bodies are produced by
// AllExceptionsFilter. `data` carries the resource/array on success and
// {code, details?, requestId} on error.
export interface ApiResponse<T = unknown> {
  status: boolean;
  message: string;
  data: T;
}
