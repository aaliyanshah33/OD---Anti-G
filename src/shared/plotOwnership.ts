/** Default owner shown when a plot has not been sold or transferred. */
export const DEFAULT_PLOT_OWNER = 'Optional Developers'

/**
 * Returns the display name for a plot's current owner.
 * Unsold / untransferred plots (no ownership record) belong to Optional Developers.
 */
export function getPlotOwnerDisplayName(currentOwnerName?: string | null): string {
  const name = currentOwnerName?.trim()
  return name ? name : DEFAULT_PLOT_OWNER
}
