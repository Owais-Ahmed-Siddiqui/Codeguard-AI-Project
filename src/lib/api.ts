const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

console.log('[CodeGuard] API URL:', API_URL);

interface ReviewResponse {
  response: string;
  reviewId: string | null;
  credits: { used: number; remaining: number; maxCredits?: number };
  saved?: boolean;
}

interface ChatResponse {
  response: string;
}

interface CreditsResponse {
  used: number;
  remaining: number;
  maxCredits?: number;
}

export interface HistoryReview {
  id: string;
  language: string;
  created_at: string;
  code: string;
  ai_feedback: { response: string } | null;
}

interface HistoryStats {
  totalReviews: number;
  criticalFound: number;
  topLanguage: string;
  languagesUsed: number;
  credits: { used: number; remaining: number; maxCredits?: number };
}

interface HistoryResponse {
  reviews: HistoryReview[];
  stats: HistoryStats;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    let data: any;
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      console.error(`[API] Non-JSON response from ${path}:`, text.substring(0, 200));
      throw new ApiError(
        `Server returned non-JSON response (${res.status}). Is backend running at ${API_URL}? Check server/.env and run: cd server && npm run dev`,
        res.status
      );
    }

    if (!res.ok) {
      console.error(`[API] ${path} -> ${res.status}:`, data);
      throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
    }
    return data as T;
  } catch (err: any) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      const msg = `Cannot connect to backend at ${API_URL}. Make sure server is running: cd server && npm run dev`;
      console.error('[API] Network error:', msg);
      throw new ApiError(msg, 0);
    }
    if (err instanceof ApiError) throw err;
    console.error('[API] Unknown error:', err);
    throw new ApiError(err.message || 'Unknown error occurred.', 0);
  }
}

function authHeaders(token: string | null) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const api = {
  health: () => request<{ status: string; model?: string; gemini: boolean; supabase: boolean; maxCredits?: number }>('/api/health'),

  getCredits: (token: string) =>
    request<CreditsResponse>('/api/credits', { headers: authHeaders(token) }),

  review: (token: string | null, code: string, language: string, ghostMode: boolean) => {
    console.log('[API] Review:', { language, ghostMode, codeLen: code.length, hasAuth: !!token });
    return request<ReviewResponse>('/api/review', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ code, language, ghostMode }),
    });
  },

  chat: (token: string | null, message: string, options: {
    reviewId?: string | null; code?: string; language?: string;
    reviewResponse?: string; ghostMode?: boolean;
  }) => {
    console.log('[API] Chat:', { msgLen: message.length, hasAuth: !!token, hasReviewId: !!options.reviewId });
    return request<ChatResponse>('/api/chat', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ message, ...options }),
    });
  },

  getHistory: (token: string) => request<HistoryResponse>('/api/history', { headers: authHeaders(token) }),

  deleteReview: (token: string, reviewId: string) =>
    request<{ success: boolean }>(`/api/reviews/${reviewId}`, { method: 'DELETE', headers: authHeaders(token) }),
};

export { ApiError };
export type { ReviewResponse, ChatResponse, CreditsResponse };
