# Free Tier EC2 AZ Failover Script
# This script creates a free-tier eligible EC2 instance in us-east-1a and a standby instance in us-east-1b.
# It uses Amazon Linux 2 (free tier eligible) and optionally moves an Elastic IP for failover.
# Replace the placeholder values with your own VPC, subnet, and key pair information.

$profile = "dr-test"
$region = "us-east-1"
$primaryAz = "us-east-1a"
$secondaryAz = "us-east-1b"
$vpcId = "vpc-0c0cb968"                       # Replace with your VPC ID in us-east-1
$subnetIdA = "subnet-e189b8ca"     # Replace with a subnet in us-east-1a
$subnetIdB = "subnet-0b99777d"     # Replace with a subnet in us-east-1b
$keyName = "drtest"             # Replace with your EC2 key pair name

Write-Host "Using AWS CLI profile: $profile"

# Determine Amazon Linux 2 AMI ID for free-tier eligible instance
$amiId = aws ssm get-parameters --names /aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2 --query 'Parameters[0].Value' --output text --profile $profile --region $region
if (-not $amiId) {
    Write-Error "Unable to resolve Amazon Linux 2 AMI ID."
    exit 1
}
Write-Host "Using AMI: $amiId"

# Create a security group for SSH and HTTP access
$sgName = "free-tier-dr-sg"
$sgDescription = "Free tier DR test security group"
$existingSg = aws ec2 describe-security-groups --filters Name=group-name,Values=$sgName --query 'SecurityGroups[0].GroupId' --output text --profile $profile --region $region
if ($existingSg -eq "None") {
    Write-Host "Creating security group $sgName..."
    $sgId = aws ec2 create-security-group --group-name $sgName --description $sgDescription --vpc-id $vpcId --query 'GroupId' --output text --profile $profile --region $region
    Write-Host "Created security group: $sgId"
    aws ec2 authorize-security-group-ingress --group-id $sgId --ip-permissions @(
        @{IpProtocol="tcp"; FromPort=22; ToPort=22; IpRanges=@(@{CidrIp="0.0.0.0/0"})},
        @{IpProtocol="tcp"; FromPort=80; ToPort=80; IpRanges=@(@{CidrIp="0.0.0.0/0"})}
    ) --profile $profile --region $region | Out-Null
} else {
    $sgId = $existingSg
    Write-Host "Using existing security group: $sgId"
}

# Launch the primary instance in AZ us-east-1a
Write-Host "Launching primary t2.micro instance in $primaryAz..."
$primaryJson = aws ec2 run-instances --image-id $amiId --instance-type t2.micro --key-name $keyName --security-group-ids $sgId --subnet-id $subnetIdA --placement AvailabilityZone=$primaryAz --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=FreeTier-DR-Primary},{Key=DR-Test,Value=true}]' --query 'Instances[0].InstanceId' --output text --profile $profile --region $region
Write-Host "Primary instance ID: $primaryJson"

Write-Host "Waiting for primary instance to become running..."
aws ec2 wait instance-running --instance-ids $primaryJson --profile $profile --region $region
Write-Host "Primary instance is running."

# Allocate an Elastic IP for failover if needed
$allocationId = aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text --profile $profile --region $region
Write-Host "Allocated Elastic IP with allocation ID: $allocationId"

# Associate the EIP with the primary instance
$assocIdPrimary = aws ec2 associate-address --instance-id $primaryJson --allocation-id $allocationId --query 'AssociationId' --output text --profile $profile --region $region
Write-Host "Associated Elastic IP with primary instance: $assocIdPrimary"

# Create an AMI from the primary instance for standby launch
Write-Host "Creating AMI from primary instance..."
$amiName = "free-tier-dr-ami-$((Get-Date).ToString('yyyyMMddHHmmss'))"
$amiIdPrimary = aws ec2 create-image --instance-id $primaryJson --name $amiName --no-reboot --query 'ImageId' --output text --profile $profile --region $region
Write-Host "AMI created: $amiIdPrimary"

Write-Host "Waiting for AMI to become available..."
aws ec2 wait image-available --image-ids $amiIdPrimary --profile $profile --region $region
Write-Host "AMI is available."

# Launch the standby instance in AZ us-east-1b from the AMI
Write-Host "Launching standby t2.micro instance in $secondaryAz..."
$standbyJson = aws ec2 run-instances --image-id $amiIdPrimary --instance-type t2.micro --key-name $keyName --security-group-ids $sgId --subnet-id $subnetIdB --placement AvailabilityZone=$secondaryAz --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=FreeTier-DR-Standby},{Key=DR-Test,Value=true}]' --query 'Instances[0].InstanceId' --output text --profile $profile --region $region
Write-Host "Standby instance ID: $standbyJson"

Write-Host "Waiting for standby instance to become running..."
aws ec2 wait instance-running --instance-ids $standbyJson --profile $profile --region $region
Write-Host "Standby instance is running."

Write-Host "To fail over, disassociate the EIP from the primary instance and associate it with the standby instance."
Write-Host "Primary instance ID: $primaryJson"
Write-Host "Standby instance ID: $standbyJson"
Write-Host "Elastic IP allocation ID: $allocationId"
Write-Host "Failover command example:"
Write-Host "aws ec2 disassociate-address --association-id $assocIdPrimary --profile $profile --region $region"
Write-Host "aws ec2 associate-address --instance-id $standbyJson --allocation-id $allocationId --profile $profile --region $region"

Write-Host "Done. Primary and standby instances are now created for AZ failover testing."