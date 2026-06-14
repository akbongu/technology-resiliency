const providerSelect = document.getElementById('provider');
const serviceSelect = document.getElementById('service');
const modeSelect = document.getElementById('mode');
const testScopeSelect = document.getElementById('testScope');
const providerProfileLabel = document.getElementById('providerProfileLabel');
const providerProfileLabelText = document.getElementById('providerProfileLabelText');
const providerProfileInput = document.getElementById('providerProfile');
const secondaryRegionLabel = document.getElementById('secondaryRegionLabel');
const primaryAzLabel = document.getElementById('primaryAzLabel');
const secondaryAzLabel = document.getElementById('secondaryAzLabel');
const chaosToolLabel = document.getElementById('chaosToolLabel');
const drForm = document.getElementById('drForm');
const resultPane = document.getElementById('resultPane');
const guidancePane = document.getElementById('guidancePane');
const chaosGuideButton = document.getElementById('chaosGuideButton');
const validateProfileButton = document.getElementById('validateProfileButton');
const primaryRegionSelect = document.getElementById('primaryRegion');
const secondaryRegionSelect = document.getElementById('secondaryRegion');
const primaryAzSelect = document.getElementById('primaryAz');
const secondaryAzSelect = document.getElementById('secondaryAz');
const chaosToolSelect = document.getElementById('chaosTool');
const providerCards = document.getElementById('providerCards');

let providers = [];

async function loadProviders() {
  const response = await fetch('/api/providers');
  const data = await response.json();
  providers = data.providers;
  providerSelect.innerHTML = providers
    .map((provider) => `<option value="${provider.id}">${provider.name}</option>`)
    .join('');

  updateServiceOptions();
  updateRegionOptions();
  updateProviderProfileLabel();
  updateChaosToolOptions();
  renderProviderCards();
  updateFormVisibility();
}

function renderProviderCards() {
  providerCards.innerHTML = providers
    .map((provider) => {
      const servicePreview = provider.services.slice(0, 2).join(', ');
      return `
        <div class="provider-card" data-provider="${provider.id}">
          <h3>${provider.name}</h3>
          <p>${servicePreview} ${provider.services.length > 2 ? `+ ${provider.services.length - 2} more` : ''}</p>
          <p><span class="tag">Regions</span> ${provider.regions.length}</p>
        </div>
      `;
    })
    .join('');

  const cards = providerCards.querySelectorAll('.provider-card');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      providerSelect.value = card.dataset.provider;
      updateServiceOptions();
      updateRegionOptions();
      updateProviderProfileLabel();
      updateChaosToolOptions();
      updateFormVisibility();
      highlightProviderCard();
    });
  });

  highlightProviderCard();
}

function highlightProviderCard() {
  const cards = providerCards.querySelectorAll('.provider-card');
  cards.forEach((card) => {
    card.classList.toggle('active', card.dataset.provider === providerSelect.value);
  });
}

function getRegionList(providerId) {
  const selected = providers.find((p) => p.id === providerId);
  return selected ? selected.regions : [];
}

function getAzList(region) {
  if (!region) return [];
  if (region.startsWith('us-east-1')) return ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e'];
  if (region.startsWith('us-east-2')) return ['us-east-2a', 'us-east-2b', 'us-east-2c'];
  if (region.startsWith('us-west-1')) return ['us-west-1a', 'us-west-1b', 'us-west-1c'];
  if (region.startsWith('us-west-2')) return ['us-west-2a', 'us-west-2b', 'us-west-2c'];
  if (region.startsWith('eastus')) return ['1', '2', '3'];
  if (region.startsWith('westus')) return ['1', '2', '3'];
  if (region.startsWith('centralus')) return ['1', '2', '3'];
  if (region.startsWith('us-east1')) return ['us-east1-b', 'us-east1-c', 'us-east1-d'];
  if (region.startsWith('us-west1')) return ['us-west1-a', 'us-west1-b', 'us-west1-c'];
  if (region.startsWith('us-central1')) return ['us-central1-a', 'us-central1-b', 'us-central1-c'];
  if (region.startsWith('us-ashburn') || region.startsWith('us-phoenix') || region.startsWith('eu-frankfurt')) return ['ad-1', 'ad-2', 'ad-3'];
  return ['zone-1', 'zone-2', 'zone-3'];
}

function getSelectedServices() {
  return Array.from(serviceSelect.selectedOptions).map((option) => option.value);
}

