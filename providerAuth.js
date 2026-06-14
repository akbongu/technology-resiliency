const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

function hasAwsEnvCredentials() {
  return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

function hasAzureEnvCredentials() {
  return Boolean(process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID);
}

function hasGcpEnvCredentials() {
  return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

function hasOciEnvCredentials() {
  return Boolean(
    (process.env.OCI_CLI_CONFIG_FILE && process.env.OCI_CLI_PROFILE) ||
    (process.env.OCI_CLI_TENANCY && process.env.OCI_CLI_USER && process.env.OCI_CLI_FINGERPRINT && process.env.OCI_CLI_KEY_FILE)
  );
}

function hasEnvCredentials(provider) {
  switch (provider) {
    case 'aws':
      return hasAwsEnvCredentials();
    case 'azure':
      return hasAzureEnvCredentials();
    case 'gcp':
      return hasGcpEnvCredentials();
    case 'oci':
      return hasOciEnvCredentials();
    default:
      return false;
  }
}

async function validateProviderProfile(provider, profile, region) {
  if (!provider) {
    throw new Error('provider is required.');
  }

  if (profile) {
    switch (provider) {
      case 'aws':
        return validateAwsProfile(profile, region);
      case 'azure':
        return validateAzureProfile(profile);
      case 'gcp':
        return validateGcpProfile(profile);
      case 'oci':
        return validateOciProfile(profile);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  if (hasEnvCredentials(provider)) {
    switch (provider) {
      case 'aws':
        return validateAwsEnvCredentials(region);
      case 'azure':
        return validateAzureEnvCredentials();
      case 'gcp':
        return validateGcpEnvCredentials();
      case 'oci':
        return validateOciEnvCredentials();
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  throw new Error('profile or environment credentials are required.');
}

async function validateAwsProfile(profile, region) {
  const args = [
    'sts',
    'get-caller-identity',
    '--profile',
    profile,
    '--query',
    'Account',
    '--output',
    'text'
  ];
  if (region) {
    args.splice(2, 0, '--region', region);
  }

  const { stdout } = await execFileAsync('aws', args);
  return { provider: 'aws', profile, accountId: stdout.trim() };
}

async function validateAwsEnvCredentials(region) {
  const args = ['sts', 'get-caller-identity'];
  if (region) {
    args.push('--region', region);
  }
  args.push('--query', 'Account', '--output', 'text');

  const { stdout } = await execFileAsync('aws', args);
  return { provider: 'aws', profile: null, accountId: stdout.trim() };
}

async function validateAzureProfile(profile) {
  const args = ['account', 'show'];
  if (profile) {
    args.push('--subscription', profile);
  }
  args.push('--query', 'id', '-o', 'tsv');
  const { stdout } = await execFileAsync('az', args);
  return { provider: 'azure', profile, accountId: stdout.trim() };
}

async function validateAzureEnvCredentials() {
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const tenantId = process.env.AZURE_TENANT_ID;
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Azure environment credentials are incomplete.');
  }

  const loginArgs = ['login', '--service-principal', '--username', clientId, '--password', clientSecret, '--tenant', tenantId];
  if (subscriptionId) {
    loginArgs.push('--subscription', subscriptionId);
  }

  await execFileAsync('az', loginArgs);
  const args = ['account', 'show', '--query', 'id', '-o', 'tsv'];
  const { stdout } = await execFileAsync('az', args);
  return { provider: 'azure', profile: null, accountId: stdout.trim() };
}

async function validateGcpProfile(profile) {
  const args = ['config', 'get-value', 'account'];
  if (profile) {
    args.push('--configuration', profile);
  }
  const { stdout } = await execFileAsync('gcloud', args);
  return { provider: 'gcp', profile, accountId: stdout.trim() };
}

async function validateGcpEnvCredentials() {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile) {
    throw new Error('GCP environment credential file path is not set.');
  }

  await execFileAsync('gcloud', ['auth', 'activate-service-account', '--key-file', keyFile]);
  const { stdout } = await execFileAsync('gcloud', ['config', 'get-value', 'account']);
  return { provider: 'gcp', profile: null, accountId: stdout.trim() };
}

async function validateOciProfile(profile) {
  const args = ['os', 'ns', 'get', '--output', 'json'];
  if (profile) {
    args.push('--profile', profile);
  }
  const { stdout } = await execFileAsync('oci', args);
  const json = JSON.parse(stdout.trim());
  const namespace = json.data || json.value || null;
  return { provider: 'oci', profile, accountId: namespace || 'OCI namespace' };
}

async function validateOciEnvCredentials() {
  const args = ['os', 'ns', 'get', '--output', 'json'];

  if (process.env.OCI_CLI_CONFIG_FILE) {
    args.push('--config-file', process.env.OCI_CLI_CONFIG_FILE);
  }
  if (process.env.OCI_CLI_PROFILE) {
    args.push('--profile', process.env.OCI_CLI_PROFILE);
  }

  const { stdout } = await execFileAsync('oci', args);
  const json = JSON.parse(stdout.trim());
  const namespace = json.data || json.value || null;
  return { provider: 'oci', profile: null, accountId: namespace || 'OCI namespace' };
}

module.exports = {
  validateProviderProfile,
  hasEnvCredentials
};
