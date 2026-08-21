import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import {
  clearGoogleSpeechTokenCache,
  googleChirpDefaultVoice,
  googleChirpVoices,
  googleSpeechConfiguration,
  listGoogleSpeechVoices,
  synthesizeGoogleSpeech,
  validateGoogleSpeechInput,
} from '../../scripts/google-cloud-tts.mjs';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const serviceAccountEnvironment = {
  SITEFORGE_GOOGLE_TTS_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: 'speech@example.iam.gserviceaccount.com',
    private_key: privateKey.export({ format: 'pem', type: 'pkcs8' }),
    project_id: 'made-solid-speech',
  }),
};
const googleVoiceResponse = {
  voices: [
    {
      languageCodes: ['en-US'],
      name: 'en-US-Chirp3-HD-Aoede',
      naturalSampleRateHertz: 24_000,
      ssmlGender: 'FEMALE',
    },
    {
      languageCodes: ['fr-FR'],
      name: 'fr-FR-Neural2-A',
      naturalSampleRateHertz: 24_000,
      ssmlGender: 'MALE',
    },
    {
      languageCodes: ['en-GB'],
      name: 'en-GB-Standard-A',
      naturalSampleRateHertz: 24_000,
      ssmlGender: 'NEUTRAL',
    },
  ],
};

test.beforeEach(() => clearGoogleSpeechTokenCache());

test('reports an optional Google configuration without exposing credentials', () => {
  const unavailable = googleSpeechConfiguration({});
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.defaultVoice, googleChirpDefaultVoice);
  assert.equal(unavailable.voices.length, 30);
  assert.ok(unavailable.voices.some(({ name }) => name === 'Aoede'));
  assert.ok(!JSON.stringify(unavailable).includes('service_account'));
  assert.equal(googleSpeechConfiguration(serviceAccountEnvironment).available, true);
});

test('fails closed without requesting Google when the configured secret is invalid', async () => {
  let requested = false;
  const voices = await listGoogleSpeechVoices({
    environment: { SITEFORGE_GOOGLE_TTS_SERVICE_ACCOUNT_JSON: 'not-json' },
    fetchImplementation: async () => {
      requested = true;
      return Response.json({});
    },
  });
  assert.equal(requested, false);
  assert.equal(voices.length, 30);
  assert.equal(
    googleSpeechConfiguration({ SITEFORGE_GOOGLE_TTS_SERVICE_ACCOUNT_JSON: 'not-json' }).available,
    false,
  );
});

test('loads, labels, sorts, and caches the complete Google voice catalogue', async () => {
  let tokenRequests = 0;
  let catalogueRequests = 0;
  const fetchImplementation = async (url) => {
    if (String(url).includes('oauth2.googleapis.com')) {
      tokenRequests += 1;
      return Response.json({ access_token: 'catalogue-token', expires_in: 3600 });
    }
    catalogueRequests += 1;
    return Response.json(googleVoiceResponse);
  };
  const options = {
    environment: serviceAccountEnvironment,
    fetchImplementation,
    now: () => 1_800_000_000_000,
  };
  const first = await listGoogleSpeechVoices(options);
  const second = await listGoogleSpeechVoices(options);
  assert.equal(tokenRequests, 1);
  assert.equal(catalogueRequests, 1);
  assert.deepEqual(second, first);
  assert.deepEqual(
    first.map(({ id, languageCode, model, qualityLabel }) => ({
      id,
      languageCode,
      model,
      qualityLabel,
    })),
    [
      {
        id: 'en-US-Chirp3-HD-Aoede',
        languageCode: 'en-US',
        model: 'chirp3-hd',
        qualityLabel: 'Recommended · most natural',
      },
      {
        id: 'fr-FR-Neural2-A',
        languageCode: 'fr-FR',
        model: 'neural2',
        qualityLabel: 'Good quality · lower cost',
      },
      {
        id: 'en-GB-Standard-A',
        languageCode: 'en-GB',
        model: 'standard',
        qualityLabel: 'Basic · lowest cost',
      },
    ],
  );
});

