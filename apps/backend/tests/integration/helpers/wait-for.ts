/**
 * The tracking endpoints respond before their database writes finish, so tests
 * have to poll for the side effect rather than assert on it immediately.
 */
export const waitFor = async (
  assertion: () => void | Promise<void>,
  {
    timeout = 2000,
    interval = 25,
  }: { timeout?: number; interval?: number } = {}
) => {
  const deadline = Date.now() + timeout
  let lastError: unknown

  while (Date.now() < deadline) {
    try {
      await assertion()
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }

  throw lastError
}
