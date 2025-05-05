import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"

dayjs.extend(relativeTime)

const DATE_TIME_FORMAT = "YYYY-MM-DD HH:mm"
const RELATIVE_TIME_THRESHOLD_DAYS = 7

export const displayDateTime = (date: string | number | Date): string => {
  const now = dayjs()
  const inputDate = dayjs(date)

  if (now.diff(inputDate, "day") < RELATIVE_TIME_THRESHOLD_DAYS) {
    return inputDate.fromNow()
  }

  return inputDate.format(DATE_TIME_FORMAT)
}
