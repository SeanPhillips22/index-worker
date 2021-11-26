export async function minutes(baseName) {
    let updated = await Index.get(`${baseName}_lastUpdated`)
    let minutes = (Date.now() - new Date(updated)) / 60000
    return minutes
}