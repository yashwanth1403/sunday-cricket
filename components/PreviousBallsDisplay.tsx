type BallLike = {
  id: string;
  overNumber: number;
  ballNumber: number;
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  strikerChanged?: boolean;
};

interface PreviousBallsDisplayProps {
  balls: BallLike[];
}

function renderSymbol(b: BallLike): string {
  if (b.isWicket) return "W";
  if (b.isWide) return "Wd";
  if (b.isNoBall) return "Nb";
  return String(b.runs);
}

export function PreviousBallsDisplay({ balls }: PreviousBallsDisplayProps) {
  const recent = balls.slice(-6); // last 6 balls

  if (recent.length === 0) {
    return (
      <div className="rounded-xl bg-slate-100 p-3 text-center">
        <p className="text-xs text-slate-500">
          📊 Ball timeline will appear here as you start scoring
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-md">
      <div className="mb-2 flex items-center gap-1 text-xs font-bold text-slate-700">
        <span>⚡</span>
        <span>Recent Balls</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.map((b) => {
          const isWicket = b.isWicket;
          const isWide = b.isWide;
          const isNoBall = b.isNoBall;
          const isBoundary = b.runs === 4 || b.runs === 6;

          let bgColor = "bg-blue-100 text-blue-700";
          if (isWicket) bgColor = "bg-red-100 text-red-700";
          else if (isWide || isNoBall) bgColor = "bg-amber-100 text-amber-700";
          else if (isBoundary) bgColor = "bg-green-100 text-green-700";

          return (
            <span
              key={b.id}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg font-bold shadow-sm ${bgColor}`}
            >
              {renderSymbol(b)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
