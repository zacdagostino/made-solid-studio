import { createSign } from 'node:crypto';

export const googleChirpLanguage = 'en-AU';
export const googleChirpDefaultVoice = 'en-AU-Chirp3-HD-Aoede';
export const googleChirpVoices = Object.freeze(
  [
    ['Achernar', 'Female'],
    ['Achird', 'Male'],
    ['Algenib', 'Male'],
    ['Algieba', 'Male'],
    ['Alnilam', 'Male'],
    ['Aoede', 'Female'],
    ['Autonoe', 'Female'],
    ['Callirrhoe', 'Female'],
    ['Charon', 'Male'],
    ['Despina', 'Female'],
    ['Enceladus', 'Male'],
    ['Erinome', 'Female'],
    ['Fenrir', 'Male'],
    ['Gacrux', 'Female'],
    ['Iapetus', 'Male'],
    ['Kore', 'Female'],
    ['Laomedeia', 'Female'],
    ['Leda', 'Female'],
    ['Orus', 'Male'],
    ['Pulcherrima', 'Female'],
    ['Puck', 'Male'],
    ['Rasalgethi', 'Male'],
    ['Sadachbia', 'Male'],
    ['Sadaltager', 'Male'],
    ['Schedar', 'Male'],
    ['Sulafat', 'Female'],
    ['Umbriel', 'Male'],
    ['Vindemiatrix', 'Female'],
    ['Zephyr', 'Female'],
    ['Zubenelgenubi', 'Male'],
  ].map(([name, gender]) => ({
    gender,
    id: `${googleChirpLanguage}-Chirp3-HD-${name}`,
    languageCode: googleChirpLanguage,
    model: 'chirp3-hd',
    modelLabel: 'Chirp 3 HD',
    name,
    qualityLabel: 'Recommended · most natural',
    qualityRank: 1,
    voiceName: `${googleChirpLanguage}-Chirp3-HD-${name}`,
  })),
);

const googleTokenEndpoint = 'https://oauth2.googleapis.com/token';
const googleVoicesEndpoint = 'https://texttospeech.googleapis.com/v1/voices';
const googleSpeechEndpoint = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const maximumSpeechBytes = 4_500;
const voiceCatalogLifetime = 6 * 60 * 60 * 1_000;
let cachedAccessToken;
let cachedVoiceCatalog;

const modelDetails = [
  {
    id: 'chirp3-hd',
    label: 'Chirp 3 HD',
    match: /-Chirp3-HD-/i,
    quality: 'Recommended · most natural',
    rank: 1,
  },
  {
    id: 'studio',
    label: 'Studio',
    match: /-Studio-/i,
    quality: 'Premium · long-form narration',
    rank: 2,
  },
  {
    id: 'neural2',
    label: 'Neural2',
    match: /-Neural2-/i,
    quality: 'Good quality · lower cost',
    rank: 3,
  },
  {
    id: 'polyglot',
    label: 'Polyglot',
    match: /-Polyglot-/i,
    quality: 'Preview · multilingual',
    rank: 4,
  },
  {
    id: 'wavenet',
    label: 'WaveNet',
    match: /-Wavenet-/i,
    quality: 'Legacy neural · value',
    rank: 5,
  },
  {
    id: 'standard',
    label: 'Standard',
    match: /-Standard-/i,
    quality: 'Basic · lowest cost',
    rank: 6,
  },
];

function modelForVoice(name) {
  return (
    modelDetails.find(({ match }) => match.test(name)) ?? {
      id: 'other',
      label: 'Other Google voice',
      quality: 'Specialist model',
      rank: 7,
    }
  );
}

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

function accountAvailable(environment) {
  try {
    return Boolean(serviceAccount(environment));
  } catch {
    return false;
  }
}

