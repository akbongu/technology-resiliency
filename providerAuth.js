const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

async function validateProviderProfile(provider, profile, region) {
  if (!provider) {
    throw new Error('provider is required.');
  }
  if (!profile) {
    throw new Error('profile or configuration identifier is required.');
  }

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

async function validateAzureProfile(profile) {
  const args = ['account', 'show'];
  if (profile) {
    args.push('--subscription', profile);
  }
  args.push('--query', 'id', '-o', 'tsv');
  const { stdout } = await execFileAsync('az', args);
  return { provider: 'azure', profile, accountId: stdout.trim() };
}

async function validateGcpProfile(profile) {
  const args = ['config', 'get-value', 'account'];
  if (profile) {
    args.push('--configuration', profile);
  }
  const { stdout } = await execFileAsync('gcloud', args);
  return { provider: 'gcp', profile, accountId: stdout.trim() };
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

module.exports = {
  validateProviderProfile
};
