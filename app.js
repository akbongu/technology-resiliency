const express = require('express');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { validateProviderProfile } = require('./providerAuth');
const execFileAsync = promisify(execFile);
const app = express();
const port = process.env.PORT || 3000;

const providers = [
  {
    id: 'aws',
    name: 'AWS',
    services: ['EC2', 'RDS', 'S3', 'ELB', 'Route 53'],
    regions: ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2']
  },
  {
    id: 'azure',
    name: 'Azure',
    services: ['Virtual Machine', 'SQL Database', 'Storage Account', 'Load Balancer', 'Azure DNS'],
    regions: ['eastus', 'westus', 'centralus']
  },
  {
    id: 'gcp',
    name: 'GCP',
    services: ['Compute Engine', 'Cloud SQL', 'Cloud Storage', 'Cloud Load Balancing', 'Cloud DNS'],
    regions: ['us-east1', 'us-west1', 'us-central1']
  },
  {
    id: 'oci',
    name: 'Oracle Cloud',
    services: ['Compute', 'Autonomous DB', 'Object Storage', 'Load Balancer', 'OCI DNS'],
    regions: ['us-ashburn-1', 'us-phoenix-1', 'eu-frankfurt-1']
  }
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/api/providers', (req, res) => {
  res.json({ providers });
});

app.post('/api/test', async (req, res) => {
  const {
    provider,
    service,
    testScope,
    mode,
    chaosTool,
    providerProfile,
    accountId,
    primaryRegion,
    secondaryRegion,
    primaryAz,
    secondaryAz,
    instanceId,
    description
  } = req.body;

  if (!provider || !service || (Array.isArray(service) && service.length === 0) || !testScope || !mode || !primaryRegion || !primaryAz) {
    return res.status(400).json({ error: 'provider, service, testScope, mode, primaryRegion, and primaryAz are required.' });
  }

  if (testScope === 'cross-region' && !secondaryRegion) {
    return res.status(400).json({ error: 'secondaryRegion is required for cross-region tests.' });
  }

  let effectiveAccountId = accountId || null;
  if (provider === 'aws' && !effectiveAccountId && !providerProfile) {
    return res.status(400).json({ error: 'AWS provider requires either accountId or providerProfile to be provided.' });
  }

  if (provider === 'aws' && providerProfile && !effectiveAccountId) {
    try {
      const validation = await validateProviderProfile(provider, providerProfile, primaryRegion);
      effectiveAccountId = validation.accountId;
    } catch (error) {
      return res.status(400).json({ error: `AWS CLI profile validation failed: ${error.message}` });
    }
  }

  const testId = `DR-${Date.now()}`;
  const result = {
    testId,
    provider,
    service,
    providerProfile: providerProfile || null,
    accountId: effectiveAccountId,
    testScope,
    mode,
    chaosTool: chaosTool || 'manual',
    primaryRegion,
    secondaryRegion: secondaryRegion || null,
    primaryAz,
    secondaryAz: secondaryAz || null,
    instanceId: instanceId || null,
    description: description || null,
    status: 'queued',
    steps: []
  };

  result.steps.push({
    title: 'Prepare test environment',
    detail: `Validate account/credentials ${effectiveAccountId || providerProfile || 'provided'} and the ${provider.toUpperCase()} ${service} configuration in ${primaryRegion} (${primaryAz}).`
  });

  if (testScope === 'within-region') {
    result.steps.push({
      title: 'Select standby resources',
      detail: `Fail over from ${primaryAz} to another AZ in ${primaryRegion}.` 
    });
  } else {
    result.steps.push({
      title: 'Select secondary region',
      detail: `Fail over from ${primaryAz} in ${primaryRegion} to ${secondaryAz || 'a selected AZ'} in ${secondaryRegion}.`
    });
  }

  const serviceLabel = Array.isArray(service) ? service.join(', ') : service;
  if (mode === 'manual') {
    result.steps.push({
      title: 'Execute manual DR test',
      detail: `Perform the chosen failover steps manually for ${provider.toUpperCase()} ${serviceLabel}.` }
    );
  } else {
    result.steps.push({
      title: `Execute chaos tool test: ${chaosTool}`,
      detail: `Trigger the configured chaos experiment using ${chaosTool} against ${provider.toUpperCase()} ${serviceLabel}.` }
    );
  }

  result.steps.push({
    title: 'Validate recovery',
    detail: 'Confirm application health, traffic routing, and data integrity after failover.'
  });
  result.steps.push({
    title: 'Rollback and cleanup',
    detail: 'Return traffic to the primary region if applicable and remove temporary test resources.'
  });
  result.status = 'complete';
  result.outcome = 'success';

  res.json(result);
});

