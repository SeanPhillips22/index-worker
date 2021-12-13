export async function minutes(baseName: string): Promise<number> {
  const updated = await Index.get(`${baseName}_lastUpdated`)

  if (!updated) {
    return 999
  }

  const minutes = (Date.now() - new Date(updated).valueOf()) / 60000
  return minutes
}
