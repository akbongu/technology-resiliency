const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { fromIni } = require('@aws-sdk/credential-providers');
const { DefaultAzureCredential } = require('@azure/identity');
const { SubscriptionClient } = require('@azure/arm-subscriptions');
const { GoogleAuth } = require('google-auth-library');
const common = require('oci-common');
const identity = require('oci-identity');

function hasAwsEnvCredentials() {
  return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

function hasAzureEnvCredentials() {
  return Boolean(process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID);
}

function hasGcpEnvCredentials() {
  return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_SERVICE_ACCOUNT_KEY);
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
        return validateOciEnvCredentials(profile);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  throw new Error('profile or environment credentials are required.');
}

async function validateAwsProfile(profile, region) {
  const client = new STSClient({
    region,
    credentials: fromIni({ profile })
  });
  const response = await client.send(new GetCallerIdentityCommand({}));
  return { provider: 'aws', profile, accountId: response.Account };
}

async function validateAwsEnvCredentials(region) {
  const client = new STSClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN
    }
  });
  const response = await client.send(new GetCallerIdentityCommand({}));
  return { provider: 'aws', profile: null, accountId: response.Account };
}

async function validateAzureProfile(profile) {
  const credential = new DefaultAzureCredential();
  const client = new SubscriptionClient(credential);

  if (profile) {
    try {
      const subscription = await client.subscriptions.get(profile);
      return { provider: 'azure', profile, accountId: subscription.subscriptionId };
    } catch {
      const subscriptions = [];
      for await (const sub of client.subscriptions.list()) {
        if (sub.subscriptionId === profile || sub.displayName === profile) {
          return { provider: 'azure', profile, accountId: sub.subscriptionId };
        }
        subscriptions.push(sub);
      }
      if (subscriptions.length === 0) {
        throw new Error('Unable to validate Azure subscription profile.');
      }
    }
  }

  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  if (subscriptionId) {
    try {
      const subscription = await client.subscriptions.get(subscriptionId);
      return { provider: 'azure', profile: null, accountId: subscription.subscriptionId };
    } catch {
      // fallback to available subscriptions
    }
  }

  for await (const sub of client.subscriptions.list()) {
    return { provider: 'azure', profile: null, accountId: sub.subscriptionId };
  }

  throw new Error('No Azure subscriptions were found for the configured credentials.');
}

async function validateAzureEnvCredentials() {
  return validateAzureProfile(null);
}

async function validateGcpProfile(profile) {
  return validateGcpEnvCredentials();
}

async function validateGcpEnvCredentials() {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const keyJson = process.env.GCP_SERVICE_ACCOUNT_KEY;

  if (!keyFile && !keyJson) {
    throw new Error('GCP environment credential file path or service account JSON is required.');
  }

  const options = {
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  };

  if (keyFile) {
    options.keyFile = keyFile;
  } else {
    options.credentials = typeof keyJson === 'string' ? JSON.parse(keyJson) : keyJson;
  }

  const auth = new GoogleAuth(options);
  await auth.getClient();
  const projectId = await auth.getProjectId();

  return { provider: 'gcp', profile: null, accountId: projectId };
}

async function validateOciProfile(profile) {
  return validateOciEnvCredentials(profile);
}

async function validateOciEnvCredentials(profile) {
  const configFile = process.env.OCI_CLI_CONFIG_FILE;
  const cliProfile = profile || process.env.OCI_CLI_PROFILE || 'DEFAULT';
  const tenancyId = process.env.OCI_CLI_TENANCY;

  if (!configFile) {
    throw new Error('OCI config file path is required for SDK credential validation.');
  }

  const provider = new common.ConfigFileAuthenticationDetailsProvider(configFile, cliProfile);
  const client = new identity.IdentityClient({ authenticationDetailsProvider: provider });

  if (!tenancyId) {
    throw new Error('OCI tenancy ID is required via OCI_CLI_TENANCY.');
  }

  const response = await client.getTenancy({ tenancyId });
  return { provider: 'oci', profile: null, accountId: response.tenancy?.id || tenancyId };
}

module.exports = {
  validateProviderProfile,
  hasEnvCredentials
};
