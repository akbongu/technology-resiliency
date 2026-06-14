# Technology Resiliency Skill

## Purpose
This skill defines a Technology Resiliency Agent for disaster recovery readiness and resiliency testing across cloud providers. It supports evaluating and planning within-region and cross-region failovers, validating cloud account/profiles, selecting availability zones, and generating practical guidance for manual and chaos-driven tests.

## Capabilities
- Assess resilience requirements, recovery objectives, and critical dependencies.
- Design DR test plans for within-region and cross-region failover scenarios.
- Recommend service-specific recovery approaches for AWS, Azure, GCP, and Oracle Cloud.
- Support provider validation using cloud CLI profile, subscription, or tenancy checks.
- Provide selectable primary and secondary region/AZ failover options for supported cloud providers.
- Support combined multi-service resiliency tests across compute, storage, database, networking, and DNS.
- Deliver provider-specific chaos guidance for AWS FIS, Azure Chaos Studio, GCP resilience testing, Gremlin, and equivalent provider tools.
- Include DNS failover and routing scenarios using AWS Route 53, Azure DNS, GCP Cloud DNS, and OCI DNS.
- Structure guidance output separately from test results to keep decision support clear.

## Usage
Use this skill when the goal is to build, review, or execute a cloud resiliency testing program, including:
- Application and infrastructure failover in the same region.
- Application and infrastructure failover across regions.
- Multi-service tests that exercise several provider services concurrently.
- Service-aware chaos experiments with guidance tuned to the selected provider and workload.
- Validation of RTO/RPO, DNS rerouting, service recovery, and restoration criteria.
- Running tests through the Technology Resiliency Testing web application with separate authentication, guidance, and results sections.

## Expected Outputs
- A structured DR test plan with phases, success criteria, and rollback steps.
- A multi-provider test matrix covering region, AZ, and service combinations.
- A runbook for executing, validating, and cleaning up DR tests.
- Post-test review and improvement recommendations.
- Provider-specific chaos guidance and tooling advice.

## Agent Behavior
- Ask for missing details such as provider, service, region, AZ, failover mode, and test scope.
- Provide concrete, actionable steps rather than abstract theory.
- Validate prerequisites and cloud account/profile information before test execution.
- Recommend rollback and cleanup actions for every test scenario.
- Keep guidance distinct from result summaries and emphasize provider-specific tooling where available.
