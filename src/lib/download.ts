/** Descarga un Blob en el navegador con un <a download> temporal. Solo cliente (usa document).
 *  El object URL se revoca en el siguiente tick: Safari cancela la descarga si se revoca sincrónicamente. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
