# dataflow

`dataflow` is a command-line tool. It copies tables between Postgres and BigQuery. One command copies one table in one direction.

The tool works in three steps. First, it reads the schema of the source table and maps each column type to a target type. Second, it writes the rows as newline-delimited JSON files into a staging bucket on Google Cloud Storage. Third, it loads these files into the target table. A copy from BigQuery to Postgres uses the same staging bucket and the `COPY` command of Postgres.

`dataflow` copies data and column types only. It does not create indexes, constraints, or views on the target.

## Getting started

1. Install the tool: `go install github.com/example/dataflow@latest`.
2. Run `dataflow version` to make sure that the binary is on your path.
3. Run `dataflow init`. The command writes a template configuration to `dataflow.yaml`.
4. Open `dataflow.yaml`. Enter the connection details of the source and the target.
5. Set the environment variable `GOOGLE_APPLICATION_CREDENTIALS` to the path of your service account key file.
6. Run `dataflow check`. The command tests both connections and the access to the staging bucket.
7. Run `dataflow copy --table public.customers` to copy your first table.

Note: The first copy of a large table takes several minutes. The tool prints the number of copied rows every 10 seconds.

## Configuration

`dataflow` reads the file `dataflow.yaml` from the working directory. The flag `--config` gives a different path. Every key can also come from an environment variable with the prefix `DATAFLOW_`.

| Key | Value |
|---|---|
| `source.dsn` | The connection string of the Postgres source, for example `postgres://user@host:5432/db`. |
| `source.schema` | The default schema for a table name without a schema. The default value is `public`. |
| `target.project` | The ID of the Google Cloud project that holds the target dataset. |
| `target.dataset` | The name of the BigQuery dataset. The dataset must exist. |
| `staging.bucket` | The name of the Cloud Storage bucket for the JSON files. |
| `staging.prefix` | The object prefix inside the bucket. The default value is `dataflow/`. |
| `staging.keep` | A boolean value. With the value `true`, the tool keeps the staged files at the end of a copy. |
| `copy.mode` | One of `append`, `truncate`, or `replace`. See the paragraph below. |
| `copy.batch_size` | The number of rows per staged file. The default value is 50000. |
| `copy.parallelism` | The number of parallel readers on the source. The default value is 4. |
| `log.level` | One of `error`, `info`, or `debug`. The default value is `info`. |

The key `copy.mode` decides what happens to the rows in the target table. The mode `append` adds the new rows and keeps the old rows. The mode `truncate` erases all rows and keeps the table with its current schema. The mode `replace` erases the table and creates it again from the schema of the source.

## Troubleshooting

**The source read stops with `ERROR: permission denied for table customers`.**

The Postgres role in `source.dsn` has no read access to the table.

1. Connect to the source database as an administrator.
2. Run `GRANT SELECT ON public.customers TO dataflow_reader`.
3. Run `dataflow check --table public.customers` again.

**The staging step stops with `googleapi: Error 403: does not have storage.objects.create access`.**

The service account has no write access to the staging bucket.

1. Run `gcloud config list account` to find the active service account.
2. Make sure that this account is the account in `GOOGLE_APPLICATION_CREDENTIALS`.
3. Give the account the role `roles/storage.objectAdmin` on the bucket in `staging.bucket`.
4. Run `dataflow check` again.

**The load step stops with `Provided Schema does not match Table`.**

The columns of the source table are different from the columns of the target table. A new column on the source causes this failure in the mode `append` and in the mode `truncate`.

CAUTION: The mode `replace` erases the target table and all its rows. A query that reads the table during the copy gets no result.

1. Run `dataflow diff --table public.customers` to see the different columns.
2. If the target table has no other data source, run the copy again with `--mode replace`.
3. If other jobs write into the target table, add the new column in BigQuery by hand. Then run the copy again.
