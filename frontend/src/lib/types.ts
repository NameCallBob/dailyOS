/**
 * lib/types.ts — 所有模組共用的基礎型別。
 */

/** 所有可同步資源的共同欄位 */
export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deleted: boolean;
}

/** list() 查詢參數：篩選、搜尋、排序、分頁 */
export interface ListParams {
  filters?: Record<string, string | number | boolean | undefined>;
  search?: string;
  ordering?: string;
  page?: number;
  pageSize?: number;
}

/** 分頁回應（對齊 DRF 風格 { results, count, next, previous }） */
export interface Page<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

/** 標準錯誤格式 */
export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
}

export class ApiRequestError extends Error {
  code: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
  status: number;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = error.code;
    this.fieldErrors = error.fieldErrors;
    this.requestId = error.requestId;
  }
}

/** 系統狀態旗標：資料視圖四態之一（Loading / Error / Empty / Offline 由 UI 依此推導） */
export type AsyncStatus = "idle" | "loading" | "error" | "success";

/** Quick Add 等自然語句解析的通用信心分級 */
export type ParseConfidence = "high" | "medium" | "low";
