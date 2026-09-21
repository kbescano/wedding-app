import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`reset_password_requested_at\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`guests\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`party_size\` numeric DEFAULT 1 NOT NULL,
  	\`table_label\` text,
  	\`unlocked\` integer DEFAULT false,
  	\`rsvp\` text DEFAULT 'pending',
  	\`rsvp_count\` numeric DEFAULT 0,
  	\`meal\` text,
  	\`note\` text,
  	\`code\` text,
  	\`last_login\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`guests_code_idx\` ON \`guests\` (\`code\`);`)
  await db.run(sql`CREATE INDEX \`guests_updated_at_idx\` ON \`guests\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`guests_created_at_idx\` ON \`guests\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`photos\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`caption\` text,
  	\`author\` text,
  	\`owner_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric,
  	\`sizes_thumbnail_url\` text,
  	\`sizes_thumbnail_width\` numeric,
  	\`sizes_thumbnail_height\` numeric,
  	\`sizes_thumbnail_mime_type\` text,
  	\`sizes_thumbnail_filesize\` numeric,
  	\`sizes_thumbnail_filename\` text,
  	FOREIGN KEY (\`owner_id\`) REFERENCES \`guests\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`photos_owner_idx\` ON \`photos\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`photos_updated_at_idx\` ON \`photos\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`photos_created_at_idx\` ON \`photos\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`photos_filename_idx\` ON \`photos\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`photos_sizes_thumbnail_sizes_thumbnail_filename_idx\` ON \`photos\` (\`sizes_thumbnail_filename\`);`)
  await db.run(sql`CREATE TABLE \`messages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`body\` text NOT NULL,
  	\`private\` integer DEFAULT false,
  	\`author\` text,
  	\`owner_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`owner_id\`) REFERENCES \`guests\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`messages_owner_idx\` ON \`messages\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`messages_updated_at_idx\` ON \`messages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`messages_created_at_idx\` ON \`messages\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`quiz_questions_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	\`is_correct\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`quiz_questions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`quiz_questions_options_order_idx\` ON \`quiz_questions_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`quiz_questions_options_parent_id_idx\` ON \`quiz_questions_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`quiz_questions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`question\` text NOT NULL,
  	\`order\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`quiz_questions_updated_at_idx\` ON \`quiz_questions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`quiz_questions_created_at_idx\` ON \`quiz_questions\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`quiz_answers\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`guest_id\` integer NOT NULL,
  	\`question_id\` integer NOT NULL,
  	\`choice\` numeric NOT NULL,
  	\`correct\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`guest_id\`) REFERENCES \`guests\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`question_id\`) REFERENCES \`quiz_questions\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`quiz_answers_guest_idx\` ON \`quiz_answers\` (\`guest_id\`);`)
  await db.run(sql`CREATE INDEX \`quiz_answers_question_idx\` ON \`quiz_answers\` (\`question_id\`);`)
  await db.run(sql`CREATE INDEX \`quiz_answers_updated_at_idx\` ON \`quiz_answers\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`quiz_answers_created_at_idx\` ON \`quiz_answers\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`guest_question_idx\` ON \`quiz_answers\` (\`guest_id\`,\`question_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`guests_id\` integer,
  	\`photos_id\` integer,
  	\`messages_id\` integer,
  	\`quiz_questions_id\` integer,
  	\`quiz_answers_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`guests_id\`) REFERENCES \`guests\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`photos_id\`) REFERENCES \`photos\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`messages_id\`) REFERENCES \`messages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`quiz_questions_id\`) REFERENCES \`quiz_questions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`quiz_answers_id\`) REFERENCES \`quiz_answers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_guests_id_idx\` ON \`payload_locked_documents_rels\` (\`guests_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_photos_id_idx\` ON \`payload_locked_documents_rels\` (\`photos_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_messages_id_idx\` ON \`payload_locked_documents_rels\` (\`messages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_quiz_questions_id_idx\` ON \`payload_locked_documents_rels\` (\`quiz_questions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_quiz_answers_id_idx\` ON \`payload_locked_documents_rels\` (\`quiz_answers_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`guests_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`guests_id\`) REFERENCES \`guests\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_guests_id_idx\` ON \`payload_preferences_rels\` (\`guests_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`event_swatches\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`color\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`event\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`event_swatches_order_idx\` ON \`event_swatches\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`event_swatches_parent_id_idx\` ON \`event_swatches\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`event_schedule\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`time\` text,
  	\`title\` text NOT NULL,
  	\`detail\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`event\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`event_schedule_order_idx\` ON \`event_schedule\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`event_schedule_parent_id_idx\` ON \`event_schedule\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`event_meal_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`option\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`event\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`event_meal_options_order_idx\` ON \`event_meal_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`event_meal_options_parent_id_idx\` ON \`event_meal_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`event\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`open_access\` integer DEFAULT false,
  	\`quiz_status\` text DEFAULT 'off',
  	\`seating_published\` integer DEFAULT false,
  	\`partner1\` text DEFAULT 'Isabelle' NOT NULL,
  	\`partner2\` text DEFAULT 'Julian' NOT NULL,
  	\`date\` text DEFAULT '2027-05-15' NOT NULL,
  	\`time\` text DEFAULT '16:00' NOT NULL,
  	\`note\` text DEFAULT 'We can’t wait to celebrate with you.',
  	\`venue\` text DEFAULT 'The Glasshouse at Willow Bend',
  	\`address\` text DEFAULT '12 Orchard Lane, Willow Bend',
  	\`map_url\` text,
  	\`dress_code\` text DEFAULT 'Garden formal',
  	\`dress_note\` text DEFAULT 'Think deep greens, warm neutrals and soft golds. Flats or block heels are best, as the lawn is soft.',
  	\`rsvp_deadline\` text DEFAULT '2027-04-15',
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`DROP TABLE \`guests\`;`)
  await db.run(sql`DROP TABLE \`photos\`;`)
  await db.run(sql`DROP TABLE \`messages\`;`)
  await db.run(sql`DROP TABLE \`quiz_questions_options\`;`)
  await db.run(sql`DROP TABLE \`quiz_questions\`;`)
  await db.run(sql`DROP TABLE \`quiz_answers\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
  await db.run(sql`DROP TABLE \`event_swatches\`;`)
  await db.run(sql`DROP TABLE \`event_schedule\`;`)
  await db.run(sql`DROP TABLE \`event_meal_options\`;`)
  await db.run(sql`DROP TABLE \`event\`;`)
}
