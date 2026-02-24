/*
  Warnings:

  - You are about to drop the column `twilioSid` on the `sms_logs` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sms_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "messageId" TEXT
);
INSERT INTO "new_sms_logs" ("id", "phone", "sentAt", "status", "userId", "userName", "weekStart") SELECT "id", "phone", "sentAt", "status", "userId", "userName", "weekStart" FROM "sms_logs";
DROP TABLE "sms_logs";
ALTER TABLE "new_sms_logs" RENAME TO "sms_logs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
