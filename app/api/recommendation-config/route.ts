// recommendationApi.ts — Recommendation Engine config (admin). Gerçek /api/admin/recommendation-config.
const ORIGIN =
  (import.meta as { env?: { VITE_API_ORIGIN?: string } }).env?.VITE_API_ORIGIN ?? '';
const BASE = `${ORIGIN}/api/admin/recommendation-config`;

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...init });
  if (!res.ok) throw new Error(`recommendation_api_${res.status}`);
  return res.json() as Promise<T>;
}

export interface RecommendationConfig {
  id: number;
  is_active: boolean;
  title: string;
  description: string;
  cta_text: string;
  algorithm: 'same_category_first' | 'bestseller' | 'price_proximity';
  max_items: number;
  layout: 'grid' | 'carousel';
  collection_url_template: string;
  cargo_types: string[];
  updated_at: string | null;
}

export const recommendationApi = {
  get(): Promise<{ data: RecommendationConfig }> {
    return http(`${BASE}`);
  },
  update(patch: Partial<Omit<RecommendationConfig, 'id' | 'updated_at'>>): Promise<{ data: RecommendationConfig }> {
    return http(`${BASE}`, { method: 'PUT', body: JSON.stringify(patch) });
  },
};