app.post('/api/provider/validate', async (req, res) => {
  const { provider, profile, region } = req.body;
  if (!provider) {
    return res.status(400).json({ error: 'provider is required.' });
  }
  if (!profile) {
    return res.status(400).json({ error: 'profile or configuration identifier is required.' });
  }

  try {
    const result = await validateProviderProfile(provider, profile, region);
    return res.json(result);
  } catch (error) {
    res.status(400).json({ error: `${provider.toUpperCase()} validation failed: ${error.message}` });
  }
});

function getChaosServiceDescription(service) {
  const serviceLabel = Array.isArray(service) ? service.join(', ') : service;
  if (/ec2|compute engine|compute|virtual machine/i.test(serviceLabel)) {
    return 'compute instance or virtual machine';
  }
  if (/rds|cloud sql|autonomous db|database/i.test(serviceLabel)) {
    return 'database instance or cluster';
  }
  if (/s3|cloud storage|object storage/i.test(serviceLabel)) {
    return 'storage bucket or object storage resource';
  }
  if (/elb|load balancer|cloud load balancing|load balancer/i.test(serviceLabel)) {
    return 'load balancer and its target groups';
  }
  if (/route 53|azure dns|cloud dns|oci dns/i.test(serviceLabel)) {
    return 'DNS routing and health check configuration';
  }
  return 'selected service resources';
}

app.post('/api/chaos/guide', (req, res) => {
  const { tool, provider, service } = req.body;
  if (!tool || !provider || !service) {
    return res.status(400).json({ error: 'tool, provider, and service are required.' });
  }

  const serviceLabel = Array.isArray(service) ? service.join(', ') : service;
  const targetDescription = getChaosServiceDescription(serviceLabel);

  const guidance = {
    fis: {
      title: 'AWS FIS Test Guidance',
      steps: [
        'Use AWS Fault Injection Simulator (FIS) guided by the official reference: https://aws.amazon.com/fis/.',
        `Tag the target ${targetDescription} for the experiment.`,
        'Create or reuse an AWS FIS role with permissions for the selected resources and actions.',
        'Build an experiment template that simulates failure for the chosen target.',
        'Run the experiment and monitor application health and recovery.',
        'Review logs and recover the resource after the experiment completes.'
      ]
    },
    azureChaos: {
      title: 'Azure Chaos Studio Guidance',
      steps: [
        `Select the target ${targetDescription} and define the failure scenario.`,
        'Create or update an Azure Chaos Studio experiment with the selected resource.',
        'Assign the required permissions and service principal access.',
        'Run the experiment and monitor application and service recovery.',
        'Stop the experiment and review the impact for remediation planning.'
      ]
    },
    gcpChaos: {
      title: 'GCP Resilience Testing Guidance',
      steps: [
        `Select the target ${targetDescription} for the test.`,
        'Use GCP stress, VM restart, or load balancer failover scenarios as applicable.',
        'Monitor application health, networking, and data consistency during the event.',
        'Recover the service by restoring the target or rerouting traffic.',
        'Document the results and update the resiliency plan.'
      ]
    },
    gremlin: {
      title: 'Gremlin Chaos Test Guidance',
      steps: [
        `Choose the target ${targetDescription} and define the failure mode (CPU, network, shutdown).`,
        'Create a Gremlin attack for the selected service provider environment.',
        'Run the attack in a controlled window and monitor service resilience.',
        'Stop the attack, verify recovery and identify any gaps.',
        'Document the outcome and remediate detected issues.'
      ]
    }
  };

  const chaosToolKey = Object.keys(guidance).find((key) => key.toLowerCase() === tool.toLowerCase());
  const selected = chaosToolKey ? guidance[chaosToolKey] : null;
  if (!selected) {
    return res.status(400).json({ error: `Unsupported chaos tool: ${tool}` });
  }

  res.json({ ...selected, provider, service: serviceLabel });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Technology Resiliency Testing app running at http://localhost:${port}`);
});
