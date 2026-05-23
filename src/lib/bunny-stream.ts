import crypto from "crypto";

const BUNNY_LIBRARY_ID =
  process.env.BUNNY_STREAM_LIBRARY_ID || process.env.BUNNY_LIBRARY_ID || "650875";
const BUNNY_API_KEY = process.env.BUNNY_API_KEY || "";
const BUNNY_TOKEN_KEY =
  process.env.BUNNY_STREAM_TOKEN_AUTH_KEY || process.env.BUNNY_TOKEN_KEY || "";
const BUNNY_CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME || "vz-a3ef6e25-703.b-cdn.net";

const DEFAULT_PLAYER_PARAMS = {
  autoplay: "false",
  loop: "false",
  muted: "false",
  preload: "true",
  responsive: "true",
} as const;

/** Set to "true" only if Embed View Token Authentication is enabled in Bunny Stream library settings */
export function isBunnyEmbedSigningEnabled(): boolean {
  return process.env.BUNNY_EMBED_SIGNING_ENABLED === "true";
}

/**
 * Build Bunny Stream iframe embed URL (libraryId + video GUID).
 * @see https://docs.bunny.net/docs/stream-embedding-videos
 */
export function buildBunnyEmbedUrl(videoId: string, signed = isBunnyEmbedSigningEnabled()): string {
  const libraryId = BUNNY_LIBRARY_ID;
  const base = `https://player.mediadelivery.net/embed/${libraryId}/${videoId}`;
  const params = new URLSearchParams(DEFAULT_PLAYER_PARAMS);

  if (!signed || !BUNNY_TOKEN_KEY) {
    return `${base}?${params.toString()}`;
  }

  const expires = Math.floor(Date.now() / 1000) + 60 * 60;
  const token = crypto
    .createHash("sha256")
    .update(`${BUNNY_TOKEN_KEY}${videoId}${expires}`)
    .digest("hex");

  params.set("token", token);
  params.set("expires", String(expires));

  return `${base}?${params.toString()}`;
}

/**
 * Generate a secure Bunny Stream playback token
 * This token is required to play videos securely
 */
/** @deprecated Use buildBunnyEmbedUrl — CDN token format differs from embed view tokens */
export function generateBunnyPlaybackToken(
  videoId: string,
  expirationMinutes: number = 60
): string {
  const expirationTime = Math.floor(Date.now() / 1000) + expirationMinutes * 60;
  const hmac = crypto.createHmac("sha256", BUNNY_TOKEN_KEY);
  hmac.update(`${videoId}${expirationTime}`);
  return `${hmac.digest("hex")}${expirationTime}`;
}

/**
 * Get Bunny Stream CDN URL for a video
 */
export function getBunnyVideoUrl(bunnyId: string, token?: string): string {
  const baseUrl = `https://${BUNNY_CDN_HOSTNAME}/${BUNNY_LIBRARY_ID}/${bunnyId}/`;

  if (token) {
    return `${baseUrl}?token=${token}`;
  }

  return baseUrl;
}

/**
 * Fetch video information from Bunny API
 */
export async function getVideoInfo(bunnyId: string) {
  if (!BUNNY_API_KEY) {
    console.warn("BUNNY_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.bunnycdn.com/videolibrary/${BUNNY_LIBRARY_ID}/videos/${bunnyId}`,
      {
        method: "GET",
        headers: {
          AccessKey: BUNNY_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch video info:", response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching video info:", error);
    return null;
  }
}

/**
 * List all videos in the library
 */
export async function listBunnyVideos(pageNumber: number = 0, itemsPerPage: number = 100) {
  if (!BUNNY_API_KEY) {
    console.warn("BUNNY_API_KEY not configured");
    return [];
  }

  try {
    const response = await fetch(
      `https://api.bunnycdn.com/videolibrary/${BUNNY_LIBRARY_ID}/videos?page=${pageNumber}&itemsPerPage=${itemsPerPage}`,
      {
        method: "GET",
        headers: {
          AccessKey: BUNNY_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch videos:", response.statusText);
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error fetching videos:", error);
    return [];
  }
}

/**
 * Create a new video collection in Bunny (optional, for organization)
 */
export async function createBunnyCollection(name: string) {
  if (!BUNNY_API_KEY) {
    console.warn("BUNNY_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.bunnycdn.com/videolibrary/${BUNNY_LIBRARY_ID}/collections`,
      {
        method: "POST",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      }
    );

    if (!response.ok) {
      console.error("Failed to create collection:", response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating collection:", error);
    return null;
  }
}

/**
 * Update video properties (thumbnail, title, etc.)
 */
export async function updateBunnyVideo(
  bunnyId: string,
  updates: {
    title?: string;
    description?: string;
    collectionId?: string;
  }
) {
  if (!BUNNY_API_KEY) {
    console.warn("BUNNY_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.bunnycdn.com/videolibrary/${BUNNY_LIBRARY_ID}/videos/${bunnyId}`,
      {
        method: "POST",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      console.error("Failed to update video:", response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating video:", error);
    return null;
  }
}

/**
 * Delete a video from Bunny (soft delete - mark as deleted)
 */
export async function deleteBunnyVideo(bunnyId: string) {
  if (!BUNNY_API_KEY) {
    console.warn("BUNNY_API_KEY not configured");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.bunnycdn.com/videolibrary/${BUNNY_LIBRARY_ID}/videos/${bunnyId}`,
      {
        method: "DELETE",
        headers: {
          AccessKey: BUNNY_API_KEY,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Error deleting video:", error);
    return false;
  }
}

/**
 * Get video statistics
 */
export async function getBunnyVideoStats(bunnyId: string) {
  if (!BUNNY_API_KEY) {
    console.warn("BUNNY_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.bunnycdn.com/videolibrary/${BUNNY_LIBRARY_ID}/videos/${bunnyId}/statistics`,
      {
        method: "GET",
        headers: {
          AccessKey: BUNNY_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch video stats:", response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching video stats:", error);
    return null;
  }
}

/**
 * Validate that a bunnyId is properly formatted
 */
export function isValidBunnyId(bunnyId: string): boolean {
  // Bunny video IDs are typically GUID format
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bunnyId);
}

/**
 * Resynchronize video metadata with Bunny API
 * Useful for keeping database in sync with Bunny
 */
export async function syncVideoMetadata(bunnyId: string) {
  const info = await getVideoInfo(bunnyId);
  return info
    ? {
        title: info.title,
        duration: info.length,
        thumbnail: info.thumbnail,
        dateCreated: info.dateCreated,
      }
    : null;
}
