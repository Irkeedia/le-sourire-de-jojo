const MAX_JSON_BODY_BYTES = 65536;

export function jsonBodyTooLarge(request: Request): boolean {
  const len = request.headers.get("content-length");
  return Boolean(len && Number(len) > MAX_JSON_BODY_BYTES);
}

export const MAX_JSON_BODY_BYTES_EXPORT = MAX_JSON_BODY_BYTES;
