/** Muted category hues for template filters. Kept low in saturation so they label without shouting. */
const COLORS: Record<string, string> = {
  'instagram-post': '#E86A47',
  'instagram-story': '#E86A47',
  'facebook-cover': '#E86A47',
  'pinterest-pin': '#E86A47',
  presentation: '#3D82A8',
  poster: '#8756A8',
  'linkedin-banner': '#268A5B',
  'youtube-thumbnail': '#3B7770',
  'a4-document': '#75624E',
}

export function categoryColor(slug: string): string {
  return COLORS[slug] ?? '#8C8982'
}
