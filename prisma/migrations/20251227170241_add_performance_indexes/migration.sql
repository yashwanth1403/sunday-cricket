-- CreateIndex
CREATE INDEX "Ball_inningsId_idx" ON "Ball"("inningsId");

-- CreateIndex
CREATE INDEX "Ball_createdAt_idx" ON "Ball"("createdAt");

-- CreateIndex
CREATE INDEX "Innings_matchId_idx" ON "Innings"("matchId");

-- CreateIndex
CREATE INDEX "PlayerMatchStats_matchId_inningsId_idx" ON "PlayerMatchStats"("matchId", "inningsId");

-- CreateIndex
CREATE INDEX "PlayerMatchStats_playerId_idx" ON "PlayerMatchStats"("playerId");
