# Technology Resiliency Testing

This project is a simple web application to manage disaster recovery (DR) resiliency testing scenarios.
It supports both within-region and cross-region test flows and includes options for manual testing and chaos tool guidance for AWS FIS, Azure Chaos Studio, GCP resilience testing, and Gremlin.

## Files
- `app.js` - Express server that serves the frontend and provides test simulation APIs.
- `package.json` - Node.js project configuration.
- `public/index.html` - User interface for selecting providers, test scope, mode, and chaos tools.
- `public/script.js` - Frontend logic for form submission and API interaction.
- `public/styles.css` - UI styling.

## Run locally
1. Install dependencies:

```powershell
npm install
```

2. Start the application:

```powershell
npm start
```

3. Open your browser at:

```
http://localhost:3000
```

## Environment variables

The app can validate cloud provider credentials from environment variables instead of CLI profiles.

- AWS: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optionally `AWS_SESSION_TOKEN`
- Azure: `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, optionally `AZURE_SUBSCRIPTION_ID`
- GCP: `GOOGLE_APPLICATION_CREDENTIALS`
- OCI: `OCI_CLI_CONFIG_FILE` and `OCI_CLI_PROFILE`, or `OCI_CLI_TENANCY`, `OCI_CLI_USER`, `OCI_CLI_FINGERPRINT`, `OCI_CLI_KEY_FILE`

### PowerShell example

```powershell
$env:AWS_ACCESS_KEY_ID = 'AKIA...'
$env:AWS_SECRET_ACCESS_KEY = '...' 
$env:AZURE_CLIENT_ID = '...' 
$env:AZURE_CLIENT_SECRET = '...' 
$env:AZURE_TENANT_ID = '...' 
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\service-account.json'
$env:OCI_CLI_CONFIG_FILE = 'C:\Users\me\.oci\config'
$env:OCI_CLI_PROFILE = 'DEFAULT'
```

## Features
- Choose cloud providers: AWS, Azure, GCP, Oracle Cloud
- Choose service types: EC2, RDS, S3, ELB, Virtual Machine, SQL Database, Cloud Storage, OCI DNS, etc.
- Enter the account ID and optionally a provider CLI profile for validation
- Support AWS, Azure, GCP, and OCI provider validation flows
- Select primary and secondary region/AZ failover targets for DR execution
- Select within-region or cross-region DR testing
- Select manual test mode or chaos tool mode
- Select multiple services at the same time for a combined resiliency test
- Get guidance for AWS FIS (see https://aws.amazon.com/fis/), Azure Chaos Studio, GCP resilience testing, and Gremlin chaos tests
- Include DNS failover recovery scenarios with AWS Route 53, Azure DNS, GCP Cloud DNS, and OCI DNS
- See a simulated result with step-by-step actions

## Notes
- This application is a prototype for DR testing workflows.
- Actual FIS and Gremlin integration is not implemented; the app provides guidance and simulated workflow steps.
- Use it as a starting point for adding real API integrations and test orchestration.
