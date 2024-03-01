export const timeFromNow = (time: Date) => {
  const now = Date.now()
  const diff = (now - time.getTime()) / 1000;

  let seconds: string | number = Math.floor(diff % 60),
    minutes: string | number = Math.floor((diff / 60) % 60),
    hours: string | number = Math.floor((diff / (60 * 60)) % 24),
    days: string | number = Math.floor((diff / (60 * 60)) / 24);

  if (days < 1 && hours === 1) return hours + " hr"
  if (days < 1 && hours > 1) return hours + " hrs"
  if (days < 1 && hours < 1 && minutes < 1) return "just now"
  if (days < 1 && hours < 1 && minutes === 1) return minutes + " min"
  if (days < 1 && hours < 1 && minutes > 1) return minutes + " mins"
  if (days === 1) return days + " day"
  if (days > 0) return days + " days"
}

export const getYearTimestamps = (year: number): [number, number] => {
  // Start of the year: January 1st of the given year at 00:00:00
  const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const startOfYearTimestamp = Math.floor(startOfYear.getTime() / 1000);

  // End of the year: December 31st of the given year at 23:59:59
  const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  const endOfYearTimestamp = Math.floor(endOfYear.getTime() / 1000);

  return [startOfYearTimestamp, endOfYearTimestamp];
}