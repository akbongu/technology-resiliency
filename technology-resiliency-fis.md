# AWS FIS-Based DR Testing Guide

## Overview
AWS Fault Injection Simulator (FIS) is a powerful tool for exercising within-region resiliency and recovery behavior.
Use FIS to simulate infrastructure failures, validate application failover, and confirm that your recovery process works before you perform controlled failover or cross-region DR tests.

## When to use FIS
- Within-region AZ failure tests
- EC2 instance failure simulations
- Load balancer target removal and traffic interruption
- Resilience validation for application recovery logic

## What FIS does well
- Stops or reboots selected EC2 instances safely
- Detaches Elastic Network Interfaces (ENIs)
- Removes targets from ALB/NLB target groups
- Simulates degraded service conditions without causing a full region outage

## What FIS does not do
- Cross-region failover orchestration
- Secondary region AMI copy and launch
- Route 53 traffic switch across regions
- Full DR automation outside the experiment scope

## Prerequisites
1. AWS account access in `us-east-1`.
2. IAM role for FIS with an appropriate trust policy.
3. Target EC2 instance(s) tagged for the experiment.
4. Optional: application health checks and monitoring endpoints.

## Required IAM role for FIS
Create a role named `AWSFISRole` or similar with this trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "fis.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Attach a policy that allows the actions below for the target resources:
- `ec2:StopInstances`
- `ec2:RebootInstances`
- `ec2:DescribeInstances`
- `elasticloadbalancing:DeregisterTargets`
- `elasticloadbalancing:RegisterTargets`
- `cloudwatch:DescribeAlarms`

A minimal managed policy example:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:StopInstances",
        "ec2:RebootInstances",
        "ec2:DescribeInstances",
        "elasticloadbalancing:DeregisterTargets",
        "elasticloadbalancing:RegisterTargets",
        "cloudwatch:DescribeAlarms"
      ],
      "Resource": "*"
    }
  ]
}
```

## Example FIS experiment template for EC2 stop

1. Tag your primary instance with `DR-Test=Primary`.
2. Create this JSON template file locally as `fis-ec2-az-failover.json`:

```json
{
  "description": "Simulate an AZ-level EC2 failure for DR validation.",
  "targets": {
    "primaryInstances": {
      "resourceType": "aws:ec2:instance",
      "resourceTags": {
        "DR-Test": "Primary"
      }
    }
  },
  "actions": {
    "stopInstances": {
      "actionId": "aws:ec2:stop-instances",
      "description": "Stop target EC2 instances to simulate failure.",
      "parameters": {
        "instanceIds": "${primaryInstances}"
      }
    }
  },
  "roleArn": "arn:aws:iam::<ACCOUNT_ID>:role/AWSFISRole",
  "stopConditions": [
    {
      "source": "aws:cloudwatch:alarm",
      "value": "arn:aws:cloudwatch:<REGION>:<ACCOUNT_ID>:alarm:<ALARM_NAME>"
    }
  ]
}
```

3. Create the experiment template:

```powershell
aws fis create-experiment-template `
  --cli-input-json file://fis-ec2-az-failover.json `
  --region us-east-1 `
  --profile dr-test
```

4. Start the experiment:

```powershell
aws fis start-experiment `
  --experiment-template-id <TEMPLATE_ID> `
  --region us-east-1 `
  --profile dr-test
```

5. Monitor the experiment with:

```powershell
aws fis get-experiment --id <EXPERIMENT_ID> --region us-east-1 --profile dr-test
```

## Example FIS experiment template for ALB target removal

This simulates traffic disruption while keeping the instance running.

```json
{
  "description": "Deregister a target from an ALB target group for DR validation.",
  "targets": {
    "appTargets": {
      "resourceType": "aws:elasticloadbalancing:targetgroup",
      "resourceTags": {
        "DR-Test": "AppTargetGroup"
      }
    }
  },
  "actions": {
    "deregisterTargets": {
      "actionId": "aws:elasticloadbalancing:deregister-targets",
      "description": "Deregister a target from the target group.",
      "parameters": {
        "targetGroupArn": "${appTargets}",
        "targets": "[{\"Id\":\"<INSTANCE_ID>\"}]"
      }
    }
  },
  "roleArn": "arn:aws:iam::<ACCOUNT_ID>:role/AWSFISRole"
}
```

## Validation steps for FIS tests
- Confirm the application health check returns expected failure/ recovery behavior.
- Ensure monitoring alerts trigger and notify the team.
- Verify the system fails over to standby resources if configured.
- Confirm the experiment stops cleanly and the environment recovers.

## Cross-region DR guidance
Use FIS for in-region AZ or instance failure simulation only.
For full cross-region testing, use FIS results as a validation input and perform these additional steps:
- Copy the primary AMI from `us-east-1` to `us-west-1`.
- Launch the secondary standby instance in `us-west-1`.
- Use Route 53 or Elastic IP failover to reroute traffic.
- Validate the application in the secondary region.
- Roll back traffic to `us-east-1` and resume normal operation.

## Notes
- FIS experiments are best used in non-production or controlled production resilience testing windows.
- Use low-impact scenarios first, then increase failure severity after the environment proves resilient.
- Always have a rollback plan available before starting an experiment.
