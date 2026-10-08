import type { ListUsersQuery } from "../schemas/admin-user.schema"

const USERS_PATH = "/admin/users"
const DEFAULT_PAGE_SIZE = 8

/** URL de la lista de usuarios; omite valores por defecto y vacíos. */
export function buildUsersHref(query: Partial<ListUsersQuery>): string {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.role) params.set("role", query.role)
  if (query.status) params.set("status", query.status)
  if (query.page && query.page > 1) params.set("page", String(query.page))
  if (query.pageSize && query.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(query.pageSize))
  }
  const search = params.toString()
  return search ? `${USERS_PATH}?${search}` : USERS_PATH
}

/** Ventana de páginas numeradas centrada en la página actual. */
export function getPageWindow(
  page: number,
  pageCount: number,
  size = 5,
): number[] {
  const length = Math.min(size, pageCount)
  if (length <= 0) return []
  const maxStart = pageCount - length + 1
  const start = Math.min(Math.max(page - Math.floor(size / 2), 1), maxStart)
  return Array.from({ length }, (_, i) => start + i)
}
