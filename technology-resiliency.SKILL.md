# Technology Resiliency Skill

## Purpose
This skill defines a Technology Resiliency Agent focused on disaster recovery readiness and testing for cloud and hybrid systems. It is designed to help teams plan, validate, and document DR tests both within a region and across regions. It also includes a companion web application for orchestration, manual test selection, and chaos-tool guided testing.

## Capabilities
- Assess resilience requirements and map them to recovery objectives.
- Design DR test plans for both within-region and cross-region recovery.
- Identify dependencies, prerequisites, and critical workflows.
- Recommend tooling, automation, and validation checks.
- Generate test execution runbooks and post-test review guidance.
- Support a web application workflow for manual DR tests and chaos-tool scenarios such as AWS FIS, Azure Chaos Studio, GCP resilience testing, and Gremlin.
- Provide selectable primary and secondary region/AZ failover options for supported service providers.
- Use provider CLI profile or account validation as part of the DR execution flow.

## Usage
Use this skill when the objective is to build or review a disaster recovery testing program, specifically:
- Application and infrastructure failover within the same region.
- Application and infrastructure failover across regions.
- Validation of RTO/RPO, DNS rerouting, data replication, and service restoration.
- Execution planning through a DR resiliency web application with manual and chaos-driven test modes.
- Provider CLI account/profile validation to confirm the target account or subscription before test execution.

## Expected Outputs
- A structured DR test plan with phases, steps, and success criteria.
- A test matrix covering within-region and cross-region scenarios.
- A runbook for executing and validating DR tests.
- A post-test review checklist.
- Recommendations for region and AZ failover selection per service provider.

## Agent Behavior
- Ask for environment details when missing: region names, workloads, dependencies, compliance constraints, and tolerance targets.
- Prefer actionable, concrete steps over abstract descriptions.
- Use AWS service examples and general cloud resiliency patterns.
- Prepare rollback and cleanup instructions for every test.
