// Measure the minutes elapsed since the last update
export async function minutes(baseName) {
	let updated = await Index.get(`${baseName}_lastUpdated`)

	if (!updated) {
		return 999
	}

	let minutes = (Date.now() - new Date(updated)) / 60000
	return minutes
}