function setSelectOptions(select, values, includePlaceholder = false, selectedValue = null) {
  const options = values.map((value) => `<option value="${value}"${value === selectedValue ? ' selected' : ''}>${value}</option>`);
  select.innerHTML = `${includePlaceholder ? '<option value="">-- select --</option>' : ''}${options.join('')}`;
}

function updateServiceOptions() {
  const selected = providers.find((p) => p.id === providerSelect.value);
  if (!selected) return;
  serviceSelect.innerHTML = selected.services
    .map((service) => `<option value="${service}">${service}</option>`)
    .join('');
  if (serviceSelect.options.length > 0) {
    serviceSelect.selectedIndex = 0;
  }
}

function updateRegionOptions() {
  const regions = getRegionList(providerSelect.value);
  setSelectOptions(primaryRegionSelect, regions, true);
  setSelectOptions(secondaryRegionSelect, regions, true);
  if (!primaryRegionSelect.value && regions.length) {
    primaryRegionSelect.value = regions[0];
  }
  if (!secondaryRegionSelect.value && regions.length) {
    secondaryRegionSelect.value = regions.length > 1 ? regions[1] : regions[0];
  }
  updateAzOptions();
}

function updateProviderProfileLabel() {
  const provider = providerSelect.value;
  let labelText = 'Provider credentials';
  let placeholder = 'optional profile or env vars';

  if (provider === 'aws') {
    labelText = 'AWS credentials or profile';
    placeholder = 'optional profile name or env vars';
  } else if (provider === 'azure') {
    labelText = 'Azure credentials or subscription/profile';
    placeholder = 'subscription-id, profile, or env vars';
  } else if (provider === 'gcp') {
    labelText = 'GCP credentials or configuration';
    placeholder = 'configuration name or env vars';
  } else if (provider === 'oci') {
    labelText = 'OCI credentials or profile';
    placeholder = 'profile name or env vars';
  }

  providerProfileLabelText.textContent = labelText;
  providerProfileInput.placeholder = placeholder;
}

function updateChaosToolOptions() {
  const provider = providerSelect.value;
  let options = [];

  if (provider === 'aws') {
    options = [
      { value: 'fis', label: 'AWS FIS' },
      { value: 'gremlin', label: 'Gremlin' }
    ];
  } else if (provider === 'azure') {
    options = [
      { value: 'azureChaos', label: 'Azure Chaos Studio' },
      { value: 'gremlin', label: 'Gremlin' }
    ];
  } else if (provider === 'gcp') {
    options = [
      { value: 'gcpChaos', label: 'GCP Resilience Testing' },
      { value: 'gremlin', label: 'Gremlin' }
    ];  } else if (provider === 'oci') {
    options = [
      { value: 'gremlin', label: 'Gremlin' }
    ];  }

  chaosToolSelect.innerHTML = options
    .map((tool) => `<option value="${tool.value}">${tool.label}</option>`)
    .join('');
}

function updateAzOptions() {
  setSelectOptions(primaryAzSelect, getAzList(primaryRegionSelect.value), true);
  if (!primaryAzSelect.value && primaryAzSelect.options.length > 1) {
    primaryAzSelect.value = primaryAzSelect.options[1].value;
  }

  if (testScopeSelect.value === 'cross-region') {
    setSelectOptions(secondaryAzSelect, getAzList(secondaryRegionSelect.value), true);
    if (!secondaryAzSelect.value && secondaryAzSelect.options.length > 1) {
      secondaryAzSelect.value = secondaryAzSelect.options[1].value;
    }
  } else {
    setSelectOptions(secondaryAzSelect, getAzList(primaryRegionSelect.value), true);
    if (!secondaryAzSelect.value && secondaryAzSelect.options.length > 1) {
      secondaryAzSelect.value = secondaryAzSelect.options[1].value;
    }
  }
}

function updateFormVisibility() {
  const mode = modeSelect.value;
  const scope = testScopeSelect.value;
  const provider = providerSelect.value;
  chaosToolLabel.classList.toggle('hidden', mode !== 'chaos');
  secondaryRegionLabel.classList.toggle('hidden', scope !== 'cross-region');
  secondaryAzLabel.classList.toggle('hidden', scope !== 'cross-region');
  providerProfileLabel.classList.toggle('hidden', !provider);
}

