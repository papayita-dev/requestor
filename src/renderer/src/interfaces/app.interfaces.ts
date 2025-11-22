export interface HttpRequest {
  id: string;
  name: string;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: string;
  headers?: { key: string; value: string }[];
  queryParams?: { key: string; value: string; description?: string }[];
  response?: string;
  responseStatus?: number;
  responseTime?: number;
}

export interface Collection {
  id: string;
  name: string;
  children?: HttpRequest[];
}
