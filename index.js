require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// Express Server (Required later for 24/7 cloud hosting)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, () => console.log(`Keep-alive server on port ${PORT}`));

// Discord Bot Initialization
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const ESMBOT_ID = '517371092700364808';

client.once('ready', () => {
  console.log(`LoggedIn as: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.id === client.user.id) return;

  const isEsmBot = message.author.id === ESMBOT_ID;
  const isGifCommand = 
    (message.interaction && message.interaction.commandName === 'gif') ||
    (message.reference && message.content.includes('/gif'));

  if (isEsmBot || isGifCommand) {
    try {
      const targetChannel = await client.channels.fetch(process.env.TARGET_CHANNEL_ID);
      if (!targetChannel) return;

      const files = message.attachments.map(a => a.url);
      const embedImages = message.embeds
        .map(e => e.image?.url || e.thumbnail?.url)
        .filter(Boolean);

      const mediaLinks = [...files, ...embedImages];

      if (mediaLinks.length > 0 || message.content) {
        await targetChannel.send({
          content: `Forwarded from <#${message.channel.id}>:`,
          files: mediaLinks,
        });
        console.log('GIF forwarded!');
      }
    } catch (err) {
      console.error('Error forwarding message:', err);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);