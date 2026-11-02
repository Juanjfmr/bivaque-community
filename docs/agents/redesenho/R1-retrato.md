# R1 — Retrato mecânico do esquema

> Fonte: `schema-dump.sql`. Conteúdo extraído sem avaliação de finalidade ou autorização.

## public.comments

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-013 | `content` | `"text"` | sim | — |
| R1-014 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-015 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-016 | `is_deleted` | `boolean` | sim | `false` |
| R1-017 | `post_id` | `"uuid"` | sim | — |
| R1-018 | `user_id` | `"uuid"` | sim | `"auth"."uid"()` |

### Constraints

- **R1-351 comments_content_check**

```sql
CONSTRAINT "comments_content_check" CHECK ((("char_length"("content") >= 1) AND ("char_length"("content") <= 1000)))
```
- **R1-352 comments_pkey**

```sql
PRIMARY KEY ("id")
```
- **R1-353 comments_post_id_fkey**

```sql
FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE
```
- **R1-354 comments_user_id_fkey**

```sql
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```

### Row Level Security

- **R1-355** ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY
- **R1-356** ALTER TABLE ONLY "public"."comments" FORCE ROW LEVEL SECURITY

### Policies

- **R1-357 comments_delete_own** — comando DELETE; papéis "authenticated"

```sql
CREATE POLICY "comments_delete_own" ON "public"."comments" FOR DELETE TO "authenticated" USING (((NOT "is_deleted") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));
```
- **R1-358 comments_insert_member** — comando INSERT; papéis "authenticated"

```sql
CREATE POLICY "comments_insert_member" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "comments"."post_id") AND "private"."can_write_post_to"("p"."locality_id", "p"."community_id", "p"."group_id")))) AND (NOT "public"."is_account_suspended"(( SELECT "auth"."uid"() AS "uid"))) AND "private"."post_accepts_interaction"("post_id") AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));
```
- **R1-359 comments_select_via_post** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "comments_select_via_post" ON "public"."comments" FOR SELECT TO "authenticated" USING (((NOT "is_deleted") AND "private"."can_access_post"("post_id") AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "comments"."post_id") AND (NOT "p"."is_deleted"))))));
```
- **R1-360 comments_update_own** — comando UPDATE; papéis "authenticated"

```sql
CREATE POLICY "comments_update_own" ON "public"."comments" FOR UPDATE TO "authenticated" USING (((NOT "is_deleted") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (((NOT "is_deleted") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "comments"."post_id") AND "private"."can_write_post_to"("p"."locality_id", "p"."community_id", "p"."group_id"))))));
```

### Triggers

- **R1-361 block_soft_delete_comments** — BEFORE UPDATE OF "is_deleted"; WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")); função "private"."block_authenticated_soft_delete"

```sql
CREATE OR REPLACE TRIGGER "block_soft_delete_comments" BEFORE UPDATE OF "is_deleted" ON "public"."comments" FOR EACH ROW WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")) EXECUTE FUNCTION "private"."block_authenticated_soft_delete"();
```
- **R1-362 notify_comment_trigger** — AFTER INSERT; WHEN ausente; função "private"."notify_comment"

```sql
CREATE OR REPLACE TRIGGER "notify_comment_trigger" AFTER INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "private"."notify_comment"();
```

### Grants e revogações

- **R1-363 GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."comments" TO "authenticated"**

```sql
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."comments" TO "authenticated";
```
- **R1-364 GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."comments" TO "service_role"**

```sql
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."comments" TO "service_role";
```
- **R1-365 GRANT UPDATE("is_deleted") ON TABLE "public"."comments" TO "service_role"**

```sql
GRANT UPDATE("is_deleted") ON TABLE "public"."comments" TO "service_role";
```

### Funções que citam esta tabela

- R1-264 `private.reports_block_self`
- R1-289 `public.feed_community`
- R1-290 `public.feed_following`
- R1-291 `public.feed_group`
- R1-292 `public.feed_posts`
- R1-307 `public.list_open_reports`
- R1-332 `public.resolve_report`

## public.communities

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-019 | `banner_path` | `"text"` | não | — |
| R1-020 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-021 | `created_by` | `"uuid"` | sim | — |
| R1-022 | `description` | `"text"` | não | — |
| R1-023 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-024 | `is_deleted` | `boolean` | sim | `false` |
| R1-025 | `locality_id` | `"uuid"` | sim | — |
| R1-026 | `name` | `"text"` | sim | — |
| R1-027 | `owner_user_id` | `"uuid"` | sim | — |
| R1-028 | `thumbnail_path` | `"text"` | não | — |

### Constraints

- **R1-366 communities_banner_path_length**

```sql
CONSTRAINT "communities_banner_path_length" CHECK ((("banner_path" IS NULL) OR (("char_length"("banner_path") >= 1) AND ("char_length"("banner_path") <= 500))))
```
- **R1-367 communities_created_by_fkey**

```sql
FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```
- **R1-368 communities_description_check**

```sql
CONSTRAINT "communities_description_check" CHECK ((("description" IS NULL) OR (("char_length"("description") >= 1) AND ("char_length"("description") <= 500))))
```
- **R1-369 communities_id_locality_id_key**

```sql
UNIQUE ("id", "locality_id")
```
- **R1-370 communities_locality_id_fkey**

```sql
FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT
```
- **R1-371 communities_name_check**

```sql
CONSTRAINT "communities_name_check" CHECK ((("char_length"("name") >= 2) AND ("char_length"("name") <= 80)))
```
- **R1-372 communities_owner_user_id_fkey**

```sql
FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```
- **R1-373 communities_pkey**

```sql
PRIMARY KEY ("id")
```
- **R1-374 communities_thumbnail_path_length**

```sql
CONSTRAINT "communities_thumbnail_path_length" CHECK ((("thumbnail_path" IS NULL) OR (("char_length"("thumbnail_path") >= 1) AND ("char_length"("thumbnail_path") <= 500))))
```

### Row Level Security

- **R1-375** ALTER TABLE "public"."communities" ENABLE ROW LEVEL SECURITY
- **R1-376** ALTER TABLE ONLY "public"."communities" FORCE ROW LEVEL SECURITY

### Policies

- **R1-377 communities_select_authenticated** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "communities_select_authenticated" ON "public"."communities" FOR SELECT TO "authenticated" USING (("is_deleted" = false));
```

### Grants e revogações

- **R1-378 GRANT SELECT ON TABLE "public"."communities" TO "authenticated"**

```sql
GRANT SELECT ON TABLE "public"."communities" TO "authenticated";
```
- **R1-379 GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."communities" TO "service_role"**

```sql
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."communities" TO "service_role";
```

### Funções que citam esta tabela

- R1-223 `private.cascade_community_membership_loss`
- R1-238 `private.is_community_image_owner`
- R1-269 `public.add_community_moderator`
- R1-280 `public.create_community`
- R1-283 `public.create_group_in_community`
- R1-286 `public.create_provider_invitation`
- R1-289 `public.feed_community`
- R1-293 `public.finalize_account_deletion`
- R1-302 `public.list_community_providers`
- R1-322 `public.read_provider_invitation`
- R1-326 `public.remove_community_moderator`
- R1-331 `public.request_community_membership`
- R1-334 `public.revoke_provider_account`
- R1-337 `public.set_community_image`
- R1-340 `public.settle_account_possessions`
- R1-342 `public.transfer_community_ownership`

## public.community_invitations

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-029 | `accepted_at` | `timestamp with time zone` | não | — |
| R1-030 | `accepted_by_user_id` | `"uuid"` | não | — |
| R1-031 | `community_id` | `"uuid"` | sim | — |
| R1-032 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-033 | `expires_at` | `timestamp with time zone` | sim | — |
| R1-034 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-035 | `inviter_user_id` | `"uuid"` | sim | — |
| R1-036 | `status` | `"public"."community_invitation_status"` | sim | `'pending'::"public"."community_invitation_status"` |
| R1-037 | `token_digest` | `"bytea"` | sim | — |

### Constraints

- **R1-380 community_invitations_accepted_by_user_id_fkey**

```sql
FOREIGN KEY ("accepted_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
```
- **R1-381 community_invitations_check**

```sql
CONSTRAINT "community_invitations_check" CHECK (((("status" = 'accepted'::"public"."community_invitation_status") AND ("accepted_by_user_id" IS NOT NULL) AND ("accepted_at" IS NOT NULL)) OR (("status" <> 'accepted'::"public"."community_invitation_status") AND ("accepted_by_user_id" IS NULL) AND ("accepted_at" IS NULL))))
```
- **R1-382 community_invitations_community_id_fkey**

```sql
FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE
```
- **R1-383 community_invitations_inviter_user_id_fkey**

```sql
FOREIGN KEY ("inviter_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```
- **R1-384 community_invitations_pkey**

```sql
PRIMARY KEY ("id")
```
- **R1-385 community_invitations_token_digest_check**

```sql
CONSTRAINT "community_invitations_token_digest_check" CHECK (("octet_length"("token_digest") = 32))
```
- **R1-386 community_invitations_token_digest_key**

```sql
UNIQUE ("token_digest")
```

### Row Level Security

- **R1-387** ALTER TABLE "public"."community_invitations" ENABLE ROW LEVEL SECURITY
- **R1-388** ALTER TABLE ONLY "public"."community_invitations" FORCE ROW LEVEL SECURITY

### Grants e revogações

- **R1-389 GRANT ALL ON TABLE "public"."community_invitations" TO "service_role"**

```sql
GRANT ALL ON TABLE "public"."community_invitations" TO "service_role";
```

### Enum public.community_invitation_status

ID R1-194 — valores: `pending`, `accepted`, `revoked`, `expired`

### Funções que citam esta tabela

- R1-267 `public.accept_community_invitation`
- R1-281 `public.create_community_invitation`
- R1-308 `public.list_pending_community_invitations`
- R1-333 `public.revoke_community_invitation`

## public.community_join_reasons

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-038 | `community_id` | `"uuid"` | sim | — |
| R1-039 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-040 | `reason` | `"text"` | sim | — |
| R1-041 | `user_id` | `"uuid"` | sim | — |

### Constraints

- **R1-390 community_join_reasons_community_id_user_id_fkey**

```sql
FOREIGN KEY ("community_id", "user_id") REFERENCES "public"."community_memberships"("community_id", "user_id") ON DELETE CASCADE
```
- **R1-391 community_join_reasons_pkey**

```sql
PRIMARY KEY ("community_id", "user_id")
```
- **R1-392 community_join_reasons_reason_check**

```sql
CONSTRAINT "community_join_reasons_reason_check" CHECK ((("char_length"("reason") >= 1) AND ("char_length"("reason") <= 500)))
```

### Row Level Security

- **R1-393** ALTER TABLE "public"."community_join_reasons" ENABLE ROW LEVEL SECURITY
- **R1-394** ALTER TABLE ONLY "public"."community_join_reasons" FORCE ROW LEVEL SECURITY

### Policies

- **R1-395 community_join_reasons_select_author_or_moderator** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "community_join_reasons_select_author_or_moderator" ON "public"."community_join_reasons" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."community_memberships" "m"
  WHERE (("m"."community_id" = "community_join_reasons"."community_id") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."status" = 'approved'::"public"."community_membership_status") AND ("m"."role" = ANY (ARRAY['moderator'::"public"."community_membership_role", 'owner'::"public"."community_membership_role"])))))));
```

### Grants e revogações

- **R1-396 GRANT ALL ON TABLE "public"."community_join_reasons" TO "service_role"**

```sql
GRANT ALL ON TABLE "public"."community_join_reasons" TO "service_role";
```
- **R1-397 GRANT SELECT ON TABLE "public"."community_join_reasons" TO "authenticated"**

```sql
GRANT SELECT ON TABLE "public"."community_join_reasons" TO "authenticated";
```

### Funções que citam esta tabela

- R1-331 `public.request_community_membership`

## public.community_memberships

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-042 | `community_id` | `"uuid"` | sim | — |
| R1-043 | `joined_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-044 | `role` | `"public"."community_membership_role"` | sim | `'member'::"public"."community_membership_role"` |
| R1-045 | `status` | `"public"."community_membership_status"` | sim | `'pending'::"public"."community_membership_status"` |
| R1-046 | `user_id` | `"uuid"` | sim | — |

### Constraints

- **R1-398 community_memberships_community_id_fkey**

```sql
FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE
```
- **R1-399 community_memberships_pkey**

```sql
PRIMARY KEY ("community_id", "user_id")
```
- **R1-400 community_memberships_user_id_fkey**

```sql
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```

### Row Level Security

- **R1-401** ALTER TABLE "public"."community_memberships" ENABLE ROW LEVEL SECURITY
- **R1-402** ALTER TABLE ONLY "public"."community_memberships" FORCE ROW LEVEL SECURITY

### Policies

- **R1-403 community_memberships_select_comember** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "community_memberships_select_comember" ON "public"."community_memberships" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_community_member"("community_id")));
```

### Triggers

- **R1-404 cascade_community_membership_downgrade_trigger** — AFTER UPDATE OF "status"; WHEN ((("old"."status" = 'approved'::"public"."community_membership_status") AND ("new"."status" <> 'approved'::"public"."community_membership_status"))); função "private"."cascade_community_membership_downgrade"

```sql
CREATE OR REPLACE TRIGGER "cascade_community_membership_downgrade_trigger" AFTER UPDATE OF "status" ON "public"."community_memberships" FOR EACH ROW WHEN ((("old"."status" = 'approved'::"public"."community_membership_status") AND ("new"."status" <> 'approved'::"public"."community_membership_status"))) EXECUTE FUNCTION "private"."cascade_community_membership_downgrade"();
```
- **R1-405 cascade_community_membership_loss_trigger** — AFTER DELETE; WHEN ausente; função "private"."cascade_community_membership_loss"

```sql
CREATE OR REPLACE TRIGGER "cascade_community_membership_loss_trigger" AFTER DELETE ON "public"."community_memberships" FOR EACH ROW EXECUTE FUNCTION "private"."cascade_community_membership_loss"();
```

### Grants e revogações

- **R1-406 GRANT ALL ON TABLE "public"."community_memberships" TO "service_role"**

```sql
GRANT ALL ON TABLE "public"."community_memberships" TO "service_role";
```
- **R1-407 GRANT SELECT ON TABLE "public"."community_memberships" TO "authenticated"**

```sql
GRANT SELECT ON TABLE "public"."community_memberships" TO "authenticated";
```

### Enum public.community_membership_role

ID R1-195 — valores: `member`, `moderator`, `owner`

### Enum public.community_membership_status

ID R1-196 — valores: `pending`, `approved`

### Funções que citam esta tabela

- R1-218 `private.can_read_listing`
- R1-219 `private.can_receive_invite_to_event`
- R1-220 `private.can_see_provider`
- R1-221 `private.can_user_read_listing`
- R1-230 `private.enforce_group_community_membership`
- R1-239 `private.is_community_member`
- R1-267 `public.accept_community_invitation`
- R1-268 `public.accept_provider_invitation`
- R1-269 `public.add_community_moderator`
- R1-273 `public.approve_community_member`
- R1-276 `public.cancel_community_request`
- R1-280 `public.create_community`
- R1-281 `public.create_community_invitation`
- R1-286 `public.create_provider_invitation`
- R1-289 `public.feed_community`
- R1-290 `public.feed_following`
- R1-293 `public.finalize_account_deletion`
- R1-294 `public.get_profile_neighborhood`
- R1-295 `public.is_community_member`
- R1-296 `public.is_current_user_community_moderator`
- R1-299 `public.leave_community`
- R1-301 `public.list_community_pending_arrivals`
- R1-325 `public.remove_community_member`
- R1-326 `public.remove_community_moderator`
- R1-331 `public.request_community_membership`
- R1-340 `public.settle_account_possessions`
- R1-342 `public.transfer_community_ownership`

## public.dm_conversations

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-047 | `context_id` | `"uuid"` | sim | — |
| R1-048 | `context_type` | `"public"."dm_context_type"` | sim | — |
| R1-049 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-050 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-051 | `participant_a` | `"uuid"` | sim | — |
| R1-052 | `participant_b` | `"uuid"` | sim | — |

### Constraints

- **R1-408 dm_conversations_ordered**

```sql
CONSTRAINT "dm_conversations_ordered" CHECK (("participant_a" < "participant_b"))
```
- **R1-409 dm_conversations_participant_a_fkey**

```sql
FOREIGN KEY ("participant_a") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```
- **R1-410 dm_conversations_participant_b_fkey**

```sql
FOREIGN KEY ("participant_b") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```
- **R1-411 dm_conversations_pkey**

```sql
PRIMARY KEY ("id")
```

### Índices únicos

- **R1-412 dm_conversations_unique_pair**

```sql
CREATE UNIQUE INDEX "dm_conversations_unique_pair" ON "public"."dm_conversations" USING "btree" ("participant_a", "participant_b") WHERE ("context_type" <> 'service_request'::"public"."dm_context_type");
```
- **R1-413 dm_conversations_unique_service_request**

```sql
CREATE UNIQUE INDEX "dm_conversations_unique_service_request" ON "public"."dm_conversations" USING "btree" ("context_id") WHERE ("context_type" = 'service_request'::"public"."dm_context_type");
```

### Row Level Security

- **R1-414** ALTER TABLE "public"."dm_conversations" ENABLE ROW LEVEL SECURITY
- **R1-415** ALTER TABLE ONLY "public"."dm_conversations" FORCE ROW LEVEL SECURITY

### Policies

- **R1-416 dm_conversations_select_participant** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "dm_conversations_select_participant" ON "public"."dm_conversations" FOR SELECT TO "authenticated" USING ((("participant_a" = ( SELECT "auth"."uid"() AS "uid")) OR ("participant_b" = ( SELECT "auth"."uid"() AS "uid"))));
```

