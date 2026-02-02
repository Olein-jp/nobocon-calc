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

type RankEntry = {
  label: string;
  min: number;
  max: number;
};

export const rankEntries: RankEntry[] = [
  { label: 'ノービス', min: 0, max: 2999 },
  { label: 'I', min: 3000, max: 3999 },
  { label: 'H', min: 4000, max: 4999 },
  { label: 'G', min: 5000, max: 5999 },
  { label: 'F', min: 6000, max: 6999 },
  { label: 'E', min: 7000, max: 7999 },
  { label: 'D', min: 8000, max: 8999 },
  { label: 'C', min: 9000, max: 10999 },
  { label: 'B', min: 11000, max: 13999 },
  { label: 'A', min: 14000, max: 17499 },
  { label: 'S', min: 17500, max: 26999 },
  { label: 'エキスパート', min: 27000, max: 39999 },
  { label: 'アルティメット', min: 40000, max: Number.POSITIVE_INFINITY }
];

export const getRankLabel = (total: number) => {
  const entry = rankEntries.find(({ min, max }) => total >= min && total <= max);
  return entry?.label ?? '未設定';
};
