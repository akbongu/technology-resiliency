# AWS EC2 DR Resource Creation Script
# Fill in the placeholders and run this script in your own terminal.
# Do not run this with credentials shared in chat; use your own secure local environment.

# Set your AWS CLI profile and region
$profile = "dr-test"
$primaryRegion = "us-east-1"
$secondaryRegion = "us-west-1"
$primaryAz = "us-east-1a"
$secondaryAz = "us-east-1b"

# Replace these values with your actual environment details
$amiId = "ami-0123456789abcdef0"           # base AMI in us-east-1
$keyName = "your-key-pair"
$vpcId = "vpc-0123456789abcdef0"
$subnetIdPrimary = "subnet-0123456789abcdef0"   # us-east-1a
$subnetIdStandbyAZ = "subnet-0abcdef1234567890" # us-east-1b
$securityGroupName = "DR-Test-SG"
$securityGroupDescription = "Security group for EC2 DR test"

Write-Host "Creating security group in $primaryRegion..."
$sg = aws ec2 create-security-group --group-name $securityGroupName --description $securityGroupDescription --vpc-id $vpcId --region $primaryRegion --profile $profile | ConvertFrom-Json
$securityGroupId = $sg.GroupId
Write-Host "Created security group: $securityGroupId"

Write-Host "Authorizing ingress rules..."
aws ec2 authorize-security-group-ingress --group-id $securityGroupId --ip-permissions @(
    @{IpProtocol="tcp"; FromPort=22; ToPort=22; IpRanges=@(@{CidrIp="0.0.0.0/0"})},
    @{IpProtocol="tcp"; FromPort=80; ToPort=80; IpRanges=@(@{CidrIp="0.0.0.0/0"})},
    @{IpProtocol="tcp"; FromPort=443; ToPort=443; IpRanges=@(@{CidrIp="0.0.0.0/0"})}
) --region $primaryRegion --profile $profile | Out-Null
Write-Host "Ingress rules added to $securityGroupId"

Write-Host "Launching primary EC2 instance in $primaryRegion / $primaryAz..."
$primaryInstance = aws ec2 run-instances --image-id $amiId --instance-type t3.medium --key-name $keyName --security-group-ids $securityGroupId --subnet-id $subnetIdPrimary --placement "AvailabilityZone=$primaryAz" --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=DR-Test-Primary},{Key=DR-Test,Value=true}]' --region $primaryRegion --profile $profile | ConvertFrom-Json
$primaryInstanceId = $primaryInstance.Instances[0].InstanceId
Write-Host "Primary instance launched: $primaryInstanceId"

Write-Host "Waiting for primary instance to become running..."
aws ec2 wait instance-running --instance-ids $primaryInstanceId --region $primaryRegion --profile $profile
Write-Host "Primary instance is now running."

Write-Host "Creating AMI from primary instance..."
$primaryAmi = aws ec2 create-image --instance-id $primaryInstanceId --name "DR-Test-AMI-us-east-1-$(Get-Date -Format yyyyMMddHHmmss)" --no-reboot --region $primaryRegion --profile $profile | ConvertFrom-Json
$primaryAmiId = $primaryAmi.ImageId
Write-Host "AMI creation started: $primaryAmiId"

Write-Host "Waiting for AMI availability..."
aws ec2 wait image-available --image-ids $primaryAmiId --region $primaryRegion --profile $profile
Write-Host "AMI is available: $primaryAmiId"

Write-Host "Launching standby EC2 instance in same region $primaryRegion / $secondaryAz..."
$standbyAzInstance = aws ec2 run-instances --image-id $primaryAmiId --instance-type t3.medium --key-name $keyName --security-group-ids $securityGroupId --subnet-id $subnetIdStandbyAZ --placement "AvailabilityZone=$secondaryAz" --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=DR-Test-Standby-AZ},{Key=DR-Test,Value=true}]' --region $primaryRegion --profile $profile | ConvertFrom-Json
$standbyAzInstanceId = $standbyAzInstance.Instances[0].InstanceId
Write-Host "Standby AZ instance launched: $standbyAzInstanceId"

Write-Host "Waiting for standby instance to become running..."
aws ec2 wait instance-running --instance-ids $standbyAzInstanceId --region $primaryRegion --profile $profile
Write-Host "Standby AZ instance is now running."

Write-Host "Copying AMI to secondary region $secondaryRegion..."
$copiedAmi = aws ec2 copy-image --source-region $primaryRegion --source-image-id $primaryAmiId --name "DR-Test-AMI-us-west-1-$(Get-Date -Format yyyyMMddHHmmss)" --region $secondaryRegion --profile $profile | ConvertFrom-Json
$copiedAmiId = $copiedAmi.ImageId
Write-Host "Copied AMI ID in $secondaryRegion: $copiedAmiId"

Write-Host "Waiting for copied AMI availability..."
aws ec2 wait image-available --image-ids $copiedAmiId --region $secondaryRegion --profile $profile
Write-Host "Copied AMI is available: $copiedAmiId"

Write-Host "Please ensure you have a matching VPC/subnet/security group in $secondaryRegion before launching the region standby instance."
Write-Host "Script complete for primary and within-region standby creation. Secondary region AMI copy completed."
Write-Host "Next step: create or reuse network resources in $secondaryRegion and launch the standby instance there."

Write-Host "Summary:"
Write-Host "Primary Instance ID: $primaryInstanceId"
Write-Host "Standby AZ Instance ID: $standbyAzInstanceId"
Write-Host "Primary AMI ID: $primaryAmiId"
Write-Host "Copied AMI ID in $secondaryRegion: $copiedAmiId"
