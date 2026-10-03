import { describe, expect, it } from "vitest"

import { withImageWidth } from "@/lib/image-url"

const UNSPLASH_BASE = "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b"

describe("withImageWidth", () => {
  it("replaces w on an Unsplash URL and keeps the other params", () => {
    const result = new URL(
      withImageWidth(`${UNSPLASH_BASE}?auto=format&fit=crop&w=800&q=70`, 1600)
    )

    expect(result.origin + result.pathname).toBe(UNSPLASH_BASE)
    expect(result.searchParams.get("w")).toBe("1600")
    expect(result.searchParams.get("auto")).toBe("format")
    expect(result.searchParams.get("fit")).toBe("crop")
    expect(result.searchParams.get("q")).toBe("70")
    expect(result.searchParams.getAll("w")).toHaveLength(1)
  })

  it("adds w when the Unsplash URL has none", () => {
    const result = new URL(withImageWidth(`${UNSPLASH_BASE}?auto=format`, 1600))

    expect(result.searchParams.get("w")).toBe("1600")
    expect(result.searchParams.get("auto")).toBe("format")
  })

  it("returns other hosts unchanged", () => {
    const url = "https://example.com/photo.jpg?w=800"
    expect(withImageWidth(url, 1600)).toBe(url)
  })

  it.each(["/local.jpg", ""])("returns %j unchanged", (url) => {
    expect(withImageWidth(url, 1600)).toBe(url)
  })
})
