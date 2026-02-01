import { randomUUID } from 'node:crypto'

export function id(prefix?: string) {
  const v = randomUUID()
  return prefix ? `${prefix}_${v}` : v
}
