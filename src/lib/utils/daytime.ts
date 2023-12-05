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