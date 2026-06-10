# Technology Resiliency DR Test Plan

## Goal
Validate disaster recovery readiness for critical systems by exercising both within-region and cross-region recovery paths. Ensure systems meet recovery time objective (RTO), recovery point objective (RPO), and operational acceptance criteria.

## Scope
- Within-region DR test: simulate failure of an availability zone, cluster, or application domain within the same AWS region.
- Cross-region DR test: simulate failure of primary region and fail over traffic, data, and operations to a secondary AWS region.

## Objectives
- Confirm failover procedures are repeatable.
- Verify data synchronization and integrity.
- Validate DNS and traffic routing behavior.
- Ensure monitoring and alerting continue in recovery state.
- Document deviations and corrective actions.

## Pre-Test Requirements
1. Define critical workloads and their dependencies.
2. Confirm RTO and RPO targets for each workload.
3. Verify replication and backup topology:
   - EBS snapshots / AMI copy
   - RDS read replica promotion or Aurora global DB failover
   - DynamoDB global tables or cross-region replication
   - S3 replication
   - EC2 AMI / Auto Scaling configuration
4. Review IAM permissions and access controls for failover operations.
5. Confirm secondary region readiness:
   - VPC, subnets, route tables
   - Security groups and NACLs
   - Bastion or admin access
   - Endpoint configurations
6. Prepare communication plan, change windows, and stakeholder notification channels.

## Test Plan Phases

### Phase 1: Preparation
- Document baseline architecture in both regions.
- Save infrastructure templates and deployment manifests.
- Take final backups or snapshots.
- Confirm health status of primary systems.
- Create a recovery checklist and assign team roles.

### Phase 2: Within-Region DR Test
1. Select an AZ or service component to failover.
2. Execute planned failure or disable the target component safely.
   - Example: stop primary EC2 instances or detach an AZ-specific load balancer.
   - Example: fail primary database node and promote standby.
3. Consider using AWS Fault Injection Simulator (FIS) to validate the failure mode.
   - FIS can stop or reboot EC2 instances, deregister targets, and simulate degraded service.
   - Use experiment templates for controlled failure injection and automated recovery validation.
4. Redirect traffic if required within the same region.
   - Update ALB/NLB target groups or route53 health checks.
5. Validate recovery:
   - Application availability from multiple clients.
   - Database write/read operations.
   - Service latency within acceptable thresholds.
   - Logs and metrics show traffic through recovered path.
6. Rollback to normal operation.
   - Re-enable original component.
   - Restore original routing and confirm system health.

### Phase 3: Cross-Region DR Test
1. Trigger failover sequence for secondary region.
   - Promote database replica or fail over Aurora Global Database.
   - Launch or verify standby application stacks in secondary region.
2. Switch traffic to secondary region.
   - Update Route 53 weighted or failover record sets.
   - Confirm DNS TTL allows timely convergence.
3. Validate operations in secondary region:
   - Application connectivity and transaction success.
   - Data accuracy between primary and secondary replicas.
   - Monitoring, logging, and alerting in secondary region.
4. Perform rollback or recovery of primary region.
   - Restore primary region services once issue/test completes.
   - Re-point DNS and data synchronization back to primary.

## Validation Criteria
- Within-region test passes if:
  - Critical application endpoints respond within target SLA.
  - No data loss beyond RPO.
  - Recovery completes within RTO.
  - Monitoring alerts are handled and documented.
- Cross-region test passes if:
  - Secondary region services operate correctly.
  - DNS failover correctly routes traffic.
  - Data replication is consistent.
  - Service-level checks succeed across tiers.

## Test Matrix
- Within-region
  - AZ failure simulation
  - Single service cluster failure
  - Multi-AZ database failover
- Cross-region
  - Database replica promotion
  - Application stack failover
  - Full DNS failover

## Post-Test Review
- Capture results and time metrics.
- Compare against RTO/RPO targets.
- Record issues, workarounds, and remediation steps.
- Update runbooks and architecture documentation.
- Schedule follow-up improvement actions.

## Runbook Template
1. Scope and objective
2. Roles and contacts
3. Pre-test checks
4. Test execution steps
5. Validation checks
6. Rollback steps
7. Post-test actions
8. Lessons learned

## Notes
- Keep tests scoped, controlled, and reversible.
- Prefer automation when possible, but confirm manual fallback procedures.
- Communicate clearly to stakeholders before and after each test.
