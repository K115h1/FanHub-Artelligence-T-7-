// upload.service — avatar and fan-content images.
//
// The API has no upload endpoint yet (there is no multipart route in
// FanHubPlus.Api), so these are not wired to anything yet. The client-side
// checks below are the part worth keeping: they reject a wrong type or an
// oversized file before any bytes cross the network, and the server will need
// to repeat them rather than trust this.
import { ApiError } from '../types/api'

/** Avatars are square-ish and small; cap the payload so a phone photo can't stall a request. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Returns null when the file is acceptable, or the reason it is not. */
export function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Choose a JPG, PNG or WebP image.'
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Images must be under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.`
  }
  return null
}

export async function uploadAvatar(_file: File): Promise<{ avatarPath: string }> {
  const reason = validateImage(_file)
  if (reason) throw new ApiError(reason, 0, { isNetworkError: false })

  throw new ApiError('Uploads are not available yet.', 501)
}

export async function uploadFanContent(_file: File): Promise<{ imagePath: string }> {
  const reason = validateImage(_file)
  if (reason) throw new ApiError(reason, 0, { isNetworkError: false })

  throw new ApiError('Uploads are not available yet.', 501)
}
