export function formatTime(seconds: string): string {
	const totalSeconds = parseInt(seconds, 10);
	const minutes = Math.floor(totalSeconds / 60);
	const remainingSeconds = totalSeconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
