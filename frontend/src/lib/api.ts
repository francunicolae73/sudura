const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

async function request<T>(
  endpoint: string,
  method: RequestMethod = "GET",
  body?: unknown,
  token?: string
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Debug logging
  console.log('API Request:', {
    endpoint: `${API_URL}${endpoint}`,
    method,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
  });

  const config: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    console.error('API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      endpoint: `${API_URL}${endpoint}`
    });
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  // Handle empty responses (e.g. 204 No Content or empty body)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  // Check if response has content before parsing JSON
  const text = await response.text();
  if (!text || text.trim() === '') {
    return {} as T;
  }

  return JSON.parse(text);
}

interface AuthResponse {
  token: string;
}

export const api = {
  auth: {
    register: (data: { firstName: string; lastName: string; email: string; password: string }) => 
      request<AuthResponse>("/auth/register", "POST", data),
    login: (data: { email: string; password: string }) => 
      request<AuthResponse>("/auth/authenticate", "POST", data),
  },
  products: {
    getAll: () => request("/products"),
    getById: (id: string) => request(`/products/${id}`),
    getByCategory: (categoryId: string) => request(`/products/category/${categoryId}`),
  },
  categories: {
    getAll: () => request("/categories"),
  },
  orders: {
    create: (data: unknown, token: string) => request("/orders", "POST", data, token),
    getMyOrders: (token: string) => request("/orders", "GET", undefined, token),
    getById: (id: number, token: string) => request(`/orders/${id}`, "GET", undefined, token),
    getByCode: (orderCode: string, token: string) => request(`/orders/code/${orderCode}`, "GET", undefined, token),
  },
  payments: {
    createPaymentIntent: (data: { orderId: number; amount: number; currency?: string }, token: string) => 
      request("/payments/create-payment-intent", "POST", data, token),
    confirmSuccess: (paymentIntentId: string, token: string) => 
      request(`/payments/success?paymentIntentId=${paymentIntentId}`, "POST", undefined, token),
    confirmFailure: (paymentIntentId: string, token: string) => 
      request(`/payments/failure?paymentIntentId=${paymentIntentId}`, "POST", undefined, token),
  },
};
