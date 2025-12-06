type Batter = {
  id: string;
  name: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
};

type Bowler = {
  id: string;
  name: string;
  ballsBowled: number;
  runsConceded: number;
  wickets: number;
};

interface LiveStatsPanelProps {
  striker?: Batter;
  nonStriker?: Batter;
  bowler?: Bowler;
}

function oversFromBalls(balls: number): string {
  const overs = Math.floor(balls / 6);
  const rem = balls % 6;
  return `${overs}.${rem}`;
}

export function LiveStatsPanel({
  striker,
  nonStriker,
  bowler,
}: LiveStatsPanelProps) {
  const strikerSr =
    striker && striker.ballsFaced > 0
      ? ((striker.runs / striker.ballsFaced) * 100).toFixed(1)
      : "-";
  const nonStrikerSr =
    nonStriker && nonStriker.ballsFaced > 0
      ? ((nonStriker.runs / nonStriker.ballsFaced) * 100).toFixed(1)
      : "-";
  const economy =
    bowler && bowler.ballsBowled > 0
      ? (bowler.runsConceded / (bowler.ballsBowled / 6)).toFixed(1)
      : "-";

  return (
    <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-md md:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-600">
          <span>🏏</span>
          <span>Batting</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-blue-50 p-2">
            <span className="font-bold text-slate-800">
              {striker ? `${striker.name} ⭐` : "-"}
            </span>
            {striker && (
              <span className="text-xs font-semibold text-slate-600">
                {striker.runs}({striker.ballsFaced}) • SR {strikerSr}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2">
            <span className="font-medium text-slate-700">
              {nonStriker?.name ?? "-"}
            </span>
            {nonStriker && (
              <span className="text-xs font-semibold text-slate-600">
                {nonStriker.runs}({nonStriker.ballsFaced}) • SR {nonStrikerSr}
              </span>
            )}
          </div>
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-600">
          <span>🎾</span>
          <span>Bowling</span>
        </div>
        {bowler ? (
          <div className="space-y-2">
            <div className="rounded-lg bg-orange-50 p-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{bowler.name}</span>
                <span className="text-xs font-semibold text-slate-600">
                  {oversFromBalls(bowler.ballsBowled)} • {bowler.runsConceded}/
                  {bowler.wickets}
                </span>
              </div>
              <div className="mt-1 text-xs font-medium text-slate-600">
                Econ: {economy}
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
            Bowler stats appear here.
          </p>
        )}
      </div>
    </div>
  );
}