test('accepts only voices from the server catalogue and bounded non-empty text', () => {
  assert.deepEqual(
    validateGoogleSpeechInput(
      { text: ' Hello. ', voice: googleChirpDefaultVoice },
      googleChirpVoices,
    ),
    {
      text: 'Hello.',
      voice: googleChirpVoices.find(({ id }) => id === googleChirpDefaultVoice),
    },
  );
  assert.throws(
    () => validateGoogleSpeechInput({ text: '', voice: googleChirpDefaultVoice }),
    /required/i,
  );
  assert.throws(
    () => validateGoogleSpeechInput({ text: 'Hello.', voice: 'arbitrary-model' }),
    /available Google voice/i,
  );
  assert.throws(
    () => validateGoogleSpeechInput({ text: '🙂'.repeat(1_126), voice: googleChirpDefaultVoice }),
    /4,500 bytes/i,
  );
});

test('uses the selected catalogue voice and its own language for MP3 audio', async () => {
  const requests = [];
  const fetchImplementation = async (url, init) => {
    requests.push({ url: String(url), init });
    if (String(url).includes('oauth2.googleapis.com')) {
      return Response.json({ access_token: 'short-lived-token', expires_in: 3600 });
    }
    if (String(url).endsWith('/voices')) return Response.json(googleVoiceResponse);
    return Response.json({ audioContent: Buffer.from('mock mp3').toString('base64') });
  };
  const result = await synthesizeGoogleSpeech(
    { text: 'Bonjour.', voice: 'fr-FR-Neural2-A' },
    { environment: serviceAccountEnvironment, fetchImplementation, now: () => 1_800_000_000_000 },
  );

  assert.equal(result.audio.toString(), 'mock mp3');
  assert.equal(requests.length, 3);
  const tokenBody = new URLSearchParams(requests[0].init.body);
  assert.equal(tokenBody.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  const assertionParts = tokenBody.get('assertion').split('.');
  const claims = JSON.parse(Buffer.from(assertionParts[1], 'base64url').toString());
  assert.equal(claims.iss, 'speech@example.iam.gserviceaccount.com');
  assert.match(claims.scope, /cloud-platform/);
  assert.equal(requests[1].init.method, 'GET');
  assert.equal(requests[2].init.headers.Authorization, 'Bearer short-lived-token');
  const speechBody = JSON.parse(requests[2].init.body);
  assert.deepEqual(speechBody.voice, { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' });
  assert.equal(speechBody.audioConfig.audioEncoding, 'MP3');
});

test('reuses the token and catalogue without caching generated audio', async () => {
  let tokenRequests = 0;
  let catalogueRequests = 0;
  let speechRequests = 0;
  const fetchImplementation = async (url) => {
    if (String(url).includes('oauth2.googleapis.com')) {
      tokenRequests += 1;
      return Response.json({ access_token: 'cached-token', expires_in: 3600 });
    }
    if (String(url).endsWith('/voices')) {
      catalogueRequests += 1;
      return Response.json(googleVoiceResponse);
    }
    speechRequests += 1;
    return Response.json({
      audioContent: Buffer.from(`audio-${speechRequests}`).toString('base64'),
    });
  };
  const options = {
    environment: serviceAccountEnvironment,
    fetchImplementation,
    now: () => 1_800_000_000_000,
  };
  await synthesizeGoogleSpeech({ text: 'First.', voice: 'en-US-Chirp3-HD-Aoede' }, options);
  await synthesizeGoogleSpeech({ text: 'Second.', voice: 'en-US-Chirp3-HD-Aoede' }, options);
  assert.equal(tokenRequests, 1);
  assert.equal(catalogueRequests, 1);
  assert.equal(speechRequests, 2);
});

test('falls back to the known Chirp catalogue when listing temporarily fails', async () => {
  const voices = await listGoogleSpeechVoices({
    environment: serviceAccountEnvironment,
    fetchImplementation: async (url) =>
      String(url).includes('oauth2.googleapis.com')
        ? Response.json({ access_token: 'token', expires_in: 3600 })
        : new Response('private upstream detail', { status: 503 }),
  });
  assert.equal(voices.length, 30);
  assert.equal(voices[0].languageCode, 'en-AU');
});

test('redacts upstream authentication failures', async () => {
  await assert.rejects(
    synthesizeGoogleSpeech(
      { text: 'Hello.', voice: googleChirpVoices[0].id },
      {
        environment: serviceAccountEnvironment,
        fetchImplementation: async () => new Response('private token', { status: 401 }),
      },
    ),
    (error) => {
      assert.equal(error.message, 'Google speech authentication failed.');
      assert.ok(!error.message.includes('private'));
      return true;
    },
  );
});
