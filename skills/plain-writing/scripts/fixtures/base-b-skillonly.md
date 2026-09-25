# dataflow

`dataflow` is a command-line tool. It copies tables between a PostgreSQL database and a BigQuery dataset.

`dataflow` reads a configuration file. The file names one source, one target, and a list of jobs. Each job copies one table.

For each job, `dataflow` reads the rows of the source table in batches. It writes each batch to a staging file in Cloud Storage. Then it loads the staging files into the target table.

A run is idempotent. `dataflow` replaces the target table at the end of a successful run. A repeated run gives the same target table.

Copies run in both directions. The `direction` key in the configuration file sets the direction of a job.

## Getting started

1. Make sure that Node.js is installed on the host.
2. Install the tool with `npm install -g dataflow`.
3. Print the version with `dataflow --version`.
4. Create a configuration file with `dataflow init > dataflow.yaml`.
5. Open `dataflow.yaml` in an editor.
6. Set `source.url` to the connection string of your PostgreSQL database.
7. Set `target.project` and `target.dataset` to your BigQuery project and dataset.
8. Set `staging.bucket` to a Cloud Storage bucket in the same region as the dataset.
9. Add one entry under `jobs` for each table that you copy.
10. Authenticate to Google Cloud with `gcloud auth application-default login`.
11. Test the configuration file with `dataflow check --config dataflow.yaml`.
12. Start the first copy with `dataflow run --config dataflow.yaml`.

`dataflow check` connects to both systems and reads the table definitions. It does not copy rows.

## Configuration

The configuration file is YAML. `dataflow` reads `dataflow.yaml` in the current directory when the `--config` flag is absent.

| Key | Type | Description |
|---|---|---|
| `source.url` | string | Connection string of the PostgreSQL database. |
| `source.schema` | string | Schema that holds the source tables. The default is `public`. |
| `target.project` | string | ID of the Google Cloud project. |
| `target.dataset` | string | Name of the BigQuery dataset. |
| `target.location` | string | Region of the dataset, for example `europe-west3`. |
| `staging.bucket` | string | Cloud Storage bucket for the staging files. |
| `staging.keep` | boolean | Keeps the staging files after the run. The default is `false`. |
| `batch_size` | integer | Number of rows in one batch. |
| `parallelism` | integer | Number of jobs that run at the same time. |
| `log_level` | string | One of `debug`, `info`, `warn`, `error`. |
| `jobs[].table` | string | Name of the source table. |
| `jobs[].target_table` | string | Name of the target table. The default is the name of the source table. |
| `jobs[].direction` | string | Either `pg-to-bq` or `bq-to-pg`. |
| `jobs[].where` | string | SQL condition that limits the rows of the job. |

Environment variables replace secrets in the file. `dataflow` expands `${VAR}` in every string value.

## Troubleshooting

**Connection timeout.** `dataflow` stops with `dial tcp: i/o timeout` when it cannot reach the PostgreSQL port (5432 by default).

1. Make sure that the host that runs `dataflow` can reach the PostgreSQL port. A firewall or a security group usually blocks it.
2. If the database is managed (Cloud SQL, RDS), make sure that the instance accepts connections from the IP of the host.

**Permission denied on the staging bucket.** `dataflow` stops with `storage: object write access denied` when the account cannot write to the bucket.

1. Print the active account with `gcloud auth list`.
2. Give the account the role `roles/storage.objectAdmin` on the bucket.
3. Start the run again.

**Type not supported.** `dataflow` stops with `unsupported column type` when a source column has no equivalent type in the target.

1. Read the name of the column in the error message.
2. Create a view in the source database. Cast the column to a text type in the view.
3. Set `jobs[].table` to the name of the view.
4. Start the run again.
