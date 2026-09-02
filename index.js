require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');

// Express Keep-Alive Server
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, () => console.log(`Keep-alive server active on port ${PORT}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const ESMBOT_ID = '517371092700364808';

client.once('ready', () => {
  console.log(`LoggedIn as: ${client.user.tag}`);
});

// Helper function to extract and forward media from esmBot
async function processAndForward(message) {
  // Ignore messages from ourselves
  if (message.author?.id === client.user.id) return;

  // Check if message comes from esmBot (by ID, username, or webhook)
  const isEsmBot = 
    message.author?.id === ESMBOT_ID || 
    (message.author?.bot && message.author?.username.toLowerCase().includes('esmbot')) ||
    (message.webhookId && message.author?.username.toLowerCase().includes('esmbot'));

  if (!isEsmBot) return;

  console.log(`--- ESMBOT MESSAGE DETECTED (${message.editedTimestamp ? 'EDITED' : 'NEW'}) ---`);

  // 1. Collect Attachments
  const attachments = message.attachments.map(a => a.url);

  // 2. Collect Embed Images, Thumbnails, and Video/GIF links
  const embedMedia = [];
  if (message.embeds && message.embeds.length > 0) {
    for (const embed of message.embeds) {
      if (embed.image?.url) embedMedia.push(embed.image.url);
      if (embed.thumbnail?.url) embedMedia.push(embed.thumbnail.url);
      if (embed.video?.url) embedMedia.push(embed.video.url);
      if (embed.url && (embed.url.includes('.gif') || embed.url.includes('.png') || embed.url.includes('.webp'))) {
        embedMedia.push(embed.url);
      }
    }
  }

  // Combine and remove duplicates
  const mediaLinks = [...new Set([...attachments, ...embedMedia])];
  console.log(`Media found: ${mediaLinks.length} items`);

  // If no media found yet, wait briefly (esmBot might still be assembling payload)
  if (mediaLinks.length === 0) {
    console.log('No media found in this event. Waiting for message edit...');
    return;
  }

  try {
    const targetChannel = client.channels.cache.get(process.env.TARGET_CHANNEL_ID) 
      || await client.channels.fetch(process.env.TARGET_CHANNEL_ID);

    if (!targetChannel) {
      console.error('CRITICAL: Target channel not found!');
      return;
    }

    console.log(`Sending GIF to #${targetChannel.name}...`);

    await targetChannel.send({
      content: `Forwarded GIF from <#${message.channel.id}>:\n${mediaLinks.join('\n')}`,
    });

    console.log('SUCCESS: GIF successfully forwarded!');
  } catch (err) {
    console.error('ERROR during forwarding:', err.message || err);
  }
}

// Event 1: New Messages
client.on('messageCreate', async (message) => {
  await processAndForward(message);
});

// Event 2: Message Edits (Crucial for esmBot finished responses)
client.on('messageUpdate', async (oldMessage, newMessage) => {
  // If the message wasn't fully cached, fetch the complete updated message
  const fullMessage = newMessage.partial ? await newMessage.fetch() : newMessage;
  await processAndForward(fullMessage);
});

client.login(process.env.DISCORD_TOKEN);