### Grants e revogações

- **R1-417 GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."dm_conversations" TO "service_role"**

```sql
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."dm_conversations" TO "service_role";
```
- **R1-418 GRANT SELECT ON TABLE "public"."dm_conversations" TO "authenticated"**

```sql
GRANT SELECT ON TABLE "public"."dm_conversations" TO "authenticated";
```

### Enum public.dm_context_type

ID R1-197 — valores: `shared_group`, `shared_event`, `recommendation_thread`, `accepted_family`, `provider`, `listing`, `event_question`, `service_request`

### Funções que citam esta tabela

- R1-240 `private.is_dm_blocked_by_other`
- R1-241 `private.is_dm_blocked_either_way`
- R1-242 `private.is_dm_participant`
- R1-251 `private.notify_event_question_message`
- R1-279 `public.conversation_counterpart_name`
- R1-287 `public.create_service_request`
- R1-311 `public.mark_conversation_read`
- R1-316 `public.open_conversation`
- R1-317 `public.open_event_question`
- R1-336 `public.send_conversation_message`

## public.event_rsvps

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-053 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-054 | `event_id` | `"uuid"` | sim | — |
| R1-055 | `occurrence_date` | `"date"` | sim | — |
| R1-056 | `status` | `"public"."event_rsvp_status"` | sim | — |
| R1-057 | `updated_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-058 | `user_id` | `"uuid"` | sim | — |

### Constraints

- **R1-419 event_rsvps_event_id_fkey**

```sql
FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE
```
- **R1-420 event_rsvps_pkey**

```sql
PRIMARY KEY ("event_id", "user_id", "occurrence_date")
```
- **R1-421 event_rsvps_user_id_fkey**

```sql
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```

### Row Level Security

- **R1-422** ALTER TABLE "public"."event_rsvps" ENABLE ROW LEVEL SECURITY
- **R1-423** ALTER TABLE ONLY "public"."event_rsvps" FORCE ROW LEVEL SECURITY

### Policies

- **R1-424 event_rsvps_delete_self** — comando DELETE; papéis "authenticated"

```sql
CREATE POLICY "event_rsvps_delete_self" ON "public"."event_rsvps" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));
```
- **R1-425 event_rsvps_insert_self** — comando INSERT; papéis "authenticated"

```sql
CREATE POLICY "event_rsvps_insert_self" ON "public"."event_rsvps" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."can_access_event"("event_id")));
```
- **R1-426 event_rsvps_select_locality_member** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "event_rsvps_select_locality_member" ON "public"."event_rsvps" FOR SELECT TO "authenticated" USING ("private"."can_access_event"("event_id"));
```
- **R1-427 event_rsvps_update_self** — comando UPDATE; papéis "authenticated"

```sql
CREATE POLICY "event_rsvps_update_self" ON "public"."event_rsvps" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));
```

### Triggers

- **R1-428 event_rsvps_block_self_trigger** — BEFORE INSERT OR UPDATE; WHEN ausente; função "private"."event_rsvps_block_self"

```sql
CREATE OR REPLACE TRIGGER "event_rsvps_block_self_trigger" BEFORE INSERT OR UPDATE ON "public"."event_rsvps" FOR EACH ROW EXECUTE FUNCTION "private"."event_rsvps_block_self"();
```
- **R1-429 event_rsvps_default_occurrence_date** — BEFORE INSERT; WHEN ausente; função "private"."default_event_rsvp_occurrence"

```sql
CREATE OR REPLACE TRIGGER "event_rsvps_default_occurrence_date" BEFORE INSERT ON "public"."event_rsvps" FOR EACH ROW EXECUTE FUNCTION "private"."default_event_rsvp_occurrence"();
```
- **R1-430 notify_event_rsvp_trigger** — AFTER INSERT OR UPDATE OF "status"; WHEN ausente; função "private"."notify_event_rsvp"

```sql
CREATE OR REPLACE TRIGGER "notify_event_rsvp_trigger" AFTER INSERT OR UPDATE OF "status" ON "public"."event_rsvps" FOR EACH ROW EXECUTE FUNCTION "private"."notify_event_rsvp"();
```

### Grants e revogações

- **R1-431 GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."event_rsvps" TO "service_role"**

```sql
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."event_rsvps" TO "service_role";
```
- **R1-432 GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."event_rsvps" TO "authenticated"**

```sql
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."event_rsvps" TO "authenticated";
```

### Enum public.event_rsvp_status

ID R1-198 — valores: `interested`, `going`, `not_going`

### Funções que citam esta tabela

- R1-217 `private.can_dm_between`
- R1-229 `private.dm_context_valid`
- R1-250 `private.notify_event_change`
- R1-266 `private.send_recurring_event_reminders`
- R1-293 `public.finalize_account_deletion`

## public.events

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-059 | `community_id` | `"uuid"` | não | — |
| R1-060 | `cover_path` | `"text"` | não | — |
| R1-061 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-062 | `description` | `"text"` | não | — |
| R1-063 | `ends_at` | `timestamp with time zone` | não | — |
| R1-064 | `group_id` | `"uuid"` | não | — |
| R1-065 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-066 | `last_reminder_sent_for` | `"date"` | não | — |
| R1-067 | `locality_id` | `"uuid"` | sim | — |
| R1-068 | `organizer_id` | `"uuid"` | sim | — |
| R1-069 | `recurrence_day_of_month` | `smallint` | não | — |
| R1-070 | `recurrence_ordinal` | `smallint` | não | — |
| R1-071 | `recurrence_type` | `"text"` | não | — |
| R1-072 | `recurrence_weekday` | `smallint` | não | — |
| R1-073 | `starts_at` | `timestamp with time zone` | sim | — |
| R1-074 | `status` | `"public"."event_status"` | sim | `'upcoming'::"public"."event_status"` |
| R1-075 | `title` | `"text"` | sim | — |
| R1-076 | `updated_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-077 | `venue` | `"text"` | não | — |

### Constraints

- **R1-433 events_community_id_fkey**

```sql
FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE RESTRICT
```
- **R1-434 events_community_same_locality**

```sql
FOREIGN KEY ("community_id", "locality_id") REFERENCES "public"."communities"("id", "locality_id")
```
- **R1-435 events_cover_path_length**

```sql
CONSTRAINT "events_cover_path_length" CHECK ((("cover_path" IS NULL) OR (("char_length"("cover_path") >= 1) AND ("char_length"("cover_path") <= 300))))
```
- **R1-436 events_description_check**

```sql
CONSTRAINT "events_description_check" CHECK (("char_length"("description") <= 2000))
```
- **R1-437 events_locality_id_fkey**

```sql
FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE CASCADE
```
- **R1-438 events_organizer_id_fkey**

```sql
FOREIGN KEY ("organizer_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```
- **R1-439 events_pkey**

```sql
PRIMARY KEY ("id")
```
- **R1-440 events_recurrence_day_of_month_check**

```sql
CONSTRAINT "events_recurrence_day_of_month_check" CHECK ((("recurrence_day_of_month" IS NULL) OR (("recurrence_day_of_month" >= 1) AND ("recurrence_day_of_month" <= 31))))
```
- **R1-441 events_recurrence_ordinal_check**

```sql
CONSTRAINT "events_recurrence_ordinal_check" CHECK ((("recurrence_ordinal" IS NULL) OR (("recurrence_ordinal" >= 1) AND ("recurrence_ordinal" <= 4))))
```
- **R1-442 events_recurrence_shape_check**

```sql
CONSTRAINT "events_recurrence_shape_check" CHECK (((("recurrence_type" IS NULL) AND ("recurrence_weekday" IS NULL) AND ("recurrence_ordinal" IS NULL) AND ("recurrence_day_of_month" IS NULL)) OR (("recurrence_type" = 'monthly_weekday_ordinal'::"text") AND ("recurrence_weekday" IS NOT NULL) AND ("recurrence_ordinal" IS NOT NULL) AND ("recurrence_day_of_month" IS NULL)) OR (("recurrence_type" = 'monthly_day_of_month'::"text") AND ("recurrence_day_of_month" IS NOT NULL) AND ("recurrence_weekday" IS NULL) AND ("recurrence_ordinal" IS NULL))))
```
- **R1-443 events_recurrence_type_check**

```sql
CONSTRAINT "events_recurrence_type_check" CHECK ((("recurrence_type" IS NULL) OR ("recurrence_type" = ANY (ARRAY['monthly_weekday_ordinal'::"text", 'monthly_day_of_month'::"text"]))))
```
- **R1-444 events_recurrence_weekday_check**

```sql
CONSTRAINT "events_recurrence_weekday_check" CHECK ((("recurrence_weekday" IS NULL) OR (("recurrence_weekday" >= 0) AND ("recurrence_weekday" <= 6))))
```
- **R1-445 events_single_scope**

```sql
CONSTRAINT "events_single_scope" CHECK (("num_nonnulls"("group_id", "community_id") <= 1))
```
- **R1-446 events_title_check**

```sql
CONSTRAINT "events_title_check" CHECK ((("char_length"("title") >= 2) AND ("char_length"("title") <= 200)))
```
- **R1-447 events_venue_check**

```sql
CONSTRAINT "events_venue_check" CHECK ((("venue" IS NULL) OR ("char_length"("venue") <= 200)))
```

### Row Level Security

- **R1-448** ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY
- **R1-449** ALTER TABLE ONLY "public"."events" FORCE ROW LEVEL SECURITY

### Policies

- **R1-450 events_insert_verified_member** — comando INSERT; papéis "authenticated"

```sql
CREATE POLICY "events_insert_verified_member" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK ((("organizer_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."is_verified_locality_member"("locality_id") AND "private"."is_active_locality_member"("locality_id")));
```
- **R1-451 events_select_locality_member** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "events_select_locality_member" ON "public"."events" FOR SELECT TO "authenticated" USING (((("community_id" IS NOT NULL) AND "private"."is_community_member"("community_id")) OR (("community_id" IS NULL) AND ("group_id" IS NULL) AND ("private"."is_locality_member"("locality_id") OR "private"."has_current_locality"())) OR (("community_id" IS NULL) AND ("group_id" IS NOT NULL) AND ("private"."is_group_member"("group_id") OR (EXISTS ( SELECT 1
   FROM "public"."groups" "g"
  WHERE (("g"."id" = "events"."group_id") AND ("g"."visibility" = 'public'::"public"."group_visibility") AND (("g"."community_id" IS NULL) OR "private"."is_community_member"("g"."community_id")) AND "private"."is_locality_member"("g"."locality_id"))))))));
```
- **R1-452 events_update_organizer** — comando UPDATE; papéis "authenticated"

```sql
CREATE POLICY "events_update_organizer" ON "public"."events" FOR UPDATE TO "authenticated" USING (("organizer_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("organizer_id" = ( SELECT "auth"."uid"() AS "uid")));
```

### Triggers

- **R1-453 notify_event_change_trigger** — AFTER UPDATE; WHEN ausente; função "private"."notify_event_change"

```sql
CREATE OR REPLACE TRIGGER "notify_event_change_trigger" AFTER UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "private"."notify_event_change"();
```
- **R1-454 snap_recurring_event_start_trigger** — BEFORE INSERT; WHEN ausente; função "private"."snap_recurring_event_start"

```sql
CREATE OR REPLACE TRIGGER "snap_recurring_event_start_trigger" BEFORE INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "private"."snap_recurring_event_start"();
```
- **R1-455 validate_event_cover_path_trigger** — BEFORE INSERT OR UPDATE OF "cover_path"; WHEN ausente; função "private"."validate_event_cover_path"

```sql
CREATE OR REPLACE TRIGGER "validate_event_cover_path_trigger" BEFORE INSERT OR UPDATE OF "cover_path" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "private"."validate_event_cover_path"();
```

### Grants e revogações

- **R1-456 GRANT SELECT,INSERT,UPDATE ON TABLE "public"."events" TO "authenticated"**

```sql
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."events" TO "authenticated";
```
- **R1-457 GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."events" TO "service_role"**

```sql
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."events" TO "service_role";
```
- **R1-458 GRANT UPDATE("cover_path") ON TABLE "public"."events" TO "service_role"**

```sql
GRANT UPDATE("cover_path") ON TABLE "public"."events" TO "service_role";
```

### Enum public.event_status

ID R1-199 — valores: `upcoming`, `cancelled`, `completed`

### Funções que citam esta tabela

- R1-214 `private.can_access_event`
- R1-219 `private.can_receive_invite_to_event`
- R1-225 `private.default_event_rsvp_occurrence`
- R1-232 `private.event_rsvps_block_self`
- R1-243 `private.is_event_locality_member`
- R1-252 `private.notify_event_rsvp`
- R1-266 `private.send_recurring_event_reminders`
- R1-271 `public.advance_recurring_events`
- R1-278 `public.complete_event`
- R1-306 `public.list_invitable_members_for_event`
- R1-317 `public.open_event_question`
- R1-319 `public.profile_events_for`

## public.group_join_attempts

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-078 | `attempted_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-079 | `group_id` | `"uuid"` | sim | — |
| R1-080 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-081 | `user_id` | `"uuid"` | sim | — |

### Constraints

- **R1-459 group_join_attempts_group_id_fkey**

```sql
FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE
```
- **R1-460 group_join_attempts_pkey**

```sql
PRIMARY KEY ("id")
```
- **R1-461 group_join_attempts_user_id_fkey**

```sql
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```

### Row Level Security

- **R1-462** ALTER TABLE "public"."group_join_attempts" ENABLE ROW LEVEL SECURITY
- **R1-463** ALTER TABLE ONLY "public"."group_join_attempts" FORCE ROW LEVEL SECURITY

### Grants e revogações

- **R1-464 GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."group_join_attempts" TO "service_role"**

```sql
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."group_join_attempts" TO "service_role";
```

### Funções que citam esta tabela

- R1-224 `private.consume_group_join_attempt`

## public.group_join_reasons

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-082 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-083 | `group_id` | `"uuid"` | sim | — |
| R1-084 | `reason` | `"text"` | sim | — |
| R1-085 | `user_id` | `"uuid"` | sim | — |

### Constraints

- **R1-465 group_join_reasons_group_id_user_id_fkey**

```sql
FOREIGN KEY ("group_id", "user_id") REFERENCES "public"."group_memberships"("group_id", "user_id") ON DELETE CASCADE
```
- **R1-466 group_join_reasons_pkey**

```sql
PRIMARY KEY ("group_id", "user_id")
```
- **R1-467 group_join_reasons_reason_check**

```sql
CONSTRAINT "group_join_reasons_reason_check" CHECK ((("char_length"("reason") >= 1) AND ("char_length"("reason") <= 300)))
```

### Row Level Security

- **R1-468** ALTER TABLE "public"."group_join_reasons" ENABLE ROW LEVEL SECURITY
- **R1-469** ALTER TABLE ONLY "public"."group_join_reasons" FORCE ROW LEVEL SECURITY

### Policies

- **R1-470 group_join_reasons_select_author_or_moderator** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "group_join_reasons_select_author_or_moderator" ON "public"."group_join_reasons" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_group_moderator"("group_id")));
```

### Grants e revogações

- **R1-471 GRANT ALL ON TABLE "public"."group_join_reasons" TO "service_role"**

```sql
GRANT ALL ON TABLE "public"."group_join_reasons" TO "service_role";
```
- **R1-472 GRANT SELECT ON TABLE "public"."group_join_reasons" TO "authenticated"**

```sql
GRANT SELECT ON TABLE "public"."group_join_reasons" TO "authenticated";
```

### Funções que citam esta tabela

- R1-262 `private.purge_stale_group_join_reasons`
- R1-274 `public.approve_group_member`
- R1-298 `public.join_group`

## public.group_memberships

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-086 | `group_id` | `"uuid"` | sim | — |
| R1-087 | `joined_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-088 | `notify_level` | `"public"."group_notify_level"` | sim | `'highlights'::"public"."group_notify_level"` |
| R1-089 | `role` | `"public"."group_membership_role"` | sim | `'member'::"public"."group_membership_role"` |
| R1-090 | `status` | `"public"."group_membership_status"` | sim | `'approved'::"public"."group_membership_status"` |
| R1-091 | `user_id` | `"uuid"` | sim | — |

### Constraints

- **R1-473 group_memberships_group_id_fkey**

```sql
FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE
```
- **R1-474 group_memberships_pkey**

```sql
PRIMARY KEY ("group_id", "user_id")
```
- **R1-475 group_memberships_user_id_fkey**

```sql
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```

### Row Level Security

- **R1-476** ALTER TABLE "public"."group_memberships" ENABLE ROW LEVEL SECURITY
- **R1-477** ALTER TABLE ONLY "public"."group_memberships" FORCE ROW LEVEL SECURITY

### Policies

- **R1-478 group_memberships_delete_moderator** — comando DELETE; papéis "authenticated"

```sql
CREATE POLICY "group_memberships_delete_moderator" ON "public"."group_memberships" FOR DELETE TO "authenticated" USING ("private"."is_group_moderator"("group_id"));
```
- **R1-479 group_memberships_delete_self** — comando DELETE; papéis "authenticated"

```sql
CREATE POLICY "group_memberships_delete_self" ON "public"."group_memberships" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));
```
- **R1-480 group_memberships_select** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "group_memberships_select" ON "public"."group_memberships" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."groups" "g"
  WHERE (("g"."id" = "group_memberships"."group_id") AND (("g"."visibility" = 'public'::"public"."group_visibility") OR "private"."is_group_member"("g"."id")))))));
