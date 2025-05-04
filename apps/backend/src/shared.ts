import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"

dayjs.extend(relativeTime)

// TODO: move this to a new package named "shared"

export function displayDate(date: Date) {
  const dateObj = dayjs(date)

  const daysFromNow = dateObj.diff(dayjs(), "day")

  if (daysFromNow > 7) {
    return dateObj.format("DD MMM YYYY")
  }

  return dateObj.fromNow()
}
