/** Product Hunt launch banner */
export const PRODUCT_HUNT_DEFAULT_URL = "https://www.producthunt.com/products/page2top"

export const PRODUCT_HUNT_POST_ID = String(
  import.meta.env.VITE_PRODUCT_HUNT_POST_ID || "",
).trim()

export const PRODUCT_HUNT_URL = String(
  import.meta.env.VITE_PRODUCT_HUNT_URL || PRODUCT_HUNT_DEFAULT_URL,
).trim()

export const PRODUCT_HUNT_BANNER_ENABLED = Boolean(PRODUCT_HUNT_URL)

export function productHuntBadgeSrc(postId: string): string {
  return `https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=${encodeURIComponent(postId)}&theme=dark`
}