```

### Triggers

- **R1-481 enforce_group_community_membership_trigger** — BEFORE INSERT OR UPDATE; WHEN ausente; função "private"."enforce_group_community_membership"

```sql
CREATE OR REPLACE TRIGGER "enforce_group_community_membership_trigger" BEFORE INSERT OR UPDATE ON "public"."group_memberships" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_group_community_membership"();
```
- **R1-482 group_join_attempt_limit_before_insert** — BEFORE INSERT; WHEN ausente; função "private"."enforce_group_join_attempt_limit"

```sql
CREATE OR REPLACE TRIGGER "group_join_attempt_limit_before_insert" BEFORE INSERT ON "public"."group_memberships" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_group_join_attempt_limit"();
```
- **R1-483 notify_group_admission_trigger** — AFTER UPDATE; WHEN ausente; função "private"."notify_group_admission"

```sql
CREATE OR REPLACE TRIGGER "notify_group_admission_trigger" AFTER UPDATE ON "public"."group_memberships" FOR EACH ROW EXECUTE FUNCTION "private"."notify_group_admission"();
```

### Grants e revogações

- **R1-484 GRANT DELETE ON TABLE "public"."group_memberships" TO "authenticated"**

```sql
GRANT DELETE ON TABLE "public"."group_memberships" TO "authenticated";
```
- **R1-485 GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."group_memberships" TO "service_role"**

```sql
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."group_memberships" TO "service_role";
```
- **R1-486 GRANT SELECT("group_id") ON TABLE "public"."group_memberships" TO "authenticated"**

```sql
GRANT SELECT("group_id") ON TABLE "public"."group_memberships" TO "authenticated";
```
- **R1-487 GRANT SELECT("joined_at") ON TABLE "public"."group_memberships" TO "authenticated"**

```sql
GRANT SELECT("joined_at") ON TABLE "public"."group_memberships" TO "authenticated";
```
- **R1-488 GRANT SELECT("role") ON TABLE "public"."group_memberships" TO "authenticated"**

```sql
GRANT SELECT("role") ON TABLE "public"."group_memberships" TO "authenticated";
```
- **R1-489 GRANT SELECT("status") ON TABLE "public"."group_memberships" TO "authenticated"**

```sql
GRANT SELECT("status") ON TABLE "public"."group_memberships" TO "authenticated";
```
- **R1-490 GRANT SELECT("user_id") ON TABLE "public"."group_memberships" TO "authenticated"**

```sql
GRANT SELECT("user_id") ON TABLE "public"."group_memberships" TO "authenticated";
```

### Enum public.group_membership_role

ID R1-200 — valores: `member`, `moderator`, `owner`

### Enum public.group_membership_status

ID R1-201 — valores: `pending`, `approved`

### Enum public.group_notify_level

ID R1-202 — valores: `all`, `highlights`, `none`

### Funções que citam esta tabela

- R1-217 `private.can_dm_between`
- R1-219 `private.can_receive_invite_to_event`
- R1-222 `private.cascade_community_membership_downgrade`
- R1-223 `private.cascade_community_membership_loss`
- R1-229 `private.dm_context_valid`
- R1-233 `private.group_notify_allows`
- R1-237 `private.indication_recipients`
- R1-244 `private.is_group_member`
- R1-245 `private.is_group_moderator`
- R1-246 `private.is_group_owner`
- R1-254 `private.notify_group_pin`
- R1-255 `private.notify_group_post`
- R1-262 `private.purge_stale_group_join_reasons`
- R1-270 `public.add_group_moderator`
- R1-274 `public.approve_group_member`
- R1-282 `public.create_group`
- R1-283 `public.create_group_in_community`
- R1-289 `public.feed_community`
- R1-290 `public.feed_following`
- R1-291 `public.feed_group`
- R1-292 `public.feed_posts`
- R1-293 `public.finalize_account_deletion`
- R1-298 `public.join_group`
- R1-300 `public.list_available_groups_for_interests`
- R1-315 `public.my_group_notify_level`
- R1-320 `public.profile_posts_for`
- R1-327 `public.remove_group_moderator`
- R1-338 `public.set_group_notify_level`
- R1-340 `public.settle_account_possessions`
- R1-341 `public.suggest_groups_for_user`
- R1-343 `public.transfer_group_ownership`

## public.groups

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-092 | `community_id` | `"uuid"` | não | — |
| R1-093 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-094 | `created_by` | `"uuid"` | sim | — |
| R1-095 | `description` | `"text"` | não | — |
| R1-096 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-097 | `is_deleted` | `boolean` | sim | `false` |
| R1-098 | `locality_id` | `"uuid"` | sim | — |
| R1-099 | `name` | `"text"` | sim | — |
| R1-100 | `owner_user_id` | `"uuid"` | sim | — |
| R1-101 | `pinned_post_id` | `"uuid"` | não | — |
| R1-102 | `rules` | `"text"` | não | — |
| R1-103 | `visibility` | `"public"."group_visibility"` | sim | `'public'::"public"."group_visibility"` |

### Constraints

- **R1-491 groups_community_id_fkey**

```sql
FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE RESTRICT
```
- **R1-492 groups_community_same_locality**

```sql
FOREIGN KEY ("community_id", "locality_id") REFERENCES "public"."communities"("id", "locality_id")
```
- **R1-493 groups_created_by_fkey**

```sql
FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```
- **R1-494 groups_description_check**

```sql
CONSTRAINT "groups_description_check" CHECK ((("description" IS NULL) OR (("char_length"("description") >= 1) AND ("char_length"("description") <= 500))))
```
- **R1-495 groups_locality_id_fkey**

```sql
FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT
```
- **R1-496 groups_name_check**

```sql
CONSTRAINT "groups_name_check" CHECK ((("char_length"("name") >= 2) AND ("char_length"("name") <= 80)))
```
- **R1-497 groups_owner_user_id_fkey**

```sql
FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```
- **R1-498 groups_pinned_post_id_fkey**

```sql
FOREIGN KEY ("pinned_post_id") REFERENCES "public"."posts"("id") ON DELETE SET NULL
```
- **R1-499 groups_pkey**

```sql
PRIMARY KEY ("id")
```
- **R1-500 groups_rules_check**

```sql
CONSTRAINT "groups_rules_check" CHECK ((("rules" IS NULL) OR (("char_length"("rules") >= 1) AND ("char_length"("rules") <= 600))))
```

### Row Level Security

- **R1-501** ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY
- **R1-502** ALTER TABLE ONLY "public"."groups" FORCE ROW LEVEL SECURITY

### Policies

- **R1-503 groups_delete_owner** — comando DELETE; papéis "authenticated"

```sql
CREATE POLICY "groups_delete_owner" ON "public"."groups" FOR DELETE TO "authenticated" USING (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")));
```
- **R1-504 groups_insert_verified_member** — comando INSERT; papéis "authenticated"

```sql
CREATE POLICY "groups_insert_verified_member" ON "public"."groups" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_verified_locality_member"("locality_id") AND ("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))));
```
- **R1-505 groups_select_locality_member** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "groups_select_locality_member" ON "public"."groups" FOR SELECT TO "authenticated" USING (("private"."is_locality_member"("locality_id") AND (("community_id" IS NULL) OR "private"."is_community_member"("community_id")) AND ("is_deleted" = false)));
```
- **R1-506 groups_update_owner** — comando UPDATE; papéis "authenticated"

```sql
CREATE POLICY "groups_update_owner" ON "public"."groups" FOR UPDATE TO "authenticated" USING ("private"."is_group_owner"("id"));
```

### Triggers

- **R1-507 block_group_community_change_trigger** — BEFORE UPDATE OF "community_id"; WHEN (("new"."community_id" IS DISTINCT FROM "old"."community_id")); função "private"."block_group_community_change"

```sql
CREATE OR REPLACE TRIGGER "block_group_community_change_trigger" BEFORE UPDATE OF "community_id" ON "public"."groups" FOR EACH ROW WHEN (("new"."community_id" IS DISTINCT FROM "old"."community_id")) EXECUTE FUNCTION "private"."block_group_community_change"();
```
- **R1-508 block_soft_delete_groups** — BEFORE UPDATE OF "is_deleted"; WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")); função "private"."block_authenticated_soft_delete"

```sql
CREATE OR REPLACE TRIGGER "block_soft_delete_groups" BEFORE UPDATE OF "is_deleted" ON "public"."groups" FOR EACH ROW WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")) EXECUTE FUNCTION "private"."block_authenticated_soft_delete"();
```
- **R1-509 guard_group_pinned_post** — BEFORE INSERT OR UPDATE OF "pinned_post_id"; WHEN ausente; função "private"."guard_group_pinned_post"

```sql
CREATE OR REPLACE TRIGGER "guard_group_pinned_post" BEFORE INSERT OR UPDATE OF "pinned_post_id" ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "private"."guard_group_pinned_post"();
```
- **R1-510 notify_group_pin_trigger** — AFTER UPDATE OF "pinned_post_id"; WHEN ausente; função "private"."notify_group_pin"

```sql
CREATE OR REPLACE TRIGGER "notify_group_pin_trigger" AFTER UPDATE OF "pinned_post_id" ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "private"."notify_group_pin"();
```

### Grants e revogações

- **R1-511 GRANT SELECT,INSERT,UPDATE ON TABLE "public"."groups" TO "authenticated"**

```sql
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."groups" TO "authenticated";
```
- **R1-512 GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."groups" TO "service_role"**

```sql
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."groups" TO "service_role";
```
- **R1-513 GRANT UPDATE("is_deleted") ON TABLE "public"."groups" TO "service_role"**

```sql
GRANT UPDATE("is_deleted") ON TABLE "public"."groups" TO "service_role";
```

### Enum public.group_visibility

ID R1-203 — valores: `public`, `private`

### Funções que citam esta tabela

- R1-214 `private.can_access_event`
- R1-216 `private.can_access_post_scope`
- R1-219 `private.can_receive_invite_to_event`
- R1-222 `private.cascade_community_membership_downgrade`
- R1-223 `private.cascade_community_membership_loss`
- R1-226 `private.dispatch_indication_alerts`
- R1-230 `private.enforce_group_community_membership`
- R1-231 `private.enforce_group_join_attempt_limit`
- R1-264 `private.reports_block_self`
- R1-282 `public.create_group`
- R1-283 `public.create_group_in_community`
- R1-288 `public.delete_group`
- R1-289 `public.feed_community`
- R1-290 `public.feed_following`
- R1-291 `public.feed_group`
- R1-292 `public.feed_posts`
- R1-293 `public.finalize_account_deletion`
- R1-298 `public.join_group`
- R1-300 `public.list_available_groups_for_interests`
- R1-303 `public.list_group_activity`
- R1-305 `public.list_indications`
- R1-307 `public.list_open_reports`
- R1-318 `public.pin_group_post`
- R1-323 `public.record_user_group_interests`
- R1-332 `public.resolve_report`
- R1-339 `public.set_group_rules`
- R1-340 `public.settle_account_possessions`
- R1-341 `public.suggest_groups_for_user`
- R1-343 `public.transfer_group_ownership`
- R1-345 `public.unpin_group_post`

## public.listings

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-104 | `address` | `"text"` | não | — |
| R1-105 | `available_until` | `"date"` | não | — |
| R1-106 | `category` | `"text"` | não | — |
| R1-107 | `closed_at` | `timestamp with time zone` | não | — |
| R1-108 | `community_id` | `"uuid"` | não | — |
| R1-109 | `condition` | `"public"."listing_condition"` | não | — |
| R1-110 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-111 | `description` | `"text"` | não | — |
| R1-112 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-113 | `kind` | `"public"."listing_kind"` | sim | — |
| R1-114 | `locality_id` | `"uuid"` | não | — |
| R1-115 | `neighborhood` | `"text"` | não | — |
| R1-116 | `owner_user_id` | `"uuid"` | sim | — |
| R1-117 | `pickup_note` | `"text"` | não | — |
| R1-118 | `price_cents` | `integer` | não | — |
| R1-119 | `published_at` | `timestamp with time zone` | não | — |
| R1-120 | `status` | `"public"."listing_status"` | sim | `'draft'::"public"."listing_status"` |
| R1-121 | `title` | `"text"` | sim | — |
| R1-122 | `updated_at` | `timestamp with time zone` | sim | `"now"()` |

### Constraints

- **R1-514 listings_address_check**

```sql
CONSTRAINT "listings_address_check" CHECK ((("address" IS NULL) OR (("char_length"("address") >= 3) AND ("char_length"("address") <= 200))))
```
- **R1-515 listings_audience_exclusive**

```sql
CONSTRAINT "listings_audience_exclusive" CHECK ((("locality_id" IS NULL) <> ("community_id" IS NULL)))
```
- **R1-516 listings_category_check**

```sql
CONSTRAINT "listings_category_check" CHECK ((("category" IS NULL) OR (("char_length"("category") >= 1) AND ("char_length"("category") <= 60))))
```
- **R1-517 listings_community_id_fkey**

```sql
FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE RESTRICT
```
- **R1-518 listings_condition_item_only**

```sql
CONSTRAINT "listings_condition_item_only" CHECK ((("kind" = 'item'::"public"."listing_kind") OR ("condition" IS NULL)))
```
- **R1-519 listings_description_check**

```sql
CONSTRAINT "listings_description_check" CHECK ((("description" IS NULL) OR (("char_length"("description") >= 1) AND ("char_length"("description") <= 2000))))
```
- **R1-520 listings_item_required_fields**

