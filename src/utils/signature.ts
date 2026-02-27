import { Md5 } from "ts-md5";

export function generateSignature(key: string, timestamp: number): string {
  // Use a shorter timestamp precision to account for clock skew (10 minutes)
  const timeWindow = Math.floor(timestamp / 600000);
  const data = `${key}::${timeWindow}`;
  return Md5.hashStr(data);
}

export function verifySignature(
  signature = "",
  key: string,
  timestamp: number
): boolean {
  if (!key) return false;
  // Check current window and previous window for skew
  const current = generateSignature(key, timestamp);
  const previous = generateSignature(key, timestamp - 600000);
  return signature === current || signature === previous;
}
