-- AlterTable
CREATE SEQUENCE "public".audio_id_seq;
ALTER TABLE "public"."audio" ALTER COLUMN "id" SET DEFAULT nextval('"public".audio_id_seq');
ALTER SEQUENCE "public".audio_id_seq OWNED BY "public"."audio"."id";