```sql
CONSTRAINT "listings_item_required_fields" CHECK ((("kind" <> 'item'::"public"."listing_kind") OR (("category" IS NOT NULL) AND ("description" IS NOT NULL) AND ("price_cents" IS NOT NULL) AND ("neighborhood" IS NOT NULL) AND ("condition" IS NOT NULL))))
```
- **R1-521 listings_locality_id_fkey**

```sql
FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT
```
- **R1-522 listings_neighborhood_check**

```sql
CONSTRAINT "listings_neighborhood_check" CHECK ((("neighborhood" IS NULL) OR (("char_length"("neighborhood") >= 1) AND ("char_length"("neighborhood") <= 80))))
```
- **R1-523 listings_neighborhood_no_cep**

```sql
CONSTRAINT "listings_neighborhood_no_cep" CHECK ((("neighborhood" IS NULL) OR (NOT "private"."is_cep_like"("neighborhood"))))
```
- **R1-524 listings_owner_user_id_fkey**

```sql
FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```
- **R1-525 listings_pickup_note_check**

```sql
CONSTRAINT "listings_pickup_note_check" CHECK ((("pickup_note" IS NULL) OR (("char_length"("pickup_note") >= 1) AND ("char_length"("pickup_note") <= 120))))
```
- **R1-526 listings_pkey**

```sql
PRIMARY KEY ("id")
```
- **R1-527 listings_price_cents_check**

```sql
CONSTRAINT "listings_price_cents_check" CHECK ((("price_cents" IS NULL) OR (("price_cents" >= 0) AND ("price_cents" <= 100000000))))
```
- **R1-528 listings_title_check**

```sql
CONSTRAINT "listings_title_check" CHECK ((("char_length"("title") >= 2) AND ("char_length"("title") <= 120)))
```

### Row Level Security

- **R1-529** ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY
- **R1-530** ALTER TABLE ONLY "public"."listings" FORCE ROW LEVEL SECURITY

### Policies

- **R1-531 listings_delete_owner** — comando DELETE; papéis "authenticated"

```sql
CREATE POLICY "listings_delete_owner" ON "public"."listings" FOR DELETE TO "authenticated" USING (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")));
```
- **R1-532 listings_insert_owner** — comando INSERT; papéis "authenticated"