function renderResult(data) {
  if (data.error) {
    resultPane.innerHTML = `<div class="error">${data.error}</div>`;
    return;
  }

  const serviceLabel = Array.isArray(data.service) ? data.service.join(', ') : data.service;
  const bullets = data.steps
    .map((step) => `<li><strong>${step.title}</strong>: ${step.detail}</li>`)
    .join('');

  resultPane.innerHTML = `
    <div class="result-summary">
      <p><strong>Test ID:</strong> ${data.testId}</p>
      <p><strong>Status:</strong> ${data.status}</p>
      <p><strong>Outcome:</strong> ${data.outcome}</p>
      <p><strong>Provider:</strong> ${data.provider}</p>
      <p><strong>Service(s):</strong> ${serviceLabel}</p>
      <p><strong>Account ID:</strong> ${data.accountId}</p>
      <p><strong>Primary Region:</strong> ${data.primaryRegion}</p>
      <p><strong>Primary AZ:</strong> ${data.primaryAz}</p>
      <p><strong>Scope:</strong> ${data.testScope}</p>
      <p><strong>Mode:</strong> ${data.mode}</p>
      <p><strong>Chaos Tool:</strong> ${data.chaosTool}</p>
      ${data.secondaryRegion ? `<p><strong>Secondary Region:</strong> ${data.secondaryRegion}</p>` : ''}
      ${data.secondaryAz ? `<p><strong>Secondary AZ:</strong> ${data.secondaryAz}</p>` : ''}
    </div>
    <ul class="step-list">${bullets}</ul>
  `;
}

function renderGuidance(data) {
  if (data.error) {
    guidancePane.innerHTML = `<div class="error">${data.error}</div>`;
    return;
  }

  const bullets = data.steps
    .map((step) => `<li>${step}</li>`)
    .join('');

  const serviceLabel = Array.isArray(data.service) ? data.service.join(', ') : data.service;
  guidancePane.innerHTML = `
    <div class="result-summary">
      <p><strong>${data.title}</strong></p>
      <p><strong>Provider:</strong> ${data.provider}</p>
      <p><strong>Service:</strong> ${serviceLabel}</p>
    </div>
    <ul class="step-list">${bullets}</ul>
  `;
}

drForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    provider: providerSelect.value,
    service: getSelectedServices(),
    testScope: testScopeSelect.value,
    mode: modeSelect.value,
    chaosTool: chaosToolSelect.value,
    providerProfile: providerProfileInput.value,
    accountId: document.getElementById('accountId').value,
    primaryRegion: primaryRegionSelect.value,
    secondaryRegion: secondaryRegionSelect.value,
    primaryAz: primaryAzSelect.value,
    secondaryAz: secondaryAzSelect.value,
    instanceId: document.getElementById('instanceId').value,
    description: document.getElementById('description').value
  };

  const response = await fetch('/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  renderResult(data);
});

validateProfileButton.addEventListener('click', async () => {
  const provider = providerSelect.value;
  const profile = providerProfileInput.value;
  const region = primaryRegionSelect.value;

  resultPane.innerHTML = '<div class="info">Validating provider credentials using environment variables or optional profile...</div>';

  const response = await fetch('/api/provider/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, profile, region })
  });

  const data = await response.json();
  if (data.error) {
    resultPane.innerHTML = `<div class="error">${data.error}</div>`;
    return;
  }

  document.getElementById('accountId').value = data.accountId || '';
  resultPane.innerHTML = `
    <div class="result-summary">
      <p><strong>${provider.toUpperCase()} credentials validated.</strong></p>
      <p><strong>Identity:</strong> ${data.accountId || data.profile || 'validated'}</p>
    </div>
  `;
});

chaosGuideButton.addEventListener('click', async () => {
  const payload = {
    provider: providerSelect.value,
    service: getSelectedServices(),
    tool: document.getElementById('chaosTool').value
  };

  const response = await fetch('/api/chaos/guide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  renderGuidance(data);
});

providerSelect.addEventListener('change', () => {
  updateServiceOptions();
  updateRegionOptions();
  updateProviderProfileLabel();
  updateChaosToolOptions();
  updateFormVisibility();
  highlightProviderCard();
});
modeSelect.addEventListener('change', updateFormVisibility);
testScopeSelect.addEventListener('change', () => {
  updateFormVisibility();
  updateAzOptions();
});
primaryRegionSelect.addEventListener('change', updateAzOptions);
secondaryRegionSelect.addEventListener('change', updateAzOptions);

loadProviders();
updateFormVisibility();
