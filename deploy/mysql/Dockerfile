# MySQL for Render, with the schema baked in.
#
# Render has no managed MySQL — its first-party datastores are Postgres and Key
# Value. MySQL is therefore run here as a self-managed PRIVATE SERVICE: reachable
# only from other services in the same workspace, over Render's private network.
# That is a genuine security win (the database is never exposed to the internet)
# but it also means this is a database you operate: you patch it, and you own
# the backups. See docs/deployment.md.
#
# WHY THE SQL IS COPIED IN
#   The official mysql image runs every .sql file in /docker-entrypoint-initdb.d
#   exactly once, on first boot against an empty volume, in SORTED FILENAME order.
#   That ordering is the whole reason this works: the schema has a hard load
#   order, and the numeric prefixes already encode it.
#
#       01_schema.sql      the 19 tables
#       02, 03            comments only, no inserts
#       04_*_seed.sql      categories 1-5, genres, 2,934 titles
#       05_reference_data.sql   roles + the remaining categories  <- MUST be last of the 04s
#       06 .. 11          events, migrations, catalogues
#       07_synopsis_seed.sql    synopsis + short_synopsis, as UPDATEs  <- after every 04_*
#
#   05 has to follow every 04_* because those files insert categories with a plain
#   INSERT, and 05 upserts the same rows. Load it first and the 04 files fail on a
#   duplicate key. Sorted order happens to be correct order.
#
#   07_synopsis_seed.sql is pure UPDATEs, so it is order-dependent in the other
#   direction: it silently does nothing if the rows it targets have not been
#   inserted yet, and it does not error. That is why it sorts after every 04_* and
#   why its row count is worth checking against the 04 totals on a fresh load.
#
#   The consequence to know: this only runs on FIRST boot. Restarting or
#   redeploying will not re-apply it, because the volume is no longer empty. That
#   is the behaviour you want for a database, and it means a schema change is a
#   new numbered file plus a manual apply rather than something automatic.

FROM mysql:8.0

# Sorted by the numeric prefixes. Copied individually rather than as a glob so
# the order is visible in this file instead of hidden in a COPY -- the ordering
# is load-bearing.
COPY database/01_schema.sql                       /docker-entrypoint-initdb.d/01_schema.sql
COPY database/02_seed_data.sql                   /docker-entrypoint-initdb.d/02_seed_data.sql
COPY database/03_test_data.sql                   /docker-entrypoint-initdb.d/03_test_data.sql
COPY database/04_anime_seed.sql                  /docker-entrypoint-initdb.d/04_anime_seed.sql
COPY database/04_comics_seed.sql                 /docker-entrypoint-initdb.d/04_comics_seed.sql
COPY database/04_games_seed.sql                  /docker-entrypoint-initdb.d/04_games_seed.sql
COPY database/04_kpop_seed.sql                   /docker-entrypoint-initdb.d/04_kpop_seed.sql
COPY database/04_manga_seed.sql                  /docker-entrypoint-initdb.d/04_manga_seed.sql
COPY database/04_movies_seed.sql                 /docker-entrypoint-initdb.d/04_movies_seed.sql
COPY database/04_tvshows_seed.sql                /docker-entrypoint-initdb.d/04_tvshows_seed.sql
COPY database/05_reference_data.sql              /docker-entrypoint-initdb.d/05_reference_data.sql
COPY database/06_community_seed.sql              /docker-entrypoint-initdb.d/06_community_seed.sql
COPY database/07_submission_kind.sql             /docker-entrypoint-initdb.d/07_submission_kind.sql
COPY database/07_synopsis_seed.sql               /docker-entrypoint-initdb.d/07_synopsis_seed.sql
COPY database/08_supplied_art_seed.sql           /docker-entrypoint-initdb.d/08_supplied_art_seed.sql
COPY database/09_cosplay_pictures_catalog.sql    /docker-entrypoint-initdb.d/09_cosplay_pictures_catalog.sql
COPY database/10_merchandise_catalog.sql         /docker-entrypoint-initdb.d/10_merchandise_catalog.sql
COPY database/11_view_counts.sql                 /docker-entrypoint-initdb.d/11_view_counts.sql