export function googleSpeechConfiguration(environment = process.env, voices = googleChirpVoices) {
  return {
    available: accountAvailable(environment),
    defaultVoice: voices.some(({ id }) => id === googleChirpDefaultVoice)
      ? googleChirpDefaultVoice
      : (voices[0]?.id ?? googleChirpDefaultVoice),
    provider: 'Google Cloud Text-to-Speech',
    voices,
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
  const response = await fetchImplementation(googleTokenEndpoint, {
    body: new URLSearchParams({
      assertion: serviceAccountAssertion(account, now),
      grant_type: 'urn:ietf:params:oauth2:grant-type:jwt-bearer',
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

function sanitizeVoiceCatalog(result) {
  return (Array.isArray(result?.voices) ? result.voices : [])
    .flatMap((voice) => {
      const id = typeof voice?.name === 'string' ? voice.name.trim() : '';
      const languageCodes = Array.isArray(voice?.languageCodes)
        ? voice.languageCodes.filter(
            (code) => typeof code === 'string' && /^[A-Za-z0-9-]{2,35}$/.test(code),
          )
        : [];
      if (!id || !/^[A-Za-z0-9-]+$/.test(id) || !languageCodes.length) return [];
      const model = modelForVoice(id);
      const name = id.split('-').at(-1) || id;
      const gender = ['FEMALE', 'MALE', 'NEUTRAL'].includes(voice.ssmlGender)
        ? `${voice.ssmlGender[0]}${voice.ssmlGender.slice(1).toLowerCase()}`
        : 'Unspecified';
      return languageCodes.map((languageCode) => ({
        gender,
        id: languageCodes.length > 1 ? `${id}::${languageCode}` : id,
        languageCode,
        model: model.id,
        modelLabel: model.label,
        name,
        qualityLabel: model.quality,
        qualityRank: model.rank,
        voiceName: id,
      }));
    })
    .sort(
      (left, right) =>
        left.qualityRank - right.qualityRank ||
        left.languageCode.localeCompare(right.languageCode) ||
        left.id.localeCompare(right.id),
    );
}

export async function listGoogleSpeechVoices({
  environment = process.env,
  fetchImplementation = fetch,
  now = Date.now,
} = {}) {
  if (!accountAvailable(environment)) return googleChirpVoices;
  const account = serviceAccount(environment);
  if (!account) return googleChirpVoices;
  if (
    cachedVoiceCatalog?.clientEmail === account.clientEmail &&
    cachedVoiceCatalog.expiresAt > now()
  ) {
    return cachedVoiceCatalog.voices;
  }
  try {
    const accessToken = await googleAccessToken(account, fetchImplementation, now);
    const response = await fetchImplementation(googleVoicesEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Goog-User-Project': account.projectId },
      method: 'GET',
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error('Google voice catalogue is unavailable.');
    const voices = sanitizeVoiceCatalog(await response.json());
    if (!voices.length) throw new Error('Google voice catalogue is empty.');
    cachedVoiceCatalog = {
      clientEmail: account.clientEmail,
      expiresAt: now() + voiceCatalogLifetime,
      voices,
    };
    return voices;
  } catch {
    return googleChirpVoices;
  }
}

export async function loadGoogleSpeechConfiguration(options = {}) {
  const environment = options.environment ?? process.env;
  return googleSpeechConfiguration(environment, await listGoogleSpeechVoices(options));
}

export function validateGoogleSpeechInput(input, voices = googleChirpVoices) {
  const text = typeof input?.text === 'string' ? input.text.trim() : '';
  const voice = typeof input?.voice === 'string' ? input.voice.trim() : '';
  if (!text) throw new Error('Readable text is required.');
  if (Buffer.byteLength(text, 'utf8') > maximumSpeechBytes) {
    throw new Error('Speech text must be 4,500 bytes or less.');
  }
  const selectedVoice = voices.find(({ id }) => id === voice);
  if (!selectedVoice) throw new Error('Choose an available Google voice.');
  return { text, voice: selectedVoice };
}

export async function synthesizeGoogleSpeech(
  input,
  { environment = process.env, fetchImplementation = fetch, now = Date.now } = {},
) {
  const account = serviceAccount(environment);
  if (!account) throw new Error('Google speech is not configured.');
  const voices = await listGoogleSpeechVoices({ environment, fetchImplementation, now });
  const { text, voice } = validateGoogleSpeechInput(input, voices);
  const accessToken = await googleAccessToken(account, fetchImplementation, now);
  const response = await fetchImplementation(googleSpeechEndpoint, {
    body: JSON.stringify({
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1 },
      input: { text },
      voice: { languageCode: voice.languageCode, name: voice.voiceName },
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
  return { audio, voice: voice.id };
}

export function clearGoogleSpeechTokenCache() {
  cachedAccessToken = undefined;
  cachedVoiceCatalog = undefined;
}
