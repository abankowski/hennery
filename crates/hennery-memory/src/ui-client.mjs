// Progressive enhancement for passkeys only. Memory content remains server-rendered.
function decode(value) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0)).buffer;
}
function encode(value) {
  return btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function options(value, create) {
  if (!value?.publicKey) throw new Error('No passkey options');
  const key = value.publicKey;
  const ids = list => list?.map(item => ({ ...item, id: decode(item.id) }));
  return { publicKey: create
    ? { ...key, challenge: decode(key.challenge), user: { ...key.user, id: decode(key.user.id) }, excludeCredentials: ids(key.excludeCredentials) }
    : { ...key, challenge: decode(key.challenge), allowCredentials: ids(key.allowCredentials) } };
}
export function credentialJSON(credential) {
  if (!credential) throw new Error('No passkey chosen');
  if (typeof credential.toJSON === 'function') return credential.toJSON();
  const response = { clientDataJSON: encode(credential.response.clientDataJSON) };
  for (const key of ['attestationObject', 'authenticatorData', 'signature', 'userHandle']) {
    const value = credential.response[key];
    if (value instanceof ArrayBuffer) response[key] = encode(value);
  }
  return { id: credential.id, rawId: encode(credential.rawId), type: credential.type, response, clientExtensionResults: credential.getClientExtensionResults?.() ?? {} };
}
async function request(path, body) {
  const response = await fetch(path, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) throw new Error('Passkey operation refused. Confirm your password if needed, then try again.');
  return response.status === 204 ? undefined : response.json();
}
if (typeof document !== 'undefined') {
  for (const button of document.querySelectorAll('[data-passkey]')) {
    button.addEventListener('click', async () => {
      const status = document.querySelector('#passkey-status');
      button.disabled = true;
      try {
        if (!globalThis.PublicKeyCredential || !navigator.credentials) throw new Error('Passkeys are unavailable in this browser. Use your password.');
        const mode = button.dataset.passkey;
        const base = mode === 'register' ? '/api/auth/passkeys/register' : mode === 'login' ? '/api/auth/passkeys/login' : '/api/auth/step-up/passkey';
        const ceremony = await request(`${base}/start`, mode === 'register' ? { label: document.querySelector('#passkey-label').value } : undefined);
        const credential = mode === 'register'
          ? await navigator.credentials.create(options(ceremony.options, true))
          : await navigator.credentials.get(options(ceremony.options, false));
        await request(`${base}/finish`, { ceremony_id: ceremony.ceremony_id, credential: credentialJSON(credential) });
        location.assign('/');
      } catch (error) {
        status.textContent = error.name === 'NotAllowedError' ? 'Passkey request dismissed.' : error.message;
      } finally {
        button.disabled = false;
      }
    });
  }
}
