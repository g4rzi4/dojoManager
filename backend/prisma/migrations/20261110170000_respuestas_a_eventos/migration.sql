-- CreateTable
CREATE TABLE "EventRsvp" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "attending" BOOLEAN NOT NULL,
    "respondedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRsvp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventRsvp_studentId_idx" ON "EventRsvp"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRsvp_eventId_studentId_key" ON "EventRsvp"("eventId", "studentId");

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