```sql
CREATE POLICY "listings_insert_owner" ON "public"."listings" FOR INSERT TO "authenticated" WITH CHECK ((("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT "public"."is_account_suspended"(( SELECT "auth"."uid"() AS "uid"))) AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid"))) AND (("community_id" IS NULL) OR "private"."is_community_member"("community_id")) AND (("locality_id" IS NULL) OR "private"."is_locality_member"("locality_id"))));
```
- **R1-533 listings_select_scoped** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "listings_select_scoped" ON "public"."listings" FOR SELECT TO "authenticated" USING ((("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."can_read_listing"("id")));
```
- **R1-534 listings_update_owner** — comando UPDATE; papéis "authenticated"

```sql
CREATE POLICY "listings_update_owner" ON "public"."listings" FOR UPDATE TO "authenticated" USING (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ((("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("community_id" IS NULL) OR "private"."is_community_member"("community_id")) AND (("locality_id" IS NULL) OR "private"."is_locality_member"("locality_id"))));
```

### Triggers

- **R1-535 listings_audience_immutable** — BEFORE UPDATE; WHEN ausente; função "private"."listing_audience_immutable"

```sql
CREATE OR REPLACE TRIGGER "listings_audience_immutable" BEFORE UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "private"."listing_audience_immutable"();
```
- **R1-536 listings_guard_status_transition** — BEFORE UPDATE; WHEN ausente; função "private"."listings_guard_status_transition"

```sql
CREATE OR REPLACE TRIGGER "listings_guard_status_transition" BEFORE UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "private"."listings_guard_status_transition"();
```
- **R1-537 listings_set_updated_at** — BEFORE UPDATE; WHEN ausente; função "private"."set_updated_at"

```sql
CREATE OR REPLACE TRIGGER "listings_set_updated_at" BEFORE UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();
```

### Grants e revogações

- **R1-538 GRANT ALL ON TABLE "public"."listings" TO "service_role"**

```sql
GRANT ALL ON TABLE "public"."listings" TO "service_role";
```
- **R1-539 GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."listings" TO "authenticated"**

```sql
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."listings" TO "authenticated";
```

### Enum public.listing_kind

ID R1-205 — valores: `item`, `property`

### Enum public.listing_status

ID R1-206 — valores: `draft`, `active`, `paused`, `reserved`, `sold`, `closed`

### Enum public.listing_condition

ID R1-204 — valores: `new`, `used`

### Funções que citam esta tabela

- R1-218 `private.can_read_listing`
- R1-221 `private.can_user_read_listing`
- R1-228 `private.dispatch_listing_alerts`
- R1-229 `private.dm_context_valid`
- R1-261 `private.property_details_require_property`
- R1-285 `public.create_property_listing`
- R1-329 `public.replace_listing_photo`
- R1-340 `public.settle_account_possessions`
- R1-344 `public.transition_listing`

## public.notifications

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-123 | `action` | `"text"` | sim | — |
| R1-124 | `actor_user_id` | `"uuid"` | não | — |
| R1-125 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-126 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-127 | `read_at` | `timestamp with time zone` | não | — |
| R1-128 | `recipient_user_id` | `"uuid"` | sim | — |
| R1-129 | `target_id` | `"uuid"` | sim | — |
| R1-130 | `target_type` | `"text"` | sim | — |
| R1-131 | `type` | `"public"."notification_type"` | sim | — |

### Constraints

- **R1-540 notifications_action_check**

```sql
CONSTRAINT "notifications_action_check" CHECK ((("char_length"("action") >= 1) AND ("char_length"("action") <= 50)))
```
- **R1-541 notifications_actor_user_id_fkey**

```sql
FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
```
- **R1-542 notifications_pkey**

```sql
PRIMARY KEY ("id")
```
- **R1-543 notifications_recipient_user_id_fkey**

```sql
FOREIGN KEY ("recipient_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```
- **R1-544 notifications_target_type_check**

```sql
CONSTRAINT "notifications_target_type_check" CHECK ((("char_length"("target_type") >= 1) AND ("char_length"("target_type") <= 50)))
```

### Row Level Security

- **R1-545** ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY
- **R1-546** ALTER TABLE ONLY "public"."notifications" FORCE ROW LEVEL SECURITY

### Policies

- **R1-547 notifications_select_recipient** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "notifications_select_recipient" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("recipient_user_id" = ( SELECT "auth"."uid"() AS "uid")));
```
- **R1-548 notifications_update_recipient** — comando UPDATE; papéis "authenticated"

```sql
CREATE POLICY "notifications_update_recipient" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("recipient_user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("recipient_user_id" = ( SELECT "auth"."uid"() AS "uid")));
```

### Grants e revogações

- **R1-549 GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notifications" TO "service_role"**

```sql
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notifications" TO "service_role";
```
- **R1-550 GRANT SELECT,UPDATE ON TABLE "public"."notifications" TO "authenticated"**

```sql
GRANT SELECT,UPDATE ON TABLE "public"."notifications" TO "authenticated";
```

### Enum public.notification_type

ID R1-207 — valores: `comment`, `group_admission`, `invitation_accepted`, `event_rsvp`, `event_change`, `direct_message`, `report_resolved`, `event_reminder`, `recommendation_reply`, `admission_rejected`, `listing_alert`, `service_request`, `recommendation_request`, `support_answered`, `group_post`

### Funções que citam esta tabela

- R1-228 `private.dispatch_listing_alerts`
- R1-249 `private.notify_comment`
- R1-250 `private.notify_event_change`
- R1-251 `private.notify_event_question_message`
- R1-252 `private.notify_event_rsvp`
- R1-253 `private.notify_group_admission`
- R1-254 `private.notify_group_pin`
- R1-255 `private.notify_group_post`
- R1-256 `private.notify_indication`
- R1-257 `private.notify_invitation_accepted`
- R1-258 `private.notify_recommendation_reply`
- R1-259 `private.notify_recommendation_reply_followers`
- R1-266 `private.send_recurring_event_reminders`
- R1-272 `public.answer_support_ticket`
- R1-293 `public.finalize_account_deletion`
- R1-324 `public.reject_pending_user`
- R1-332 `public.resolve_report`
- R1-336 `public.send_conversation_message`
- R1-340 `public.settle_account_possessions`

## public.post_follows

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-132 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-133 | `post_id` | `"uuid"` | sim | — |
| R1-134 | `user_id` | `"uuid"` | sim | `"auth"."uid"()` |

### Constraints

- **R1-551 post_follows_pkey**

```sql
PRIMARY KEY ("post_id", "user_id")
```
- **R1-552 post_follows_post_id_fkey**

```sql
FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE
```
- **R1-553 post_follows_user_id_fkey**

```sql
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```

### Row Level Security

- **R1-554** ALTER TABLE "public"."post_follows" ENABLE ROW LEVEL SECURITY
- **R1-555** ALTER TABLE ONLY "public"."post_follows" FORCE ROW LEVEL SECURITY

### Policies

- **R1-556 post_follows_delete_own** — comando DELETE; papéis "authenticated"

```sql
CREATE POLICY "post_follows_delete_own" ON "public"."post_follows" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));
```
- **R1-557 post_follows_insert_own** — comando INSERT; papéis "authenticated"

```sql
CREATE POLICY "post_follows_insert_own" ON "public"."post_follows" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."post_accepts_interaction"("post_id") AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));
```
- **R1-558 post_follows_select_own** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "post_follows_select_own" ON "public"."post_follows" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_follows"."post_id") AND (NOT "p"."is_deleted"))))));
```

### Grants e revogações

- **R1-559 GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_follows" TO "service_role"**

```sql
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_follows" TO "service_role";
```
- **R1-560 GRANT SELECT,INSERT,DELETE ON TABLE "public"."post_follows" TO "authenticated"**

```sql
GRANT SELECT,INSERT,DELETE ON TABLE "public"."post_follows" TO "authenticated";
```

### Funções que citam esta tabela

- R1-289 `public.feed_community`
- R1-290 `public.feed_following`
- R1-291 `public.feed_group`
- R1-292 `public.feed_posts`
- R1-293 `public.finalize_account_deletion`

## public.post_reactions

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-135 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-136 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-137 | `post_id` | `"uuid"` | sim | — |
| R1-138 | `user_id` | `"uuid"` | sim | `"auth"."uid"()` |

### Constraints

- **R1-561 post_reactions_pkey**

```sql
PRIMARY KEY ("id")
```
- **R1-562 post_reactions_post_id_fkey**

```sql
FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE
```
- **R1-563 post_reactions_post_id_user_id_key**

```sql
UNIQUE ("post_id", "user_id")
```
- **R1-564 post_reactions_user_id_fkey**

```sql
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```

### Row Level Security

- **R1-565** ALTER TABLE "public"."post_reactions" ENABLE ROW LEVEL SECURITY
- **R1-566** ALTER TABLE ONLY "public"."post_reactions" FORCE ROW LEVEL SECURITY

### Policies

- **R1-567 post_reactions_delete_own** — comando DELETE; papéis "authenticated"

```sql
CREATE POLICY "post_reactions_delete_own" ON "public"."post_reactions" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));
```
- **R1-568 post_reactions_insert_locality_member** — comando INSERT; papéis "authenticated"

```sql
CREATE POLICY "post_reactions_insert_locality_member" ON "public"."post_reactions" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_reactions"."post_id") AND "private"."can_write_post_to"("p"."locality_id", "p"."community_id", "p"."group_id")))) AND (NOT "public"."is_account_suspended"(( SELECT "auth"."uid"() AS "uid"))) AND "private"."post_accepts_interaction"("post_id") AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));
```
- **R1-569 post_reactions_insert_self** — comando INSERT; papéis "authenticated"

```sql
CREATE POLICY "post_reactions_insert_self" ON "public"."post_reactions" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_reactions"."post_id") AND "private"."can_write_post_to"("p"."locality_id", "p"."community_id", "p"."group_id")))) AND (NOT "public"."is_account_suspended"(( SELECT "auth"."uid"() AS "uid"))) AND "private"."post_accepts_interaction"("post_id") AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));
```
- **R1-570 post_reactions_select_locality_member** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "post_reactions_select_locality_member" ON "public"."post_reactions" FOR SELECT TO "authenticated" USING (("private"."can_access_post"("post_id") AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_reactions"."post_id") AND (NOT "p"."is_deleted"))))));
```

### Grants e revogações

- **R1-571 GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_reactions" TO "service_role"**

```sql
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_reactions" TO "service_role";
```
- **R1-572 GRANT SELECT,INSERT,DELETE ON TABLE "public"."post_reactions" TO "authenticated"**

```sql
GRANT SELECT,INSERT,DELETE ON TABLE "public"."post_reactions" TO "authenticated";
```

### Funções que citam esta tabela

- R1-289 `public.feed_community`
- R1-290 `public.feed_following`
- R1-291 `public.feed_group`
- R1-292 `public.feed_posts`
- R1-293 `public.finalize_account_deletion`

## public.post_saves

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-139 | `post_id` | `"uuid"` | sim | — |
| R1-140 | `saved_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-141 | `user_id` | `"uuid"` | sim | — |

### Constraints

- **R1-573 post_saves_pkey**

```sql
PRIMARY KEY ("user_id", "post_id")
```
- **R1-574 post_saves_post_id_fkey**

```sql
FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE
```
- **R1-575 post_saves_user_id_fkey**

```sql
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```

### Row Level Security

- **R1-576** ALTER TABLE "public"."post_saves" ENABLE ROW LEVEL SECURITY
- **R1-577** ALTER TABLE ONLY "public"."post_saves" FORCE ROW LEVEL SECURITY

### Policies

- **R1-578 post_saves_delete_own** — comando DELETE; papéis "authenticated"

```sql
CREATE POLICY "post_saves_delete_own" ON "public"."post_saves" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));
```
- **R1-579 post_saves_insert_own** — comando INSERT; papéis "authenticated"

```sql
CREATE POLICY "post_saves_insert_own" ON "public"."post_saves" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."can_access_post"("post_id") AND "private"."post_accepts_interaction"("post_id") AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));
```
- **R1-580 post_saves_select_own** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "post_saves_select_own" ON "public"."post_saves" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_saves"."post_id") AND (NOT "p"."is_deleted"))))));
```

### Grants e revogações

- **R1-581 GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_saves" TO "service_role"**

```sql
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_saves" TO "service_role";
```
- **R1-582 GRANT SELECT,INSERT,DELETE ON TABLE "public"."post_saves" TO "authenticated"**

```sql
GRANT SELECT,INSERT,DELETE ON TABLE "public"."post_saves" TO "authenticated";
```

### Funções que citam esta tabela

- R1-293 `public.finalize_account_deletion`

## public.posts

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-142 | `community_id` | `"uuid"` | não | — |
| R1-143 | `content` | `"text"` | sim | — |
| R1-144 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-145 | `group_id` | `"uuid"` | não | — |
| R1-146 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-147 | `is_deleted` | `boolean` | sim | `false` |
| R1-148 | `link_url` | `"text"` | não | — |
| R1-149 | `locality_id` | `"uuid"` | sim | — |
| R1-150 | `photo_path` | `"text"` | não | — |
| R1-151 | `poll_options` | `"jsonb"` | não | — |
| R1-152 | `post_type` | `"public"."post_type"` | sim | — |
| R1-153 | `user_id` | `"uuid"` | sim | `"auth"."uid"()` |

### Constraints

- **R1-583 post_link_requires_link_type**

```sql
CONSTRAINT "post_link_requires_link_type" CHECK ((("link_url" IS NULL) OR ("post_type" = 'link'::"public"."post_type")))
```
- **R1-584 post_link_type_requires_url**

```sql
CONSTRAINT "post_link_type_requires_url" CHECK ((("post_type" <> 'link'::"public"."post_type") OR ("link_url" IS NOT NULL)))
```
- **R1-585 post_photo_requires_photo_type**

```sql
CONSTRAINT "post_photo_requires_photo_type" CHECK ((("photo_path" IS NULL) OR ("post_type" = 'photo'::"public"."post_type")))
```
- **R1-586 post_poll_requires_poll_type**

```sql
CONSTRAINT "post_poll_requires_poll_type" CHECK ((("poll_options" IS NULL) OR ("post_type" = 'poll'::"public"."post_type")))
```
- **R1-587 posts_community_id_fkey**

```sql
FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE RESTRICT
```
- **R1-588 posts_community_same_locality**

```sql
FOREIGN KEY ("community_id", "locality_id") REFERENCES "public"."communities"("id", "locality_id")
```
- **R1-589 posts_content_check**

```sql
CONSTRAINT "posts_content_check" CHECK ((("char_length"("content") >= 1) AND ("char_length"("content") <= 2000)))
```
- **R1-590 posts_link_url_check**

```sql
CONSTRAINT "posts_link_url_check" CHECK ((("link_url" IS NULL) OR ("link_url" ~ '^https?://[^\s/$.?#].[^\s]*$'::"text")))
```
- **R1-591 posts_locality_id_fkey**

```sql
FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT
```
- **R1-592 posts_pkey**

```sql
PRIMARY KEY ("id")
```
- **R1-593 posts_single_scope**

```sql
CONSTRAINT "posts_single_scope" CHECK (("num_nonnulls"("group_id", "community_id") <= 1))
```
- **R1-594 posts_user_id_fkey**

```sql
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```

### Row Level Security

- **R1-595** ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY
- **R1-596** ALTER TABLE ONLY "public"."posts" FORCE ROW LEVEL SECURITY

### Policies

- **R1-597 posts_delete_own** — comando DELETE; papéis "authenticated"

```sql
CREATE POLICY "posts_delete_own" ON "public"."posts" FOR DELETE TO "authenticated" USING (((NOT "is_deleted") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));
```
- **R1-598 posts_insert_locality_member** — comando INSERT; papéis "authenticated"

```sql
CREATE POLICY "posts_insert_locality_member" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("group_id" IS NOT NULL) AND "private"."can_write_post_to"("locality_id", "community_id", "group_id") AND (NOT "public"."is_account_suspended"("auth"."uid"())) AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));
```
- **R1-599 posts_select_locality_member** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "posts_select_locality_member" ON "public"."posts" FOR SELECT TO "authenticated" USING (((NOT "is_deleted") AND "private"."can_access_post_scope"("locality_id", "community_id", "group_id")));
```
- **R1-600 posts_update_own** — comando UPDATE; papéis "authenticated"

```sql
CREATE POLICY "posts_update_own" ON "public"."posts" FOR UPDATE TO "authenticated" USING (((NOT "is_deleted") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (((NOT "is_deleted") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."can_write_post_to"("locality_id", "community_id", "group_id")));
```

### Triggers

- **R1-601 block_soft_delete_posts** — BEFORE UPDATE OF "is_deleted"; WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")); função "private"."block_authenticated_soft_delete"

```sql
CREATE OR REPLACE TRIGGER "block_soft_delete_posts" BEFORE UPDATE OF "is_deleted" ON "public"."posts" FOR EACH ROW WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")) EXECUTE FUNCTION "private"."block_authenticated_soft_delete"();
```
- **R1-602 notify_group_post_trigger** — AFTER INSERT; WHEN ausente; função "private"."notify_group_post"

```sql
CREATE OR REPLACE TRIGGER "notify_group_post_trigger" AFTER INSERT ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "private"."notify_group_post"();
```
- **R1-603 posts_group_immutable** — BEFORE UPDATE; WHEN ausente; função "private"."prevent_post_group_change"

```sql
CREATE OR REPLACE TRIGGER "posts_group_immutable" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "private"."prevent_post_group_change"();
```

### Grants e revogações

- **R1-604 GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."posts" TO "authenticated"**

```sql
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."posts" TO "authenticated";
```
- **R1-605 GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."posts" TO "service_role"**

```sql
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."posts" TO "service_role";
```
- **R1-606 GRANT UPDATE("is_deleted") ON TABLE "public"."posts" TO "service_role"**

```sql
GRANT UPDATE("is_deleted") ON TABLE "public"."posts" TO "service_role";
```

### Enum public.post_type

ID R1-208 — valores: `text`, `photo`, `link`, `poll`

### Funções que citam esta tabela

- R1-215 `private.can_access_post`
- R1-234 `private.guard_group_pinned_post`
- R1-249 `private.notify_comment`
- R1-260 `private.post_accepts_interaction`
- R1-264 `private.reports_block_self`
- R1-289 `public.feed_community`
- R1-290 `public.feed_following`
- R1-291 `public.feed_group`
- R1-292 `public.feed_posts`
- R1-303 `public.list_group_activity`
- R1-307 `public.list_open_reports`
- R1-318 `public.pin_group_post`
- R1-320 `public.profile_posts_for`
- R1-332 `public.resolve_report`

## public.provider_accounts

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-154 | `auth_user_id` | `"uuid"` | sim | — |
| R1-155 | `community_id` | `"uuid"` | sim | — |
| R1-156 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-157 | `invited_by` | `"uuid"` | sim | — |
| R1-158 | `locality_id` | `"uuid"` | sim | — |
| R1-159 | `revoked_at` | `timestamp with time zone` | não | — |
| R1-160 | `revoked_by` | `"uuid"` | não | — |

### Constraints

- **R1-607 provider_accounts_auth_user_id_fkey**

```sql
FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```
- **R1-608 provider_accounts_community_id_fkey**

```sql
FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE
```
- **R1-609 provider_accounts_invited_by_fkey**

```sql
FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT
```
- **R1-610 provider_accounts_locality_id_fkey**

```sql
FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT
```
- **R1-611 provider_accounts_pkey**

```sql
PRIMARY KEY ("auth_user_id")
```
- **R1-612 provider_accounts_revoked_by_fkey**

```sql
FOREIGN KEY ("revoked_by") REFERENCES "auth"."users"("id")
```

### Row Level Security

- **R1-613** ALTER TABLE "public"."provider_accounts" ENABLE ROW LEVEL SECURITY
- **R1-614** ALTER TABLE ONLY "public"."provider_accounts" FORCE ROW LEVEL SECURITY

### Policies

- **R1-615 provider_accounts_select_self** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "provider_accounts_select_self" ON "public"."provider_accounts" FOR SELECT TO "authenticated" USING (("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")));
```

### Grants e revogações

- **R1-616 GRANT SELECT ON TABLE "public"."provider_accounts" TO "authenticated"**

```sql
GRANT SELECT ON TABLE "public"."provider_accounts" TO "authenticated";
```
- **R1-617 GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."provider_accounts" TO "service_role"**

```sql
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."provider_accounts" TO "service_role";
```

### Funções que citam esta tabela

- R1-220 `private.can_see_provider`
- R1-247 `private.is_provider_account`
- R1-248 `private.move_member_business_reach`
- R1-268 `public.accept_provider_invitation`
- R1-275 `public.can_manage_provider_profile`
- R1-284 `public.create_member_business_page`
- R1-297 `public.is_provider_account`
- R1-302 `public.list_community_providers`
- R1-314 `public.my_account_kind`
- R1-334 `public.revoke_provider_account`
- R1-340 `public.settle_account_possessions`
- R1-346 `public.update_member_business_page`

## private.provider_invitations

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-001 | `accepted_at` | `timestamp with time zone` | não | — |
| R1-002 | `accepted_by_user_id` | `"uuid"` | não | — |
| R1-003 | `community_id` | `"uuid"` | sim | — |
| R1-004 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-005 | `display_name` | `"text"` | sim | — |
| R1-006 | `expires_at` | `timestamp with time zone` | sim | — |
| R1-007 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-008 | `invitee_email_digest` | `"bytea"` | sim | — |
| R1-009 | `inviter_user_id` | `"uuid"` | sim | — |
| R1-010 | `locality_id` | `"uuid"` | sim | — |
| R1-011 | `status` | `"private"."provider_invitation_status"` | sim | `'pending'::"private"."provider_invitation_status"` |
| R1-012 | `token_digest` | `"bytea"` | sim | — |

### Constraints

- **R1-618 provider_invitations_accepted_by_user_id_fkey**

```sql
FOREIGN KEY ("accepted_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
```
- **R1-619 provider_invitations_check**

```sql
CONSTRAINT "provider_invitations_check" CHECK (((("status" = 'accepted'::"private"."provider_invitation_status") AND ("accepted_by_user_id" IS NOT NULL) AND ("accepted_at" IS NOT NULL)) OR (("status" <> 'accepted'::"private"."provider_invitation_status") AND ("accepted_by_user_id" IS NULL) AND ("accepted_at" IS NULL))))
```
- **R1-620 provider_invitations_check1**

```sql
CONSTRAINT "provider_invitations_check1" CHECK ((("accepted_by_user_id" IS NULL) OR ("accepted_by_user_id" <> "inviter_user_id")))
```
- **R1-621 provider_invitations_community_id_fkey**

```sql
FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE
```
- **R1-622 provider_invitations_display_name_check**

```sql
CONSTRAINT "provider_invitations_display_name_check" CHECK ((("char_length"("display_name") >= 2) AND ("char_length"("display_name") <= 80)))
```
- **R1-623 provider_invitations_invitee_email_digest_check**

```sql
CONSTRAINT "provider_invitations_invitee_email_digest_check" CHECK (("octet_length"("invitee_email_digest") = 32))
```
- **R1-624 provider_invitations_inviter_user_id_fkey**

```sql
FOREIGN KEY ("inviter_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT
```
- **R1-625 provider_invitations_locality_id_fkey**

```sql
FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT
```
- **R1-626 provider_invitations_pkey**

```sql
PRIMARY KEY ("id")
```
- **R1-627 provider_invitations_token_digest_check**

```sql
CONSTRAINT "provider_invitations_token_digest_check" CHECK (("octet_length"("token_digest") = 32))
```
- **R1-628 provider_invitations_token_digest_key**

```sql
UNIQUE ("token_digest")
```

### Row Level Security

- **R1-629** ALTER TABLE "private"."provider_invitations" ENABLE ROW LEVEL SECURITY
- **R1-630** ALTER TABLE ONLY "private"."provider_invitations" FORCE ROW LEVEL SECURITY

### Enum private.provider_invitation_status

ID R1-193 — valores: `pending`, `accepted`, `revoked`, `expired`

### Funções que citam esta tabela

- R1-268 `public.accept_provider_invitation`
- R1-286 `public.create_provider_invitation`
- R1-322 `public.read_provider_invitation`

## public.provider_reach

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-161 | `active` | `boolean` | sim | `true` |
| R1-162 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-163 | `provider_id` | `"uuid"` | sim | — |
| R1-164 | `scope_id` | `"uuid"` | sim | — |
| R1-165 | `scope_type` | `"public"."provider_reach_scope"` | sim | — |
| R1-166 | `source` | `"public"."provider_reach_source"` | sim | — |

### Constraints

- **R1-631 provider_reach_pkey**

```sql
PRIMARY KEY ("provider_id", "scope_type", "scope_id")
```
- **R1-632 provider_reach_provider_id_fkey**

```sql
FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE CASCADE
```

### Row Level Security

- **R1-633** ALTER TABLE "public"."provider_reach" ENABLE ROW LEVEL SECURITY
- **R1-634** ALTER TABLE ONLY "public"."provider_reach" FORCE ROW LEVEL SECURITY

### Policies

- **R1-635 provider_reach_delete_owner_free_community** — comando DELETE; papéis "authenticated"

```sql
CREATE POLICY "provider_reach_delete_owner_free_community" ON "public"."provider_reach" FOR DELETE TO "authenticated" USING ((("source" = 'free'::"public"."provider_reach_source") AND ("scope_type" = 'community'::"public"."provider_reach_scope") AND (EXISTS ( SELECT 1
   FROM ("public"."provider_profiles" "p"
     JOIN "public"."provider_accounts" "pa" ON (("pa"."auth_user_id" = "p"."owner_user_id")))
  WHERE (("p"."id" = "provider_reach"."provider_id") AND ("p"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("pa"."revoked_at" IS NULL) AND ("pa"."community_id" = "provider_reach"."scope_id"))))));
```
- **R1-636 provider_reach_insert_owner_free_community** — comando INSERT; papéis "authenticated"

```sql
CREATE POLICY "provider_reach_insert_owner_free_community" ON "public"."provider_reach" FOR INSERT TO "authenticated" WITH CHECK ((("source" = 'free'::"public"."provider_reach_source") AND ("scope_type" = 'community'::"public"."provider_reach_scope") AND (EXISTS ( SELECT 1
   FROM ("public"."provider_profiles" "p"
     JOIN "public"."provider_accounts" "pa" ON (("pa"."auth_user_id" = "p"."owner_user_id")))
  WHERE (("p"."id" = "provider_reach"."provider_id") AND ("p"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("pa"."revoked_at" IS NULL) AND ("pa"."community_id" = "provider_reach"."scope_id"))))));
```
- **R1-637 provider_reach_select_scoped** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "provider_reach_select_scoped" ON "public"."provider_reach" FOR SELECT TO "authenticated" USING ("private"."can_see_provider"("provider_id"));
```
- **R1-638 provider_reach_update_owner_free_community** — comando UPDATE; papéis "authenticated"

```sql
CREATE POLICY "provider_reach_update_owner_free_community" ON "public"."provider_reach" FOR UPDATE TO "authenticated" USING ((("source" = 'free'::"public"."provider_reach_source") AND ("scope_type" = 'community'::"public"."provider_reach_scope") AND (EXISTS ( SELECT 1
   FROM ("public"."provider_profiles" "p"
     JOIN "public"."provider_accounts" "pa" ON (("pa"."auth_user_id" = "p"."owner_user_id")))
  WHERE (("p"."id" = "provider_reach"."provider_id") AND ("p"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("pa"."revoked_at" IS NULL) AND ("pa"."community_id" = "provider_reach"."scope_id")))))) WITH CHECK ((("source" = 'free'::"public"."provider_reach_source") AND ("scope_type" = 'community'::"public"."provider_reach_scope") AND (EXISTS ( SELECT 1
   FROM ("public"."provider_profiles" "p"
     JOIN "public"."provider_accounts" "pa" ON (("pa"."auth_user_id" = "p"."owner_user_id")))
  WHERE (("p"."id" = "provider_reach"."provider_id") AND ("p"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("pa"."revoked_at" IS NULL) AND ("pa"."community_id" = "provider_reach"."scope_id"))))));
```

### Grants e revogações

- **R1-639 GRANT ALL ON TABLE "public"."provider_reach" TO "service_role"**

```sql
GRANT ALL ON TABLE "public"."provider_reach" TO "service_role";
```
- **R1-640 GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."provider_reach" TO "authenticated"**

```sql
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."provider_reach" TO "authenticated";
```

### Enum public.provider_reach_scope

ID R1-209 — valores: `community`, `locality`

### Enum public.provider_reach_source

ID R1-210 — valores: `free`, `paid`

### Funções que citam esta tabela

- R1-220 `private.can_see_provider`
- R1-248 `private.move_member_business_reach`
- R1-275 `public.can_manage_provider_profile`
- R1-284 `public.create_member_business_page`
- R1-334 `public.revoke_provider_account`
- R1-335 `public.search_providers`

## public.recommendation_requests

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-167 | `author_id` | `"uuid"` | sim | — |
| R1-168 | `body` | `"text"` | sim | — |
| R1-169 | `category` | `"public"."recommendation_category"` | sim | `'outros'::"public"."recommendation_category"` |
| R1-170 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-171 | `edited_at` | `timestamp with time zone` | não | — |
| R1-172 | `group_id` | `"uuid"` | não | — |
| R1-173 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-174 | `is_deleted` | `boolean` | sim | `false` |
| R1-175 | `is_resolved` | `boolean` | sim | `false` |
| R1-176 | `last_resolved_reply_id` | `"uuid"` | não | — |
| R1-177 | `locality_id` | `"uuid"` | não | — |
| R1-178 | `resolved_at` | `timestamp with time zone` | não | — |
| R1-179 | `resolved_by` | `"uuid"` | não | — |
| R1-180 | `resolved_reply_id` | `"uuid"` | não | — |
| R1-181 | `title` | `"text"` | sim | — |
| R1-182 | `updated_at` | `timestamp with time zone` | sim | `"now"()` |

### Constraints

- **R1-641 recommendation_origin_scope**

```sql
CONSTRAINT "recommendation_origin_scope" CHECK (((("locality_id" IS NOT NULL) AND ("group_id" IS NULL)) OR (("locality_id" IS NULL) AND ("group_id" IS NOT NULL))))
```
- **R1-642 recommendation_requests_author_id_fkey**

```sql
FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```
- **R1-643 recommendation_requests_body_check**

```sql
CONSTRAINT "recommendation_requests_body_check" CHECK (("char_length"("body") <= 2000))
```
- **R1-644 recommendation_requests_group_id_fkey**

```sql
FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE
```
- **R1-645 recommendation_requests_last_resolved_reply_id_fkey**

```sql
FOREIGN KEY ("last_resolved_reply_id") REFERENCES "public"."recommendation_replies"("id") ON DELETE SET NULL
```
- **R1-646 recommendation_requests_locality_id_fkey**

```sql
FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE CASCADE
```
- **R1-647 recommendation_requests_pkey**

```sql
PRIMARY KEY ("id")
```
- **R1-648 recommendation_requests_resolved_by_fkey**

```sql
FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
```
- **R1-649 recommendation_requests_resolved_reply_id_fkey**

```sql
FOREIGN KEY ("resolved_reply_id") REFERENCES "public"."recommendation_replies"("id") ON DELETE SET NULL
```
- **R1-650 recommendation_requests_title_check**

```sql
CONSTRAINT "recommendation_requests_title_check" CHECK ((("char_length"("title") >= 8) AND ("char_length"("title") <= 300)))
```

### Row Level Security

- **R1-651** ALTER TABLE "public"."recommendation_requests" ENABLE ROW LEVEL SECURITY
- **R1-652** ALTER TABLE ONLY "public"."recommendation_requests" FORCE ROW LEVEL SECURITY

### Policies

- **R1-653 recommendation_requests_delete_own** — comando DELETE; papéis "authenticated"

```sql
CREATE POLICY "recommendation_requests_delete_own" ON "public"."recommendation_requests" FOR DELETE TO "authenticated" USING (("author_id" = ( SELECT "auth"."uid"() AS "uid")));
```
- **R1-654 recommendation_requests_insert_locality** — comando INSERT; papéis "authenticated"

```sql
CREATE POLICY "recommendation_requests_insert_locality" ON "public"."recommendation_requests" FOR INSERT TO "authenticated" WITH CHECK ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) AND ((("locality_id" IS NOT NULL) AND ("group_id" IS NULL) AND "private"."is_locality_member"("locality_id")) OR (("locality_id" IS NULL) AND ("group_id" IS NOT NULL) AND "private"."is_group_member"("group_id")) OR (("locality_id" IS NOT NULL) AND ("group_id" IS NOT NULL)))));
```
- **R1-655 recommendation_requests_select_locality** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "recommendation_requests_select_locality" ON "public"."recommendation_requests" FOR SELECT TO "authenticated" USING (((("author_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("locality_id" IS NOT NULL) AND "private"."can_see_locality_recommendation"("locality_id")) OR (("group_id" IS NOT NULL) AND "private"."is_group_member"("group_id"))) AND ("is_deleted" = false)));
```
- **R1-656 recommendation_requests_update_own** — comando UPDATE; papéis "authenticated"

```sql
CREATE POLICY "recommendation_requests_update_own" ON "public"."recommendation_requests" FOR UPDATE TO "authenticated" USING (("author_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("author_id" = ( SELECT "auth"."uid"() AS "uid")));
```

### Triggers

- **R1-657 block_soft_delete_recommendation_requests** — BEFORE UPDATE OF "is_deleted"; WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")); função "private"."block_authenticated_soft_delete"

```sql
CREATE OR REPLACE TRIGGER "block_soft_delete_recommendation_requests" BEFORE UPDATE OF "is_deleted" ON "public"."recommendation_requests" FOR EACH ROW WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")) EXECUTE FUNCTION "private"."block_authenticated_soft_delete"();
```
- **R1-658 recommendation_requests_mark_edited** — BEFORE UPDATE; WHEN ausente; função "private"."mark_recommendation_request_edited"

```sql
CREATE OR REPLACE TRIGGER "recommendation_requests_mark_edited" BEFORE UPDATE ON "public"."recommendation_requests" FOR EACH ROW EXECUTE FUNCTION "private"."mark_recommendation_request_edited"();
```
- **R1-659 validate_recommendation_resolved_reply** — BEFORE INSERT OR UPDATE OF "resolved_reply_id", "last_resolved_reply_id"; WHEN ausente; função "private"."validate_recommendation_resolved_reply"

```sql
CREATE OR REPLACE TRIGGER "validate_recommendation_resolved_reply" BEFORE INSERT OR UPDATE OF "resolved_reply_id", "last_resolved_reply_id" ON "public"."recommendation_requests" FOR EACH ROW EXECUTE FUNCTION "private"."validate_recommendation_resolved_reply"();
```

### Grants e revogações

- **R1-660 GRANT SELECT,INSERT,DELETE ON TABLE "public"."recommendation_requests" TO "authenticated"**

```sql
GRANT SELECT,INSERT,DELETE ON TABLE "public"."recommendation_requests" TO "authenticated";
```
- **R1-661 GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_requests" TO "service_role"**

```sql
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_requests" TO "service_role";
```
- **R1-662 GRANT UPDATE("body") ON TABLE "public"."recommendation_requests" TO "authenticated"**

```sql
GRANT UPDATE("body") ON TABLE "public"."recommendation_requests" TO "authenticated";
```
- **R1-663 GRANT UPDATE("is_deleted") ON TABLE "public"."recommendation_requests" TO "service_role"**

```sql
GRANT UPDATE("is_deleted") ON TABLE "public"."recommendation_requests" TO "service_role";
```
- **R1-664 GRANT UPDATE("title") ON TABLE "public"."recommendation_requests" TO "authenticated"**

```sql
GRANT UPDATE("title") ON TABLE "public"."recommendation_requests" TO "authenticated";
```

### Enum public.recommendation_category

ID R1-211 — valores: `servicos_locais`, `saude_bem_estar`, `educacao`, `esporte_lazer`, `alimentacao`, `transporte`, `moradia`, `outros`

### Funções que citam esta tabela

- R1-217 `private.can_dm_between`
- R1-226 `private.dispatch_indication_alerts`
- R1-227 `private.dispatch_indication_digest`
- R1-229 `private.dm_context_valid`
- R1-235 `private.guide_candidate_enqueue`
- R1-236 `private.guide_candidate_select_due`
- R1-237 `private.indication_recipients`
- R1-258 `private.notify_recommendation_reply`
- R1-259 `private.notify_recommendation_reply_followers`
- R1-263 `private.reopen_request_on_resolved_reply_delete`
- R1-264 `private.reports_block_self`
- R1-277 `public.clear_recommendation_resolved_reply`
- R1-304 `public.list_hidden_questions`
- R1-305 `public.list_indications`
- R1-307 `public.list_open_reports`
- R1-309 `public.list_promotable_replies`
- R1-310 `public.list_question_replies`
- R1-312 `public.mark_recommendation_reply_resolved`
- R1-313 `public.mark_recommendation_resolved`
- R1-321 `public.promote_reply_to_guide_entry`
- R1-328 `public.reopen_recommendation`
- R1-332 `public.resolve_report`

## public.reports

### Colunas

| ID | Nome | Tipo | NOT NULL | Default |
|---|---|---|---|---|
| R1-183 | `created_at` | `timestamp with time zone` | sim | `"now"()` |
| R1-184 | `id` | `"uuid"` | sim | `"gen_random_uuid"()` |
| R1-185 | `operator_note` | `"text"` | não | — |
| R1-186 | `reason` | `"text"` | sim | — |
| R1-187 | `reporter_user_id` | `"uuid"` | não | `"auth"."uid"()` |
| R1-188 | `resolved_at` | `timestamp with time zone` | não | — |
| R1-189 | `resolved_by` | `"uuid"` | não | — |
| R1-190 | `status` | `"public"."report_status"` | sim | `'open'::"public"."report_status"` |
| R1-191 | `target_id` | `"uuid"` | sim | — |
| R1-192 | `target_type` | `"public"."report_target_type"` | sim | — |

### Constraints

- **R1-665 reports_operator_note_check**

```sql
CONSTRAINT "reports_operator_note_check" CHECK ((("operator_note" IS NULL) OR ("char_length"("operator_note") > 0)))
```
- **R1-666 reports_pkey**

```sql
PRIMARY KEY ("id")
```
- **R1-667 reports_reason_check**

```sql
CONSTRAINT "reports_reason_check" CHECK ((("char_length"("reason") >= 1) AND ("char_length"("reason") <= 1000)))
```
- **R1-668 reports_reporter_user_id_fkey**

```sql
FOREIGN KEY ("reporter_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
```
- **R1-669 reports_resolved_by_fkey**

```sql
FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
```

### Índices únicos

- **R1-670 reports_one_open_per_reporter_target_idx**

```sql
CREATE UNIQUE INDEX "reports_one_open_per_reporter_target_idx" ON "public"."reports" USING "btree" ("reporter_user_id", "target_type", "target_id") WHERE ("status" = 'open'::"public"."report_status");
```

### Row Level Security

- **R1-671** ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY
- **R1-672** ALTER TABLE ONLY "public"."reports" FORCE ROW LEVEL SECURITY

### Policies

- **R1-673 reports_insert_authenticated** — comando INSERT; papéis "authenticated"

```sql
CREATE POLICY "reports_insert_authenticated" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK ((("reporter_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ((EXISTS ( SELECT 1
   FROM "public"."locality_memberships"
  WHERE ("locality_memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("private"."is_provider_account"(( SELECT "auth"."uid"() AS "uid")) AND ("target_type" = 'message'::"public"."report_target_type"))) AND (NOT "public"."is_account_suspended"(( SELECT "auth"."uid"() AS "uid"))) AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));
```
- **R1-674 reports_select_reporter_only** — comando SELECT; papéis "authenticated"

```sql
CREATE POLICY "reports_select_reporter_only" ON "public"."reports" FOR SELECT TO "authenticated" USING (("reporter_user_id" = ( SELECT "auth"."uid"() AS "uid")));
```

### Triggers

- **R1-675 reports_block_self_trigger** — BEFORE INSERT; WHEN ausente; função "private"."reports_block_self"

```sql
CREATE OR REPLACE TRIGGER "reports_block_self_trigger" BEFORE INSERT ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "private"."reports_block_self"();
```
- **R1-676 reports_scrub_reason_before_insert_or_update** — BEFORE INSERT OR UPDATE OF "reason"; WHEN ausente; função "private"."scrub_report_reason"

```sql
CREATE OR REPLACE TRIGGER "reports_scrub_reason_before_insert_or_update" BEFORE INSERT OR UPDATE OF "reason" ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "private"."scrub_report_reason"();
```

### Grants e revogações

- **R1-677 GRANT SELECT,INSERT,UPDATE ON TABLE "public"."reports" TO "authenticated"**

```sql
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."reports" TO "authenticated";
```
- **R1-678 GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."reports" TO "service_role"**

```sql
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."reports" TO "service_role";
```

### Enum public.report_target_type

ID R1-213 — valores: `post`, `comment`, `group`, `message`, `recommendation_request`, `recommendation_reply`, `provider_profile`

### Enum public.report_status

ID R1-212 — valores: `open`, `resolved`

### Funções que citam esta tabela

- R1-265 `private.scrub_report_reason`
- R1-293 `public.finalize_account_deletion`
- R1-307 `public.list_open_reports`
- R1-330 `public.request_account_deletion`
- R1-332 `public.resolve_report`

## Funções public/private que citam tabelas do retrato

### R1-214 private.can_access_event

- Argumentos: `"p_event_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.events`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."can_access_event"("p_event_id" "uuid") TO "authenticated"`

### R1-215 private.can_access_post

- Argumentos: `"p_post_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.posts`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."can_access_post"("p_post_id" "uuid") TO "authenticated"`

### R1-216 private.can_access_post_scope

- Argumentos: `"p_locality_id" "uuid", "p_community_id" "uuid", "p_group_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."can_access_post_scope"("p_locality_id" "uuid", "p_community_id" "uuid", "p_group_id" "uuid") TO "authenticated"`

### R1-217 private.can_dm_between

- Argumentos: `"p_user_a" "uuid", "p_user_b" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`, `public.event_rsvps`, `public.recommendation_requests`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."can_dm_between"("p_user_a" "uuid", "p_user_b" "uuid") TO "authenticated"`

### R1-218 private.can_read_listing

- Argumentos: `"p_listing_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`, `public.listings`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."can_read_listing"("p_listing_id" "uuid") TO "authenticated"`; `GRANT ALL ON FUNCTION "private"."can_read_listing"("p_listing_id" "uuid") TO "service_role"`

### R1-219 private.can_receive_invite_to_event

- Argumentos: `"p_event_id" "uuid", "p_user_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`, `public.events`, `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."can_receive_invite_to_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "authenticated"`

### R1-220 private.can_see_provider

- Argumentos: `"p_provider_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`, `public.provider_accounts`, `public.provider_reach`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."can_see_provider"("p_provider_id" "uuid") TO "authenticated"`; `GRANT ALL ON FUNCTION "private"."can_see_provider"("p_provider_id" "uuid") TO "service_role"`

### R1-221 private.can_user_read_listing

- Argumentos: `"p_user_id" "uuid", "p_listing_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`, `public.listings`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."can_user_read_listing"("p_user_id" "uuid", "p_listing_id" "uuid") TO "authenticated"`; `GRANT ALL ON FUNCTION "private"."can_user_read_listing"("p_user_id" "uuid", "p_listing_id" "uuid") TO "service_role"`

### R1-222 private.cascade_community_membership_downgrade

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-223 private.cascade_community_membership_loss

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`, `public.communities`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-224 private.consume_group_join_attempt

- Argumentos: `"p_group_id" "uuid", "p_user_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_join_attempts`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-225 private.default_event_rsvp_occurrence

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.events`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-226 private.dispatch_indication_alerts

- Argumentos: ``
- Retorno: `integer`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.recommendation_requests`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-227 private.dispatch_indication_digest

- Argumentos: ``
- Retorno: `integer`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-228 private.dispatch_listing_alerts

- Argumentos: `"p_limit" integer DEFAULT 200`
- Retorno: `integer`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.listings`, `public.notifications`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-229 private.dm_context_valid

- Argumentos: `"p_a" "uuid", "p_b" "uuid", "p_type" "public"."dm_context_type", "p_context_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`, `public.event_rsvps`, `public.recommendation_requests`, `public.listings`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."dm_context_valid"("p_a" "uuid", "p_b" "uuid", "p_type" "public"."dm_context_type", "p_context_id" "uuid") TO "authenticated"`

### R1-230 private.enforce_group_community_membership

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.community_memberships`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-231 private.enforce_group_join_attempt_limit

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-232 private.event_rsvps_block_self

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.events`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-233 private.group_notify_allows

- Argumentos: `"p_group_id" "uuid", "p_kind" "text", "p_user_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-234 private.guard_group_pinned_post

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.posts`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-235 private.guide_candidate_enqueue

- Argumentos: `"p_reply_id" "uuid", "p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_confidence" smallint, "p_min_confidence" smallint DEFAULT "private"."guide_candidate_min_confidence"()`
- Retorno: `"uuid"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-236 private.guide_candidate_select_due

- Argumentos: `"p_max_per_locality" integer DEFAULT "private"."guide_candidate_max_per_locality"()`
- Retorno: `TABLE("reply_id" "uuid", "request_id" "uuid", "locality_id" "uuid", "request_category" "public"."recommendation_category", "body" "text", "resolved_at" timestamp with time zone)`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-237 private.indication_recipients

- Argumentos: `"p_request_id" "uuid"`
- Retorno: `TABLE("user_id" "uuid")`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`, `public.recommendation_requests`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-238 private.is_community_image_owner

- Argumentos: `"p_path" "text"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.communities`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."is_community_image_owner"("p_path" "text") TO "authenticated"`

### R1-239 private.is_community_member

- Argumentos: `"p_community_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."is_community_member"("p_community_id" "uuid") TO "authenticated"`

### R1-240 private.is_dm_blocked_by_other

- Argumentos: `"p_conversation_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.dm_conversations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."is_dm_blocked_by_other"("p_conversation_id" "uuid") TO "authenticated"`

### R1-241 private.is_dm_blocked_either_way

- Argumentos: `"p_conversation_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.dm_conversations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."is_dm_blocked_either_way"("p_conversation_id" "uuid") TO "authenticated"`

### R1-242 private.is_dm_participant

- Argumentos: `"p_conversation_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.dm_conversations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."is_dm_participant"("p_conversation_id" "uuid") TO "authenticated"`

### R1-243 private.is_event_locality_member

- Argumentos: `"target_event_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.events`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."is_event_locality_member"("target_event_id" "uuid") TO "authenticated"`

### R1-244 private.is_group_member

- Argumentos: `"p_group_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."is_group_member"("p_group_id" "uuid") TO "authenticated"`

### R1-245 private.is_group_moderator

- Argumentos: `"p_group_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."is_group_moderator"("p_group_id" "uuid") TO "authenticated"`

### R1-246 private.is_group_owner

- Argumentos: `"p_group_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."is_group_owner"("p_group_id" "uuid") TO "authenticated"`

### R1-247 private.is_provider_account

- Argumentos: `"p_user_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.provider_accounts`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."is_provider_account"("p_user_id" "uuid") TO "authenticated"`; `GRANT ALL ON FUNCTION "private"."is_provider_account"("p_user_id" "uuid") TO "service_role"`

### R1-248 private.move_member_business_reach

- Argumentos: `"p_user_id" "uuid", "p_locality_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.provider_accounts`, `public.provider_reach`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-249 private.notify_comment

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.posts`, `public.notifications`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-250 private.notify_event_change

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.event_rsvps`, `public.notifications`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-251 private.notify_event_question_message

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.dm_conversations`, `public.notifications`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-252 private.notify_event_rsvp

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.events`, `public.notifications`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-253 private.notify_group_admission

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.notifications`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-254 private.notify_group_pin

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`, `public.notifications`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-255 private.notify_group_post

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`, `public.notifications`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-256 private.notify_indication

- Argumentos: `"p_user_id" "uuid", "p_request_id" "uuid", "p_kind" "text", "p_locality_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.notifications`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-257 private.notify_invitation_accepted

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.notifications`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-258 private.notify_recommendation_reply

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`, `public.notifications`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."notify_recommendation_reply"() TO "service_role"`

### R1-259 private.notify_recommendation_reply_followers

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`, `public.notifications`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."notify_recommendation_reply_followers"() TO "service_role"`

### R1-260 private.post_accepts_interaction

- Argumentos: `"p_post_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.posts`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "private"."post_accepts_interaction"("p_post_id" "uuid") TO "authenticated"`

### R1-261 private.property_details_require_property

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: não
- search_path: `não definido`
- Tabelas citadas: `public.listings`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-262 private.purge_stale_group_join_reasons

- Argumentos: ``
- Retorno: `integer`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`, `public.group_join_reasons`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-263 private.reopen_request_on_resolved_reply_delete

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-264 private.reports_block_self

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.posts`, `public.comments`, `public.recommendation_requests`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-265 private.scrub_report_reason

- Argumentos: ``
- Retorno: `"trigger"`
- SECURITY DEFINER: não
- search_path: `não definido`
- Tabelas citadas: `public.reports`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-266 private.send_recurring_event_reminders

- Argumentos: ``
- Retorno: `integer`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.events`, `public.event_rsvps`, `public.notifications`
- GRANT EXECUTE: nenhum explícito encontrado

### R1-267 public.accept_community_invitation

- Argumentos: `"p_token_digest" "bytea", "p_user_id" "uuid"`
- Retorno: `"uuid"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`, `public.community_invitations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."accept_community_invitation"("p_token_digest" "bytea", "p_user_id" "uuid") TO "service_role"`

### R1-268 public.accept_provider_invitation

- Argumentos: `"p_token" "text", "p_email" "text"`
- Retorno: `"uuid"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`, `public.provider_accounts`, `private.provider_invitations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."accept_provider_invitation"("p_token" "text", "p_email" "text") TO "authenticated"`

### R1-269 public.add_community_moderator

- Argumentos: `"p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.communities`, `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."add_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") TO "service_role"`

### R1-270 public.add_group_moderator

- Argumentos: `"p_group_id" "uuid", "p_user_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."add_group_moderator"("p_group_id" "uuid", "p_user_id" "uuid") TO "authenticated"`

### R1-271 public.advance_recurring_events

- Argumentos: ``
- Retorno: `integer`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.events`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."advance_recurring_events"() TO "service_role"`

### R1-272 public.answer_support_ticket

- Argumentos: `"p_ticket_id" "uuid", "p_reply" "text"`
- Retorno: `"public"."support_tickets"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.notifications`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."answer_support_ticket"("p_ticket_id" "uuid", "p_reply" "text") TO "authenticated"`

### R1-273 public.approve_community_member

- Argumentos: `"p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."approve_community_member"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") TO "service_role"`

### R1-274 public.approve_group_member

- Argumentos: `"p_group_id" "uuid", "p_user_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`, `public.group_join_reasons`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."approve_group_member"("p_group_id" "uuid", "p_user_id" "uuid") TO "authenticated"`

### R1-275 public.can_manage_provider_profile

- Argumentos: `"p_provider_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.provider_accounts`, `public.provider_reach`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."can_manage_provider_profile"("p_provider_id" "uuid") TO "authenticated"`; `GRANT ALL ON FUNCTION "public"."can_manage_provider_profile"("p_provider_id" "uuid") TO "service_role"`

### R1-276 public.cancel_community_request

- Argumentos: `"p_community_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."cancel_community_request"("p_community_id" "uuid") TO "authenticated"`

### R1-277 public.clear_recommendation_resolved_reply

- Argumentos: `"p_request_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."clear_recommendation_resolved_reply"("p_request_id" "uuid") TO "authenticated"`

### R1-278 public.complete_event

- Argumentos: `"p_event_id" "uuid", "p_caller_user_id" "uuid" DEFAULT "auth"."uid"()`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.events`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."complete_event"("p_event_id" "uuid", "p_caller_user_id" "uuid") TO "authenticated"`; `GRANT ALL ON FUNCTION "public"."complete_event"("p_event_id" "uuid", "p_caller_user_id" "uuid") TO "service_role"`

### R1-279 public.conversation_counterpart_name

- Argumentos: `"p_conversation_id" "uuid"`
- Retorno: `"text"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.dm_conversations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."conversation_counterpart_name"("p_conversation_id" "uuid") TO "authenticated"`

### R1-280 public.create_community

- Argumentos: `"p_name" "text", "p_description" "text", "p_locality_id" "uuid", "p_owner_user_id" "uuid"`
- Retorno: `"uuid"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.communities`, `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_locality_id" "uuid", "p_owner_user_id" "uuid") TO "service_role"`

### R1-281 public.create_community_invitation

- Argumentos: `"p_community_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_expires_at" timestamp with time zone`
- Retorno: `"uuid"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`, `public.community_invitations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."create_community_invitation"("p_community_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_expires_at" timestamp with time zone) TO "service_role"`

### R1-282 public.create_group

- Argumentos: `"p_name" "text", "p_visibility" "public"."group_visibility", "p_locality_id" "uuid", "p_description" "text" DEFAULT NULL::"text", "p_rules" "text" DEFAULT NULL::"text"`
- Retorno: `"uuid"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."create_group"("p_name" "text", "p_visibility" "public"."group_visibility", "p_locality_id" "uuid", "p_description" "text", "p_rules" "text") TO "authenticated"`

### R1-283 public.create_group_in_community

- Argumentos: `"p_name" "text", "p_description" "text", "p_visibility" "public"."group_visibility", "p_community_id" "uuid"`
- Retorno: `"uuid"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`, `public.communities`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."create_group_in_community"("p_name" "text", "p_description" "text", "p_visibility" "public"."group_visibility", "p_community_id" "uuid") TO "authenticated"`

### R1-284 public.create_member_business_page

- Argumentos: `"p_display_name" "text", "p_category" "public"."provider_category", "p_bio" "text" DEFAULT NULL::"text"`
- Retorno: `"uuid"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.provider_accounts`, `public.provider_reach`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."create_member_business_page"("p_display_name" "text", "p_category" "public"."provider_category", "p_bio" "text") TO "authenticated"`

### R1-285 public.create_property_listing

- Argumentos: `"p_listing" "jsonb", "p_details" "jsonb"`
- Retorno: `"uuid"`
- SECURITY DEFINER: não
- search_path: `não definido`
- Tabelas citadas: `public.listings`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."create_property_listing"("p_listing" "jsonb", "p_details" "jsonb") TO "authenticated"`

### R1-286 public.create_provider_invitation

- Argumentos: `"p_community_id" "uuid", "p_email" "text", "p_display_name" "text"`
- Retorno: `"uuid"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.communities`, `public.community_memberships`, `private.provider_invitations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."create_provider_invitation"("p_community_id" "uuid", "p_email" "text", "p_display_name" "text") TO "authenticated"`

### R1-287 public.create_service_request

- Argumentos: `"p_provider_id" "uuid", "p_description" "text", "p_when_text" "text" DEFAULT NULL::"text", "p_idempotency_key" "text" DEFAULT NULL::"text"`
- Retorno: `"uuid"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.dm_conversations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."create_service_request"("p_provider_id" "uuid", "p_description" "text", "p_when_text" "text", "p_idempotency_key" "text") TO "authenticated"`

### R1-288 public.delete_group

- Argumentos: `"p_group_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."delete_group"("p_group_id" "uuid") TO "authenticated"`

### R1-289 public.feed_community

- Argumentos: `"p_community_id" "uuid", "p_order" "text" DEFAULT 'recent'::"text", "p_limit" integer DEFAULT NULL::integer, "p_offset" integer DEFAULT 0`
- Retorno: `TABLE("id" "uuid", "locality_id" "uuid", "user_id" "uuid", "community_id" "uuid", "group_id" "uuid", "post_type" "public"."post_type", "content" "text", "photo_path" "text", "link_url" "text", "poll_options" "jsonb", "created_at" timestamp with time zone, "comment_count" bigint, "reaction_count" bigint, "my_reaction" boolean, "my_follow" boolean, "display_name" "text")`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`, `public.posts`, `public.comments`, `public.post_reactions`, `public.post_follows`, `public.communities`, `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."feed_community"("p_community_id" "uuid", "p_order" "text", "p_limit" integer, "p_offset" integer) TO "authenticated"`

### R1-290 public.feed_following

- Argumentos: ``
- Retorno: `TABLE("id" "uuid", "locality_id" "uuid", "user_id" "uuid", "community_id" "uuid", "group_id" "uuid", "post_type" "public"."post_type", "content" "text", "photo_path" "text", "link_url" "text", "poll_options" "jsonb", "created_at" timestamp with time zone, "comment_count" bigint, "reaction_count" bigint, "my_reaction" boolean, "my_follow" boolean, "display_name" "text")`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`, `public.posts`, `public.comments`, `public.post_reactions`, `public.post_follows`, `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."feed_following"() TO "authenticated"`

### R1-291 public.feed_group

- Argumentos: `"p_group_id" "uuid", "p_order" "text" DEFAULT 'recent'::"text"`
- Retorno: `TABLE("id" "uuid", "locality_id" "uuid", "user_id" "uuid", "group_id" "uuid", "post_type" "public"."post_type", "content" "text", "photo_path" "text", "link_url" "text", "poll_options" "jsonb", "created_at" timestamp with time zone, "comment_count" bigint, "reaction_count" bigint, "my_reaction" boolean, "my_follow" boolean, "display_name" "text")`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`, `public.posts`, `public.comments`, `public.post_reactions`, `public.post_follows`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."feed_group"("p_group_id" "uuid", "p_order" "text") TO "authenticated"`

### R1-292 public.feed_posts

- Argumentos: `"p_locality_id" "uuid", "p_order" "text" DEFAULT 'recent'::"text"`
- Retorno: `TABLE("id" "uuid", "locality_id" "uuid", "user_id" "uuid", "group_id" "uuid", "post_type" "public"."post_type", "content" "text", "photo_path" "text", "link_url" "text", "poll_options" "jsonb", "created_at" timestamp with time zone, "comment_count" bigint, "reaction_count" bigint, "my_reaction" boolean, "my_follow" boolean, "display_name" "text")`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`, `public.posts`, `public.comments`, `public.post_reactions`, `public.post_follows`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."feed_posts"("p_locality_id" "uuid", "p_order" "text") TO "authenticated"`

### R1-293 public.finalize_account_deletion

- Argumentos: `"p_user_id" "uuid", "p_error" "text" DEFAULT NULL::"text"`
- Retorno: `"text"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`, `public.post_reactions`, `public.post_saves`, `public.post_follows`, `public.event_rsvps`, `public.communities`, `public.community_memberships`, `public.notifications`, `public.reports`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."finalize_account_deletion"("p_user_id" "uuid", "p_error" "text") TO "service_role"`

### R1-294 public.get_profile_neighborhood

- Argumentos: `"p_user_id" "uuid"`
- Retorno: `"text"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."get_profile_neighborhood"("p_user_id" "uuid") TO "authenticated"`

### R1-295 public.is_community_member

- Argumentos: `"p_community_id" "uuid", "p_user_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."is_community_member"("p_community_id" "uuid", "p_user_id" "uuid") TO "service_role"`

### R1-296 public.is_current_user_community_moderator

- Argumentos: `"p_community_id" "uuid", "p_user_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."is_current_user_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid") TO "service_role"`

### R1-297 public.is_provider_account

- Argumentos: `"p_user_id" "uuid"`
- Retorno: `boolean`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.provider_accounts`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."is_provider_account"("p_user_id" "uuid") TO "service_role"`

### R1-298 public.join_group

- Argumentos: `"p_group_id" "uuid", "p_reason" "text" DEFAULT NULL::"text"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`, `public.group_join_reasons`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."join_group"("p_group_id" "uuid", "p_reason" "text") TO "authenticated"`

### R1-299 public.leave_community

- Argumentos: `"p_community_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."leave_community"("p_community_id" "uuid") TO "authenticated"`

### R1-300 public.list_available_groups_for_interests

- Argumentos: `"p_user_id" "uuid", "p_locality_id" "uuid"`
- Retorno: `TABLE("id" "uuid", "name" "text", "description" "text", "visibility" "public"."group_visibility", "already_member" boolean, "already_interest" boolean)`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."list_available_groups_for_interests"("p_user_id" "uuid", "p_locality_id" "uuid") TO "service_role"`

### R1-301 public.list_community_pending_arrivals

- Argumentos: `"p_community_id" "uuid", "p_user_id" "uuid", "p_limit" integer DEFAULT 500`
- Retorno: `TABLE("user_id" "uuid", "display_name" "text", "requested_at" timestamp with time zone, "arriving_from_locality_name" "text", "arriving_at" "date")`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."list_community_pending_arrivals"("p_community_id" "uuid", "p_user_id" "uuid", "p_limit" integer) TO "service_role"`

### R1-302 public.list_community_providers

- Argumentos: `"p_community_id" "uuid", "p_user_id" "uuid", "p_limit" integer DEFAULT 200`
- Retorno: `TABLE("provider_user_id" "uuid", "display_name" "text", "category" "public"."provider_category", "revoked_at" timestamp with time zone)`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.communities`, `public.provider_accounts`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."list_community_providers"("p_community_id" "uuid", "p_user_id" "uuid", "p_limit" integer) TO "service_role"`

### R1-303 public.list_group_activity

- Argumentos: `"p_locality_id" "uuid"`
- Retorno: `TABLE("group_id" "uuid", "recent_post_count" bigint)`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.posts`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."list_group_activity"("p_locality_id" "uuid") TO "authenticated"`

### R1-304 public.list_hidden_questions

- Argumentos: ``
- Retorno: `TABLE("id" "uuid", "title" "text", "body" "text", "category" "public"."recommendation_category", "created_at" timestamp with time zone, "hidden_at" timestamp with time zone)`
- SECURITY DEFINER: não
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."list_hidden_questions"() TO "authenticated"`

### R1-305 public.list_indications

- Argumentos: `"p_locality_id" "uuid", "p_query" "text" DEFAULT NULL::"text", "p_category" "public"."recommendation_category" DEFAULT NULL::"public"."recommendation_category", "p_resolved" boolean DEFAULT NULL::boolean, "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0, "p_mine" boolean DEFAULT NULL::boolean`
- Retorno: `TABLE("id" "uuid", "title" "text", "body" "text", "category" "public"."recommendation_category", "created_at" timestamp with time zone, "is_resolved" boolean, "group_id" "uuid", "group_name" "text", "reply_count" integer, "resolved_reply_body" "text", "matched_reply_body" "text")`
- SECURITY DEFINER: não
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.recommendation_requests`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."list_indications"("p_locality_id" "uuid", "p_query" "text", "p_category" "public"."recommendation_category", "p_resolved" boolean, "p_limit" integer, "p_offset" integer, "p_mine" boolean) TO "authenticated"`

### R1-306 public.list_invitable_members_for_event

- Argumentos: `"p_event_id" "uuid", "p_user_id" "uuid"`
- Retorno: `TABLE("user_id" "uuid", "display_name" "text", "is_already_invited" boolean)`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.events`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."list_invitable_members_for_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "service_role"`

### R1-307 public.list_open_reports

- Argumentos: ``
- Retorno: `TABLE("id" "uuid", "target_type" "public"."report_target_type", "target_id" "uuid", "reason" "text", "created_at" timestamp with time zone, "target_excerpt" "text", "target_author_name" "text", "open_reports_on_target" integer)`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.posts`, `public.comments`, `public.recommendation_requests`, `public.reports`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."list_open_reports"() TO "service_role"`

### R1-308 public.list_pending_community_invitations

- Argumentos: `"p_inviter_user_id" "uuid", "p_community_id" "uuid"`
- Retorno: `TABLE("id" "uuid", "community_id" "uuid", "expires_at" timestamp with time zone, "created_at" timestamp with time zone)`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_invitations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."list_pending_community_invitations"("p_inviter_user_id" "uuid", "p_community_id" "uuid") TO "service_role"`

### R1-309 public.list_promotable_replies

- Argumentos: `"p_locality_id" "uuid", "p_limit" integer DEFAULT 50`
- Retorno: `TABLE("reply_id" "uuid", "body" "text", "created_at" timestamp with time zone, "request_title" "text", "request_category" "public"."recommendation_category", "author_display_name" "text")`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."list_promotable_replies"("p_locality_id" "uuid", "p_limit" integer) TO "service_role"`

### R1-310 public.list_question_replies

- Argumentos: `"p_request_id" "uuid"`
- Retorno: `TABLE("id" "uuid", "author_id" "uuid", "body" "text", "created_at" timestamp with time zone, "edited_at" timestamp with time zone, "is_removed" boolean)`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."list_question_replies"("p_request_id" "uuid") TO "authenticated"`

### R1-311 public.mark_conversation_read

- Argumentos: `"p_conversation_id" "uuid", "p_seen_at" timestamp with time zone DEFAULT "now"()`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.dm_conversations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."mark_conversation_read"("p_conversation_id" "uuid", "p_seen_at" timestamp with time zone) TO "authenticated"`

### R1-312 public.mark_recommendation_reply_resolved

- Argumentos: `"p_request_id" "uuid", "p_reply_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."mark_recommendation_reply_resolved"("p_request_id" "uuid", "p_reply_id" "uuid") TO "authenticated"`

### R1-313 public.mark_recommendation_resolved

- Argumentos: `"p_request_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."mark_recommendation_resolved"("p_request_id" "uuid") TO "authenticated"`

### R1-314 public.my_account_kind

- Argumentos: ``
- Retorno: `"text"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.provider_accounts`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."my_account_kind"() TO "authenticated"`; `GRANT ALL ON FUNCTION "public"."my_account_kind"() TO "service_role"`

### R1-315 public.my_group_notify_level

- Argumentos: `"p_group_id" "uuid"`
- Retorno: `"public"."group_notify_level"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."my_group_notify_level"("p_group_id" "uuid") TO "authenticated"`

### R1-316 public.open_conversation

- Argumentos: `"p_other_user_id" "uuid", "p_context_type" "public"."dm_context_type", "p_context_id" "uuid"`
- Retorno: `"uuid"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.dm_conversations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."open_conversation"("p_other_user_id" "uuid", "p_context_type" "public"."dm_context_type", "p_context_id" "uuid") TO "authenticated"`

### R1-317 public.open_event_question

- Argumentos: `"p_event_id" "uuid"`
- Retorno: `"uuid"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.events`, `public.dm_conversations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."open_event_question"("p_event_id" "uuid") TO "authenticated"`

### R1-318 public.pin_group_post

- Argumentos: `"p_group_id" "uuid", "p_post_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.posts`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."pin_group_post"("p_group_id" "uuid", "p_post_id" "uuid") TO "authenticated"`

### R1-319 public.profile_events_for

- Argumentos: `"p_target_user_id" "uuid", "p_viewer_user_id" "uuid"`
- Retorno: `TABLE("id" "uuid", "title" "text", "starts_at" timestamp with time zone, "locality_id" "uuid")`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.events`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."profile_events_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") TO "service_role"`; `GRANT ALL ON FUNCTION "public"."profile_events_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") TO "authenticated"`

### R1-320 public.profile_posts_for

- Argumentos: `"p_target_user_id" "uuid", "p_viewer_user_id" "uuid"`
- Retorno: `TABLE("id" "uuid", "locality_id" "uuid", "community_id" "uuid", "group_id" "uuid", "post_type" "public"."post_type", "content" "text", "photo_path" "text", "link_url" "text", "poll_options" "jsonb", "created_at" timestamp with time zone)`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`, `public.posts`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."profile_posts_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") TO "service_role"`; `GRANT ALL ON FUNCTION "public"."profile_posts_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") TO "authenticated"`

### R1-321 public.promote_reply_to_guide_entry

- Argumentos: `"p_reply_id" "uuid", "p_locality_id" "uuid", "p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_website_url" "text", "p_phone" "text", "p_operator_user_id" "uuid"`
- Retorno: `"uuid"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."promote_reply_to_guide_entry"("p_reply_id" "uuid", "p_locality_id" "uuid", "p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_website_url" "text", "p_phone" "text", "p_operator_user_id" "uuid") TO "service_role"`

### R1-322 public.read_provider_invitation

- Argumentos: `"p_token" "text"`
- Retorno: `TABLE("community_id" "uuid", "community_name" "text", "status" "text")`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.communities`, `private.provider_invitations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."read_provider_invitation"("p_token" "text") TO "anon"`; `GRANT ALL ON FUNCTION "public"."read_provider_invitation"("p_token" "text") TO "authenticated"`

### R1-323 public.record_user_group_interests

- Argumentos: `"p_user_id" "uuid", "p_locality_id" "uuid", "p_group_ids" "uuid"[]`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."record_user_group_interests"("p_user_id" "uuid", "p_locality_id" "uuid", "p_group_ids" "uuid"[]) TO "service_role"`

### R1-324 public.reject_pending_user

- Argumentos: `"p_user_id" "uuid", "p_operator_user_id" "uuid", "p_reason" "text"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.notifications`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."reject_pending_user"("p_user_id" "uuid", "p_operator_user_id" "uuid", "p_reason" "text") TO "service_role"`

### R1-325 public.remove_community_member

- Argumentos: `"p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."remove_community_member"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") TO "service_role"`

### R1-326 public.remove_community_moderator

- Argumentos: `"p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.communities`, `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."remove_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") TO "service_role"`

### R1-327 public.remove_group_moderator

- Argumentos: `"p_group_id" "uuid", "p_user_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."remove_group_moderator"("p_group_id" "uuid", "p_user_id" "uuid") TO "authenticated"`

### R1-328 public.reopen_recommendation

- Argumentos: `"p_request_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.recommendation_requests`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."reopen_recommendation"("p_request_id" "uuid") TO "authenticated"`

### R1-329 public.replace_listing_photo

- Argumentos: `"p_listing_id" "uuid", "p_path" "text", "p_position" integer DEFAULT 0`
- Retorno: `"text"[]`
- SECURITY DEFINER: não
- search_path: `não definido`
- Tabelas citadas: `public.listings`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."replace_listing_photo"("p_listing_id" "uuid", "p_path" "text", "p_position" integer) TO "authenticated"`

### R1-330 public.request_account_deletion

- Argumentos: ``
- Retorno: `"jsonb"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.reports`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."request_account_deletion"() TO "authenticated"`

### R1-331 public.request_community_membership

- Argumentos: `"p_community_id" "uuid", "p_reason" "text" DEFAULT NULL::"text"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.communities`, `public.community_memberships`, `public.community_join_reasons`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."request_community_membership"("p_community_id" "uuid", "p_reason" "text") TO "authenticated"`

### R1-332 public.resolve_report

- Argumentos: `"p_report_id" "uuid", "p_operator_user_id" "uuid", "p_action" "text", "p_note" "text" DEFAULT NULL::"text"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.posts`, `public.comments`, `public.recommendation_requests`, `public.notifications`, `public.reports`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."resolve_report"("p_report_id" "uuid", "p_operator_user_id" "uuid", "p_action" "text", "p_note" "text") TO "service_role"`

### R1-333 public.revoke_community_invitation

- Argumentos: `"p_invitation_id" "uuid", "p_inviter_user_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.community_invitations`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."revoke_community_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid") TO "service_role"`

### R1-334 public.revoke_provider_account

- Argumentos: `"p_provider_user_id" "uuid", "p_owner_user_id" "uuid", "p_reason" "text"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.communities`, `public.provider_accounts`, `public.provider_reach`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."revoke_provider_account"("p_provider_user_id" "uuid", "p_owner_user_id" "uuid", "p_reason" "text") TO "service_role"`

### R1-335 public.search_providers

- Argumentos: `"p_category" "public"."provider_category" DEFAULT NULL::"public"."provider_category", "p_community_id" "uuid" DEFAULT NULL::"uuid", "p_query" "text" DEFAULT NULL::"text"`
- Retorno: `TABLE("id" "uuid", "display_name" "text", "category" "public"."provider_category", "bio" "text", "reach_source" "public"."provider_reach_source")`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.provider_reach`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."search_providers"("p_category" "public"."provider_category", "p_community_id" "uuid", "p_query" "text") TO "authenticated"`

### R1-336 public.send_conversation_message

- Argumentos: `"p_conversation_id" "uuid", "p_content" "text", "p_client_key" "text" DEFAULT NULL::"text"`
- Retorno: `"jsonb"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.dm_conversations`, `public.notifications`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."send_conversation_message"("p_conversation_id" "uuid", "p_content" "text", "p_client_key" "text") TO "authenticated"`

### R1-337 public.set_community_image

- Argumentos: `"p_community_id" "uuid", "p_kind" "text", "p_path" "text", "p_caller_user_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.communities`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."set_community_image"("p_community_id" "uuid", "p_kind" "text", "p_path" "text", "p_caller_user_id" "uuid") TO "service_role"`

### R1-338 public.set_group_notify_level

- Argumentos: `"p_group_id" "uuid", "p_level" "public"."group_notify_level"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.group_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."set_group_notify_level"("p_group_id" "uuid", "p_level" "public"."group_notify_level") TO "authenticated"`

### R1-339 public.set_group_rules

- Argumentos: `"p_group_id" "uuid", "p_rules" "text"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."set_group_rules"("p_group_id" "uuid", "p_rules" "text") TO "authenticated"`

### R1-340 public.settle_account_possessions

- Argumentos: `"p_user_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`, `public.communities`, `public.community_memberships`, `public.provider_accounts`, `public.listings`, `public.notifications`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."settle_account_possessions"("p_user_id" "uuid") TO "service_role"`

### R1-341 public.suggest_groups_for_user

- Argumentos: `"p_user_id" "uuid", "p_locality_id" "uuid"`
- Retorno: `TABLE("id" "uuid", "name" "text", "description" "text", "visibility" "public"."group_visibility")`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."suggest_groups_for_user"("p_user_id" "uuid", "p_locality_id" "uuid") TO "service_role"`

### R1-342 public.transfer_community_ownership

- Argumentos: `"p_community_id" "uuid", "p_new_owner_user_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.communities`, `public.community_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."transfer_community_ownership"("p_community_id" "uuid", "p_new_owner_user_id" "uuid") TO "authenticated"`

### R1-343 public.transfer_group_ownership

- Argumentos: `"p_group_id" "uuid", "p_new_owner_user_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`, `public.group_memberships`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."transfer_group_ownership"("p_group_id" "uuid", "p_new_owner_user_id" "uuid") TO "authenticated"`

### R1-344 public.transition_listing

- Argumentos: `"p_listing_id" "uuid", "p_action" "text"`
- Retorno: `"public"."listing_status"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.listings`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."transition_listing"("p_listing_id" "uuid", "p_action" "text") TO "authenticated"`

### R1-345 public.unpin_group_post

- Argumentos: `"p_group_id" "uuid"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.groups`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."unpin_group_post"("p_group_id" "uuid") TO "authenticated"`

### R1-346 public.update_member_business_page

- Argumentos: `"p_provider_id" "uuid", "p_display_name" "text", "p_category" "public"."provider_category", "p_bio" "text" DEFAULT NULL::"text"`
- Retorno: `"void"`
- SECURITY DEFINER: sim
- search_path: `não definido`
- Tabelas citadas: `public.provider_accounts`
- GRANT EXECUTE: `GRANT ALL ON FUNCTION "public"."update_member_business_page"("p_provider_id" "uuid", "p_display_name" "text", "p_category" "public"."provider_category", "p_bio" "text") TO "authenticated"`

## Policies de storage.objects para buckets de post, evento ou comunidade

- **R1-347**

```sql
CREATE POLICY "community_images_delete_owner" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'community-images'::"text") AND ("owner" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."is_community_image_owner"("name")));
```
- **R1-348**

```sql
CREATE POLICY "community_images_select_reachable" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'community-images'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."communities" "c"
  WHERE (("c"."is_deleted" = false) AND (("c"."banner_path" = "objects"."name") OR ("c"."thumbnail_path" = "objects"."name")) AND "private"."is_locality_member"("c"."locality_id"))))));
```
- **R1-349**

```sql
CREATE POLICY "event_photos_delete_own" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'event-photos'::"text") AND ("owner" = "auth"."uid"())));
```
- **R1-350**

```sql
CREATE POLICY "event_photos_select_scoped" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'event-photos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."photo_path" = "objects"."name") AND "private"."is_locality_member"("p"."locality_id"))))));
```
## Contagens

| Tabela | Colunas | Constraints | Policies | Triggers | Grants | Funções que citam |
|---|---:|---:|---:|---:|---:|---:|
| public.comments | 6 | 4 | 4 | 2 | 3 | 7 |
| public.communities | 10 | 9 | 1 | 0 | 2 | 16 |
| public.community_invitations | 9 | 7 | 0 | 0 | 1 | 4 |
| public.community_join_reasons | 4 | 3 | 1 | 0 | 2 | 1 |
| public.community_memberships | 5 | 3 | 1 | 2 | 2 | 27 |
| public.dm_conversations | 6 | 4 | 1 | 0 | 2 | 10 |
| public.event_rsvps | 6 | 3 | 4 | 3 | 2 | 5 |
| public.events | 19 | 15 | 3 | 3 | 3 | 12 |
| public.group_join_attempts | 4 | 3 | 0 | 0 | 1 | 1 |
| public.group_join_reasons | 4 | 3 | 1 | 0 | 2 | 3 |
| public.group_memberships | 6 | 3 | 3 | 3 | 7 | 31 |
| public.groups | 12 | 10 | 4 | 4 | 3 | 30 |
| public.listings | 19 | 15 | 4 | 3 | 2 | 9 |
| public.notifications | 9 | 5 | 2 | 0 | 2 | 19 |
| public.post_follows | 3 | 3 | 3 | 0 | 2 | 5 |
| public.post_reactions | 4 | 4 | 4 | 0 | 2 | 5 |
| public.post_saves | 3 | 3 | 3 | 0 | 2 | 1 |
| public.posts | 12 | 12 | 4 | 3 | 3 | 14 |
| public.provider_accounts | 7 | 6 | 1 | 0 | 2 | 12 |
| private.provider_invitations | 12 | 11 | 0 | 0 | 0 | 3 |
| public.provider_reach | 6 | 2 | 4 | 0 | 2 | 6 |
| public.recommendation_requests | 16 | 10 | 4 | 3 | 5 | 22 |
| public.reports | 10 | 5 | 2 | 2 | 2 | 5 |

Storage policies listadas: 4. Tabelas encontradas: 23/23. Policies: 54; triggers: 28; grants/revokes: 54; funções: 133; IDs: 678.
