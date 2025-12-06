type BallLike = {
  id: string;
  overNumber: number;
  ballNumber: number;
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
};

interface OverTimelineProps {
  balls: BallLike[];
}

function ballLabel(b: BallLike): string {
  if (b.isWicket) return "W";
  if (b.isWide) return "Wd";
  if (b.isNoBall) return "Nb";
  return String(b.runs);
}

export function OverTimeline({ balls }: OverTimelineProps) {
  if (balls.length === 0) return null;

  const byOver = new Map<number, BallLike[]>();
  for (const b of balls) {
    if (!byOver.has(b.overNumber)) byOver.set(b.overNumber, []);
    byOver.get(b.overNumber)!.push(b);
  }

  const overs = Array.from(byOver.entries()).sort(([a], [b]) => a - b);

  return (
    <div className="space-y-3 rounded-xl bg-white p-4 shadow-md">
      <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
        <span>📈</span>
        <span>Over Timeline</span>
      </div>
      <div className="space-y-2">
        {overs.slice(-5).map(([over, ballsInOver]) => (
          <div key={over} className="flex items-center gap-3">
            <span className="w-12 text-xs font-bold text-slate-600">
              Over {over + 1}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ballsInOver.map((b) => {
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
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold shadow-sm ${bgColor}`}
                  >
                    {ballLabel(b)}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


