const RESIZABLE_IMAGE_HOST = "images.unsplash.com"

/** Fija el parámetro `w` si el host es images.unsplash.com, conservando el resto de parámetros.
 *  Otra URL, o un string que no sea URL absoluta, se devuelve sin cambios. */
export function withImageWidth(url: string, width: number): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }

  if (parsed.hostname !== RESIZABLE_IMAGE_HOST) return url

  parsed.searchParams.set("w", String(width))
  return parsed.toString()
}
