/*
  Warnings:

  - The primary key for the `shlink_access` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "shlink_access" DROP CONSTRAINT "shlink_access_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "shlink_access_pkey" PRIMARY KEY ("id");
