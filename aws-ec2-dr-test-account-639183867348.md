# AWS EC2 DR Test Runbook

Account: `639183867348`
Primary region: `us-east-1`
Secondary region: `us-west-1`

## Objective
Create and validate a single EC2 instance recovery path within `us-east-1` (AZ failover) and across `us-west-1` (region failover).

## Prerequisites
- AWS Console or CLI access to account `639183867348`
- IAM permissions for:
  - EC2: RunInstances, CreateImage, CreateSnapshot, DescribeInstances, CreateTags, TerminateInstances
  - IAM: PassRole
  - EC2 AMI copy across regions
  - Route 53: ChangeResourceRecordSets (if using DNS failover)
- Existing VPC/subnets in both regions or permission to create them
- Security group allowing required application ports and SSH for validation
- Optional: Route 53 hosted zone for application DNS

## Test assumptions
- The primary instance will be launched in `us-east-1`.
- The within-region test uses a second AZ in `us-east-1`.
- The cross-region test uses a standby instance in `us-west-1` created from an AMI copied from `us-east-1`.
- The application can be validated using an HTTP endpoint or a simple connectivity test.

## Step 0: Define test parameters
- Instance name: `DR-Test-Instance`
- AMI base: choose a supported Linux/Windows AMI for the workload
- Instance type: `t3.medium` (or appropriate for your workload)
- Primary AZ: `us-east-1a`
- Standby AZ: `us-east-1b` (or another AZ separate from the primary)
- Secondary region AZ: choice in `us-west-1`, e.g. `us-west-1a`
- Security group: allow required ports (SSH 22, HTTP 80, HTTPS 443, application ports)
- Tag key: `DR-Test` with value `true`

## Phase 1: Create the primary EC2 instance in us-east-1

### 1. Launch primary instance
1. Open AWS Console, switch to `us-east-1`.
2. Go to EC2 > Instances > Launch instances.
3. Choose the AMI and instance type.
4. Select VPC and subnet in `us-east-1a`.
5. Attach a suitable IAM role if needed.
6. Configure storage as required.
7. Add tags:
   - `Name = DR-Test-Instance`
   - `DR-Test = true`
8. Select or create a security group that allows validation traffic.
9. Launch instance.

### 2. Validate the primary instance
- Confirm the instance enters `running` status.
- Verify connectivity:
  - SSH/RDP access
  - Application endpoint responds
- Note the instance ID and private/public IP.

### 3. Create an AMI and snapshots
1. Select the running instance.
2. Actions > Image and templates > Create image.
3. Give it a name such as `DR-Test-Instance-AMI-us-east-1`.
4. Create the image and wait until it becomes available.
5. Confirm EBS snapshots exist for attached volumes.

## Phase 2: Within-region DR test in us-east-1

### 1. Prepare standby infrastructure in another AZ
1. Launch a new EC2 instance from the AMI in `us-east-1b`.
2. Apply the same security group, IAM role, and tags.
3. Ensure it is in the same VPC if internal networking validation is required.

### 2. Test failover
Option A: Elastic IP failover
- Allocate a new Elastic IP in `us-east-1`.
- Associate it to the primary instance.
- After standby is ready, disassociate from primary and associate with standby.

Option B: Route 53 or internal DNS update
- If using Route 53, point the test record to the standby instance IP.
- If using load balancer, register the standby instance into the target group and optionally deregister the primary instance.

### 3. Validate standby instance
- Confirm the standby instance is reachable.
- Run the same application checks.
- Verify logs and monitoring show healthy status.
- If applicable, validate data access and application behavior.

### 4. Roll back within-region
- Return the Elastic IP or DNS record back to the primary instance.
- Optionally terminate the standby instance if it was only for testing.
- Confirm the primary instance is healthy and traffic flow is restored.

### 5. Success criteria for within-region test
- Standby instance is operational in another AZ.
- Application request succeeds through the failover path.
- Failover completes within the target RTO.
- No data loss beyond acceptable RPO.
- Monitoring and logs show normal recovery.

## Phase 3: Cross-region DR test to us-west-1

### 1. Copy the AMI to us-west-1
Using CLI:

```powershell
aws ec2 copy-image --source-region us-east-1 --source-image-id ami-XXXXXXXXXXXXXXX --name "DR-Test-Instance-AMI-us-west-1" --region us-west-1
```

### 2. Create standby VPC/network in us-west-1
- Ensure a VPC, subnet, and security group exist in `us-west-1`.
- The security group should mirror the primary rules for the test.

### 3. Launch the standby instance in us-west-1
- Launch from the copied AMI.
- Use the same instance type and security group rules.
- Tag it with `Name = DR-Test-Instance-DR` and `DR-Test = true`.

### 4. Validate standby region instance
- Confirm the instance reaches `running`.
- Verify SSH/RDP or application endpoint.
- If using an internal application endpoint, validate from a permitted source.

### 5. Fail traffic across regions
Option A: Route 53 failover
- Create a failover record set or update the DNS record to the us-west-1 instance IP.
- Use a low TTL for the test record.

Option B: Application or client-side redirect
- Point your test client to the us-west-1 endpoint.

### 6. Validate cross-region recovery
- Confirm application behavior from `us-west-1` instance.
- Verify data access and any stateful operations.
- Confirm the new region's instance health and monitoring.

### 7. Roll back cross-region
- Re-point DNS or traffic back to the `us-east-1` primary instance.
- Terminate or keep the us-west-1 standby for future DR readiness.
- Ensure the primary region is fully restored.

### 8. Success criteria for cross-region test
- Standby instance in `us-west-1` is available and healthy.
- Traffic can be redirected successfully across regions.
- Application validation succeeds in the secondary region.
- Data integrity is acceptable.

## Reporting and cleanup
- Record test timestamps for each phase.
- Document any issues and corrective actions.
- Verify and remove temporary resources if they are no longer needed:
  - Standby instance(s)
  - Elastic IPs used only for the test
  - Temporary DNS changes
- Retain AMI and snapshots for repeatable future tests.

## Notes
- This runbook assumes a simple single-instance workload. For production applications, repeat similar steps for load balancers, Auto Scaling groups, databases, and multi-tier dependencies.
- If you need, I can also provide the exact CLI commands for launching the instance, creating the AMI, and copying the image across regions.
