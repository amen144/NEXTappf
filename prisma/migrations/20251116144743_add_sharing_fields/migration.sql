-- AlterTable
ALTER TABLE "public"."post" ADD COLUMN     "sharedWith" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "friends" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
