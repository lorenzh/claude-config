# Retention Service

## Overview

The Retention Service is a robust, highly-configurable component that has been designed to
facilitate the automated enforcement of data retention policies across the entirety of the
Northwind data platform, ensuring that customer data which has exceeded its contractually
mandated retention window is reliably and efficiently purged in a manner that is fully
auditable. It leverages a declarative policy model, meaning that teams can simply express
their requirements in YAML without needing to write any code, which significantly reduces
the operational burden on downstream teams.

Under the hood, the service performs a nightly reconciliation pass in which it enumerates
all registered datasets, determines for each one whether any partitions have aged beyond
the applicable threshold, and subsequently schedules deletion tasks that are then executed
by a pool of workers; these workers are responsible for issuing the actual delete statements
and for emitting the corresponding audit events.

## Policy configuration

Policies should be placed in the `policies/` directory, and it is worth noting that each
policy file must contain a `dataset` key which uniquely identifies the dataset that the
policy is intended to govern. The `retention_days` field, which is required, specifies the
number of days for which records are to be retained prior to becoming eligible for deletion.
If a `grace_period_days` field is provided it will be added to the retention window, e.g. a
retention of 30 days combined with a grace period of 7 days would mean that records are
retained for a total of 37 days before they may be deleted.

It should be noted that policies are validated at load time and any policy which fails
validation will cause the service to refuse to start, which is intentional, as it is
generally considered preferable to fail fast rather than to silently apply an incorrect
policy that could potentially result in premature data loss.

## Operational considerations

Operators may wish to monitor the `retention_lag_hours` metric, which tends to be the most
useful leading indicator of problems. If the lag is observed to be increasing steadily over
a period of several hours this would typically suggest that the worker pool has become
saturated, in which case increasing `worker_concurrency` is usually the recommended course
of action, although care should be taken as setting this value too high may result in
excessive load being placed on the underlying database.

In the event that a deletion task fails repeatedly, it will be moved to a dead-letter queue,
from which it can be replayed manually once the underlying issue has been addressed.
