import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import {
  clearGoogleSpeechTokenCache,
  googleChirpDefaultVoice,
  googleChirpVoices,
  googleSpeechConfiguration,
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

test.beforeEach(() => clearGoogleSpeechTokenCache());

test('reports an optional Australian Chirp configuration without exposing credentials', () => {
  const unavailable = googleSpeechConfiguration({});
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.language, 'en-AU');
  assert.equal(unavailable.defaultVoice, googleChirpDefaultVoice);
  assert.equal(unavailable.voices.length, 30);
  assert.ok(unavailable.voices.some(({ id }) => id === 'Aoede'));
  assert.ok(!JSON.stringify(unavailable).includes('service_account'));

  assert.equal(googleSpeechConfiguration(serviceAccountEnvironment).available, true);
});

test('accepts only allow-listed voices and bounded non-empty text', () => {
  assert.deepEqual(validateGoogleSpeechInput({ text: ' Hello. ', voice: 'Leda' }), {
    text: 'Hello.',
    voice: 'Leda',
  });
  assert.throws(() => validateGoogleSpeechInput({ text: '', voice: 'Leda' }), /required/i);
  assert.throws(
    () => validateGoogleSpeechInput({ text: 'Hello.', voice: 'arbitrary-model' }),
    /available Australian English voice/i,
  );
  assert.throws(
    () => validateGoogleSpeechInput({ text: '🙂'.repeat(1_126), voice: 'Leda' }),
    /4,500 bytes/i,
  );
});

test('exchanges a signed service assertion and requests allow-listed en-AU MP3 audio', async () => {
  const requests = [];
  const fetchImplementation = async (url, init) => {
    requests.push({ url: String(url), init });
    if (String(url).includes('oauth2.googleapis.com')) {
      return Response.json({ access_token: 'short-lived-token', expires_in: 3600 });
    }
    return Response.json({ audioContent: Buffer.from('mock mp3').toString('base64') });
  };

  const result = await synthesizeGoogleSpeech(
    { text: 'This is a private Studio voice preview.', voice: 'Aoede' },
    { environment: serviceAccountEnvironment, fetchImplementation, now: () => 1_800_000_000_000 },
  );

  assert.equal(result.audio.toString(), 'mock mp3');
  assert.equal(requests.length, 2);
  const tokenBody = new URLSearchParams(requests[0].init.body);
  const assertionParts = tokenBody.get('assertion').split('.');
  assert.equal(assertionParts.length, 3);
  const claims = JSON.parse(Buffer.from(assertionParts[1], 'base64url').toString());
  assert.equal(claims.iss, 'speech@example.iam.gserviceaccount.com');
  assert.equal(claims.aud, 'https://oauth2.googleapis.com/token');
  assert.match(claims.scope, /cloud-platform/);

  assert.equal(requests[1].init.headers.Authorization, 'Bearer short-lived-token');
  assert.equal(requests[1].init.headers['X-Goog-User-Project'], 'made-solid-speech');
  const speechBody = JSON.parse(requests[1].init.body);
  assert.deepEqual(speechBody.voice, {
    languageCode: 'en-AU',
    name: 'en-AU-Chirp3-HD-Aoede',
  });
  assert.equal(speechBody.audioConfig.audioEncoding, 'MP3');
});

test('reuses the short-lived Google access token without caching generated audio', async () => {
  let tokenRequests = 0;
  let speechRequests = 0;
  const fetchImplementation = async (url) => {
    if (String(url).includes('oauth2.googleapis.com')) {
      tokenRequests += 1;
      return Response.json({ access_token: 'cached-token', expires_in: 3600 });
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
  await synthesizeGoogleSpeech({ text: 'First.', voice: 'Aoede' }, options);
  await synthesizeGoogleSpeech({ text: 'Second.', voice: 'Aoede' }, options);
  assert.equal(tokenRequests, 1);
  assert.equal(speechRequests, 2);
});

test('redacts upstream authentication and synthesis failures', async () => {
  await assert.rejects(
    synthesizeGoogleSpeech(
      { text: 'Hello.', voice: googleChirpVoices[0].id },
      {
        environment: serviceAccountEnvironment,
        fetchImplementation: async () =>
          new Response('private upstream detail and token', { status: 401 }),
      },
    ),
    (error) => {
      assert.equal(error.message, 'Google speech authentication failed.');
      assert.ok(!error.message.includes('private upstream'));
      return true;
    },
  );
});
