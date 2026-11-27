export const ICONS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 5 5',
  x: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  check: 'M4 12.5l5 5L20 6.5',
  copy: 'M9 9V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3M4 11a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M7 15v4',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5V5.5',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 8v4.4l3.2 1.9',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  upload: 'M12 16V4M7 9l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  pencil: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4',
  layers: 'M12 3l9 5-9 5-9-5 9-5Zm9 9-9 5-9-5',
  sparkles: 'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z',
  filter: 'M4 6h16M7 12h10M10 18h4',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  clipboard: 'M9 4H7v3h10V4h-2M9 4a3 3 0 0 1 6 0v0a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1ZM7 7H5v14h14V7h-2',
  palette: 'M4 13a8 8 0 1 1 8 8h-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4H4Z',
  star: 'M12 3.6l2.5 5.4 5.9.8-4.3 4.1 1.1 5.9-5.2-2.9-5.2 2.9 1.1-5.9-4.3-4.1 5.9-.8z',
} as const

export type IconName = keyof typeof ICONS

