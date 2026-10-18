// Shared by browser validation and the streaming parser. MB here means 1024² bytes.
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = MAX_VIDEO_BYTES + 64 * 1024;
export const UPLOAD_LIMIT_MESSAGE =
  "Choose an MP4 or MOV video up to 100 MB (104,857,600 bytes).";
