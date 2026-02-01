export const gradeEntries = [
  ['8Q', 100],
  ['7Q', 200],
  ['6Q', 300],
  ['5Q', 400],
  ['4Q', 500],
  ['3Q', 650],
  ['2Q', 1050],
  ['1Q', 1400],
  ['1D', 2500],
  ['2D', 4000]
] as const;

export const boardEntries = [
  ['8Q(91)', 100],
  ['7Q(92)', 200],
  ['6Q(93)', 300],
  ['5Q(94)', 400],
  ['4Q(95)', 500],
  ['3Q(96)', 650],
  ['3Q(97)', 650],
  ['2Q(98)', 1050]
] as const;

export const gradeKeys = gradeEntries.map(([key]) => key);
export const boardKeys = boardEntries.map(([key]) => key);

export const gradePoints = Object.fromEntries(gradeEntries) as Record<string, number>;
export const boardPoints = Object.fromEntries(boardEntries) as Record<string, number>;

export const formatPoints = (value: number) => new Intl.NumberFormat('ja-JP').format(value);
