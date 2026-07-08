


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_household_admin"("hid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = hid AND user_id = auth.uid() AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_household_admin"("hid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_household_member"("hid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = hid AND user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_household_member"("hid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."household_invites" (
    "token" "text" NOT NULL,
    "household_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "used_by" "uuid",
    "used_at" timestamp with time zone
);


ALTER TABLE "public"."household_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."household_members" (
    "household_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "household_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."household_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."household_module_data" (
    "household_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."household_module_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."household_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid",
    "type" "text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."household_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."households" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."households" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_data" (
    "user_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_data" OWNER TO "postgres";


ALTER TABLE ONLY "public"."household_invites"
    ADD CONSTRAINT "household_invites_pkey" PRIMARY KEY ("token");



ALTER TABLE ONLY "public"."household_members"
    ADD CONSTRAINT "household_members_pkey" PRIMARY KEY ("household_id", "user_id");



ALTER TABLE ONLY "public"."household_module_data"
    ADD CONSTRAINT "household_module_data_pkey" PRIMARY KEY ("household_id", "module_id", "user_id", "date");



ALTER TABLE ONLY "public"."household_modules"
    ADD CONSTRAINT "household_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."households"
    ADD CONSTRAINT "households_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_data"
    ADD CONSTRAINT "user_data_pkey" PRIMARY KEY ("user_id", "key");



CREATE INDEX "household_members_user_idx" ON "public"."household_members" USING "btree" ("user_id");



CREATE INDEX "household_module_data_module_date_idx" ON "public"."household_module_data" USING "btree" ("module_id", "date");



CREATE INDEX "household_modules_household_idx" ON "public"."household_modules" USING "btree" ("household_id");



ALTER TABLE ONLY "public"."household_invites"
    ADD CONSTRAINT "household_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."household_invites"
    ADD CONSTRAINT "household_invites_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."household_invites"
    ADD CONSTRAINT "household_invites_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."household_members"
    ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."household_members"
    ADD CONSTRAINT "household_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."household_module_data"
    ADD CONSTRAINT "household_module_data_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."household_module_data"
    ADD CONSTRAINT "household_module_data_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."household_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."household_module_data"
    ADD CONSTRAINT "household_module_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."household_modules"
    ADD CONSTRAINT "household_modules_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."households"
    ADD CONSTRAINT "households_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_data"
    ADD CONSTRAINT "user_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Households: admins can delete" ON "public"."households" FOR DELETE USING ("public"."is_household_admin"("id"));



CREATE POLICY "Households: admins can update" ON "public"."households" FOR UPDATE USING ("public"."is_household_admin"("id"));



CREATE POLICY "Households: authenticated can create" ON "public"."households" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Households: members can read" ON "public"."households" FOR SELECT USING ("public"."is_household_member"("id"));



CREATE POLICY "Invites: admin can delete" ON "public"."household_invites" FOR DELETE USING ("public"."is_household_admin"("household_id"));



CREATE POLICY "Invites: admins can create" ON "public"."household_invites" FOR INSERT WITH CHECK (("public"."is_household_admin"("household_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Invites: admins can read theirs, anyone can read by token" ON "public"."household_invites" FOR SELECT USING (("public"."is_household_admin"("household_id") OR ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "Invites: redeem (mark as used)" ON "public"."household_invites" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND ("used_by" IS NULL) AND ("expires_at" > "now"()))) WITH CHECK (("used_by" = "auth"."uid"()));



CREATE POLICY "Members: admin can add" ON "public"."household_members" FOR INSERT WITH CHECK (("public"."is_household_admin"("household_id") OR (("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."household_invites"
  WHERE (("household_invites"."household_id" = "household_members"."household_id") AND ("household_invites"."used_by" = "auth"."uid"()) AND ("household_invites"."used_at" IS NOT NULL)))))));



CREATE POLICY "Members: admin can remove, self can leave" ON "public"."household_members" FOR DELETE USING (("public"."is_household_admin"("household_id") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Members: read fellow members" ON "public"."household_members" FOR SELECT USING ("public"."is_household_member"("household_id"));



CREATE POLICY "Members: update own display_name, admin updates role" ON "public"."household_members" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."is_household_admin"("household_id")));



CREATE POLICY "Module data: members delete own" ON "public"."household_module_data" FOR DELETE USING (("public"."is_household_member"("household_id") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Module data: members read all in household" ON "public"."household_module_data" FOR SELECT USING ("public"."is_household_member"("household_id"));



CREATE POLICY "Module data: members update own" ON "public"."household_module_data" FOR UPDATE USING (("public"."is_household_member"("household_id") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Module data: members write own" ON "public"."household_module_data" FOR INSERT WITH CHECK (("public"."is_household_member"("household_id") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Modules: admin delete" ON "public"."household_modules" FOR DELETE USING ("public"."is_household_admin"("household_id"));



CREATE POLICY "Modules: admin update" ON "public"."household_modules" FOR UPDATE USING ("public"."is_household_admin"("household_id"));



CREATE POLICY "Modules: admin write" ON "public"."household_modules" FOR INSERT WITH CHECK ("public"."is_household_admin"("household_id"));



CREATE POLICY "Modules: members read" ON "public"."household_modules" FOR SELECT USING ("public"."is_household_member"("household_id"));



CREATE POLICY "Profiles: read own and household members" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR ("id" IN ( SELECT "household_members"."user_id"
   FROM "public"."household_members"
  WHERE ("household_members"."household_id" IN ( SELECT "household_members_1"."household_id"
           FROM "public"."household_members" "household_members_1"
          WHERE ("household_members_1"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Profiles: update own" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."household_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."household_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."household_module_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."household_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."households" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_data" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users beheren eigen data" ON "public"."user_data" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_household_admin"("hid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_household_admin"("hid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_household_admin"("hid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_household_member"("hid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_household_member"("hid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_household_member"("hid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."household_invites" TO "anon";
GRANT ALL ON TABLE "public"."household_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."household_invites" TO "service_role";



GRANT ALL ON TABLE "public"."household_members" TO "anon";
GRANT ALL ON TABLE "public"."household_members" TO "authenticated";
GRANT ALL ON TABLE "public"."household_members" TO "service_role";



GRANT ALL ON TABLE "public"."household_module_data" TO "anon";
GRANT ALL ON TABLE "public"."household_module_data" TO "authenticated";
GRANT ALL ON TABLE "public"."household_module_data" TO "service_role";



GRANT ALL ON TABLE "public"."household_modules" TO "anon";
GRANT ALL ON TABLE "public"."household_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."household_modules" TO "service_role";



GRANT ALL ON TABLE "public"."households" TO "anon";
GRANT ALL ON TABLE "public"."households" TO "authenticated";
GRANT ALL ON TABLE "public"."households" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_data" TO "anon";
GRANT ALL ON TABLE "public"."user_data" TO "authenticated";
GRANT ALL ON TABLE "public"."user_data" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







