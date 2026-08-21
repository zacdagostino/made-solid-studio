import { createSign } from 'node:crypto';

export const googleChirpLanguage = 'en-AU';
export const googleChirpDefaultVoice = 'Aoede';
export const googleChirpVoices = Object.freeze([
  { id: 'Achernar', gender: 'Female' },
  { id: 'Achird', gender: 'Male' },
  { id: 'Algenib', gender: 'Male' },
  { id: 'Algieba', gender: 'Male' },
  { id: 'Alnilam', gender: 'Male' },
  { id: 'Aoede', gender: 'Female' },
  { id: 'Autonoe', gender: 'Female' },
  { id: 'Callirrhoe', gender: 'Female' },
  { id: 'Charon', gender: 'Male' },
  { id: 'Despina', gender: 'Female' },
  { id: 'Enceladus', gender: 'Male' },
  { id: 'Erinome', gender: 'Female' },
  { id: 'Fenrir', gender: 'Male' },
  { id: 'Gacrux', gender: 'Female' },
  { id: 'Iapetus', gender: 'Male' },
  { id: 'Kore', gender: 'Female' },
  { id: 'Laomedeia', gender: 'Female' },
  { id: 'Leda', gender: 'Female' },
  { id: 'Orus', gender: 'Male' },
  { id: 'Pulcherrima', gender: 'Female' },
  { id: 'Puck', gender: 'Male' },
  { id: 'Rasalgethi', gender: 'Male' },
  { id: 'Sadachbia', gender: 'Male' },
  { id: 'Sadaltager', gender: 'Male' },
  { id: 'Schedar', gender: 'Male' },
  { id: 'Sulafat', gender: 'Female' },
  { id: 'Umbriel', gender: 'Male' },
  { id: 'Vindemiatrix', gender: 'Female' },
  { id: 'Zephyr', gender: 'Female' },
  { id: 'Zubenelgenubi', gender: 'Male' },
]);

const voiceIds = new Set(googleChirpVoices.map(({ id }) => id));
const googleTokenEndpoint = 'https://oauth2.googleapis.com/token';
const googleSpeechEndpoint = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const maximumSpeechBytes = 4_500;
let cachedAccessToken;

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function serviceAccount(environment) {
  const source = environment.SITEFORGE_GOOGLE_TTS_SERVICE_ACCOUNT_JSON?.trim();
  if (!source) return undefined;
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error('The Google speech service-account secret is not valid JSON.');
  }
  const clientEmail = typeof parsed.client_email === 'string' ? parsed.client_email.trim() : '';
  const privateKey =
    typeof parsed.private_key === 'string' ? parsed.private_key.replaceAll('\\n', '\n').trim() : '';
  const projectId = typeof parsed.project_id === 'string' ? parsed.project_id.trim() : '';
  if (!clientEmail || !privateKey || !projectId) {
    throw new Error('The Google speech service-account secret is incomplete.');
  }
  return { clientEmail, privateKey, projectId };
}

export function googleSpeechConfiguration(environment = process.env) {
  const available = (() => {
    try {
      return Boolean(serviceAccount(environment));
    } catch {
      return false;
    }
  })();
  return {
    available,
    defaultVoice: googleChirpDefaultVoice,
    language: googleChirpLanguage,
    provider: 'Google Chirp 3 HD',
    voices: googleChirpVoices,
  };
}

function serviceAccountAssertion(account, now) {
  const issuedAt = Math.floor(now() / 1_000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      aud: googleTokenEndpoint,
      exp: issuedAt + 3_600,
      iat: issuedAt,
      iss: account.clientEmail,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
    }),
  );
  const unsigned = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(account.privateKey, 'base64url')}`;
}

async function googleAccessToken(account, fetchImplementation, now) {
  if (
    cachedAccessToken?.clientEmail === account.clientEmail &&
    cachedAccessToken.expiresAt > now() + 60_000
  ) {
    return cachedAccessToken.value;
  }
  const assertion = serviceAccountAssertion(account, now);
  const response = await fetchImplementation(googleTokenEndpoint, {
    body: new URLSearchParams({
      assertion,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('Google speech authentication failed.');
  const result = await response.json();
  const value = typeof result.access_token === 'string' ? result.access_token : '';
  const expiresIn = Number(result.expires_in);
  if (!value || !Number.isFinite(expiresIn)) {
    throw new Error('Google speech authentication returned an invalid response.');
  }
  cachedAccessToken = {
    clientEmail: account.clientEmail,
    expiresAt: now() + Math.max(60, expiresIn) * 1_000,
    value,
  };
  return value;
}

export function validateGoogleSpeechInput(input) {
  const text = typeof input?.text === 'string' ? input.text.trim() : '';
  const voice = typeof input?.voice === 'string' ? input.voice.trim() : '';
  if (!text) throw new Error('Readable text is required.');
  if (Buffer.byteLength(text, 'utf8') > maximumSpeechBytes) {
    throw new Error('Speech text must be 4,500 bytes or less.');
  }
  if (!voiceIds.has(voice)) throw new Error('Choose an available Australian English voice.');
  return { text, voice };
}

export async function synthesizeGoogleSpeech(
  input,
  { environment = process.env, fetchImplementation = fetch, now = Date.now } = {},
) {
  const account = serviceAccount(environment);
  if (!account) throw new Error('Google speech is not configured.');
  const { text, voice } = validateGoogleSpeechInput(input);
  const accessToken = await googleAccessToken(account, fetchImplementation, now);
  const response = await fetchImplementation(googleSpeechEndpoint, {
    body: JSON.stringify({
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1 },
      input: { text },
      voice: {
        languageCode: googleChirpLanguage,
        name: `${googleChirpLanguage}-Chirp3-HD-${voice}`,
      },
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
      'X-Goog-User-Project': account.projectId,
    },
    method: 'POST',
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error('Google speech could not generate audio.');
  const result = await response.json();
  const audioContent = typeof result.audioContent === 'string' ? result.audioContent : '';
  if (!audioContent) throw new Error('Google speech returned no audio.');
  const audio = Buffer.from(audioContent, 'base64');
  if (!audio.length || audio.length > 10 * 1024 * 1024) {
    throw new Error('Google speech returned invalid audio.');
  }
  return { audio, voice };
}

export function clearGoogleSpeechTokenCache() {
  cachedAccessToken = undefined;
}
