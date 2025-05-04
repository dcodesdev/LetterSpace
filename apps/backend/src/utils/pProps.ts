export async function resolveProps<T extends Record<string, Promise<any>>>(
  promises: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const keys = Object.keys(promises)
  const values = await Promise.all(Object.values(promises))

  return keys.reduce(
    (acc, key, index) => {
      acc[key as keyof T] = values[index]
      return acc
    },
    {} as { [K in keyof T]: Awaited<T[K]> }
  )
}
