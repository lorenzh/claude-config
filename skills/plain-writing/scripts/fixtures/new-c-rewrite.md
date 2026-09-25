# Retention Service

## What the service does

The Retention Service deletes customer data on the Northwind data platform. It deletes data that is older than the retention window in the customer contract. Every deletion is auditable.

Teams write their retention rules as a policy in YAML. Nobody writes code for a policy. This gives the downstream teams less operational work.

## How the service works

The service makes one reconciliation pass every night. First it lists all registered datasets. Then it finds the partitions that are older than the threshold of the dataset. A partition is one part of a dataset. It holds the records of one time span. For each of these partitions the service schedules a deletion task.

A pool of workers does the deletion tasks. A worker sends the delete statements to the database. A worker also writes the audit events.

## Policy configuration

The policy files are in the `policies/` directory. Each policy file must have a `dataset` key. This key names the one dataset that the policy governs.

Each policy file must also have a `retention_days` field. It gives the number of days that the service keeps a record. After these days the service can delete the record.

The `grace_period_days` field is optional. The service adds these days to the retention window. An example: `retention_days` is 30 and `grace_period_days` is 7. The service then keeps a record for 37 days before it can delete the record.

When the service loads a policy, it validates the policy. If one policy is not valid, the service does not start. This behavior is intentional. A wrong policy that runs silently can delete data too early.

## Operations

The `retention_lag_hours` metric shows a problem before the other metrics show it.

1. Monitor the `retention_lag_hours` metric.
2. If the lag increases steadily for several hours, increase `worker_concurrency`. A steady increase means that the worker pool has too much work.
3. If a deletion task fails many times, find the problem behind the failures. The service moves such a task to the dead-letter queue. The dead-letter queue holds the tasks that the service cannot do.
4. After you correct the problem, replay the task from the dead-letter queue by hand.

A high value of `worker_concurrency` puts too much load on the database.
