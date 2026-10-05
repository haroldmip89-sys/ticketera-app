export const DECORATIVE_QR_SIZE = 21

const FINDER_SIZE = 7
/** Marca de 7×7 + separador de 1 módulo. */
const FINDER_AREA = FINDER_SIZE + 1
const FINDER_ORIGINS = [
  [0, 0],
  [0, DECORATIVE_QR_SIZE - FINDER_SIZE],
  [DECORATIVE_QR_SIZE - FINDER_SIZE, 0],
] as const

const LCG_MULTIPLIER = 9301
const LCG_INCREMENT = 49297
const LCG_MODULUS = 233280
const LCG_THRESHOLD = 0.52

/** true/false si la celda pertenece a una marca de posición o a su separador; undefined si es de relleno. */
function getFinderCell(row: number, column: number): boolean | undefined {
  for (const [originRow, originColumn] of FINDER_ORIGINS) {
    // El separador queda del lado interior de la grilla: abajo/derecha, abajo/izquierda o arriba/derecha según la esquina.
    const areaRow = originRow === 0 ? 0 : originRow - 1
    const areaColumn = originColumn === 0 ? 0 : originColumn - 1
    if (row < areaRow || row >= areaRow + FINDER_AREA) continue
    if (column < areaColumn || column >= areaColumn + FINDER_AREA) continue

    const r = row - originRow
    const c = column - originColumn
    if (r < 0 || r >= FINDER_SIZE || c < 0 || c >= FINDER_SIZE) return false

    const ring = Math.min(r, c, FINDER_SIZE - 1 - r, FINDER_SIZE - 1 - c)
    return ring !== 1
  }
  return undefined
}

/** 441 booleanos fila por fila (índice = fila × 21 + columna; true = módulo oscuro).
 *  Tres marcas de posición con su separador y, el resto, el LCG del lienzo: x = (x × 9301 + 49297) % 233280 desde
 *  x = seed; se enciende si x / 233280 > 0.52. Determinista: el mismo seed da la misma grilla. */
export function getDecorativeQrCells(seed: number): boolean[] {
  const cells: boolean[] = []
  let x = seed

  for (let row = 0; row < DECORATIVE_QR_SIZE; row++) {
    for (let column = 0; column < DECORATIVE_QR_SIZE; column++) {
      const finderCell = getFinderCell(row, column)
      if (finderCell !== undefined) {
        cells.push(finderCell)
        continue
      }
      x = (x * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS
      cells.push(x / LCG_MODULUS > LCG_THRESHOLD)
    }
  }

  return cells
}

export type DecorativeQrProps = { seed: number; className?: string }

/** Patrón decorativo con aspecto de QR: no codifica nada. Colores fijos en ambos temas (imita un objeto físico). */
export function DecorativeQr({ seed, className }: DecorativeQrProps) {
  const cells = getDecorativeQrCells(seed)

  return (
    <svg
      viewBox={`0 0 ${DECORATIVE_QR_SIZE} ${DECORATIVE_QR_SIZE}`}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={DECORATIVE_QR_SIZE} height={DECORATIVE_QR_SIZE} className="fill-white" />
      <g className="fill-zinc-900">
        {cells.map((isDark, index) =>
          isDark ? (
            <rect
              key={index}
              x={index % DECORATIVE_QR_SIZE}
              y={Math.floor(index / DECORATIVE_QR_SIZE)}
              width={1}
              height={1}
            />
          ) : null
        )}
      </g>
    </svg>
  )
}
