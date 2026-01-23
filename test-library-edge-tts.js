
const { MsEdgeTTS } = require('edge-tts');

async function test() {
  const tts = new MsEdgeTTS();
  try {
    console.log('Connecting...');
    await tts.setMetadata('en-US-AndrewNeural', 'audio-24khz-48kbitrate-mono-mp3');
    console.log('Metadata set!');
    const buffer = await tts.toBuffer('Hello world');
    console.log('Success! Buffer length:', buffer.length);
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
}

test();
