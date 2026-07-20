/**
 * features/timeline/file.ts — 附件檔案轉 dataURL（試用模式落地於 IndexedDB）。
 * 限制單檔大小，避免 IndexedDB 儲存爆量／表單卡頓。
 */

export const MAX_ATTACHMENT_KB = 4096; // 4 MB

export interface ReadFileResult {
  fileName: string;
  mimeType: string;
  fileDataUrl: string;
  fileSizeKb: number;
}

export function readFileAsDataUrl(file: File): Promise<ReadFileResult> {
  return new Promise((resolve, reject) => {
    const sizeKb = Math.round(file.size / 1024);
    if (sizeKb > MAX_ATTACHMENT_KB) {
      reject(new Error(`檔案過大（${sizeKb} KB），請選擇 ${MAX_ATTACHMENT_KB} KB 以內的檔案。`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("讀取檔案失敗，請重試。"));
        return;
      }
      resolve({ fileName: file.name, mimeType: file.type || "application/octet-stream", fileDataUrl: result, fileSizeKb: sizeKb });
    };
    reader.onerror = () => reject(new Error("讀取檔案失敗，請重試。"));
    reader.readAsDataURL(file);
  });
}
