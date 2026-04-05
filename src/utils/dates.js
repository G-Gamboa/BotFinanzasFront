export function getGuatemalaDateString() {
  const now = new Date()
  const gt = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Guatemala' })
  )

  const year = gt.getFullYear()
  const month = String(gt.getMonth() + 1).padStart(2, '0')
  const day = String(gt.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}