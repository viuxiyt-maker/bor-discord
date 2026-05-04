const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');

const express = require('express');

// ================= CONFIG =================
const TOKEN = "MTUwMDI2MDQxMjEwNzUyNjI3NA.GNU7LG.3T3AEiPxTVvxyHVlrhIU2F8AcNA-q3JZlAuM80";
const CLIENT_ID = "1500260412107526274";
const GUILD_ID = "1500238651286618122";
const CHANNEL_ID = "1500593362787500243";
const COLOR = "#DC7AFC";

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= MEMORY =================
const offers = new Map();
const proposals = new Map();

// 🔥 DODANE (CACHE WIADOMOŚCI OFERT)
const offerMessages = new Map();

// ================= SLASH =================
const commands = [
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('🎛️ Panel ofert')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

client.once(Events.ClientReady, () => {
  console.log(`🤖 Zalogowano jako ${client.user.tag}`);
});

// ================= PANEL =================
function panel() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('hosting_select')
    .setPlaceholder('🏷️ Wybierz hosting')
    .addOptions([
      { label: 'IceHost', value: 'IceHost', emoji: { id: '1500578542109593610', name: 'icehost' } },
      { label: 'IVHost', value: 'IVHost', emoji: { id: '1500578619192246493', name: 'ivhst' } },
      { label: 'Pukawka', value: 'Pukawka', emoji: { id: '1500577852918075402', name: 'Pukawka' } },
      { label: 'SkillHost', value: 'SkillHost', emoji: { id: '1500578749601808445', name: 'images' } }
    ]);

const embed = new EmbedBuilder()
  .setTitle('🛒 Kreator ofert')
  .setDescription('────────────────────────────────────────────────────────────\nWitaj w kreatorze ofert! Aby utworzyć ofertę **sprzedaży wPLN** należy wybrać hosting z poniższej listy oraz uzupełnić wymagane informacje. \n\n**Uwaga!** Podawanie nieprawdziwych informacji może skutkować permanentnym banem na serwerze.\n────────────────────────────────────────────────────────────')
  .setColor(COLOR);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)]
  };
}

// ================= MESSAGE =================
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!panel') msg.channel.send(panel());
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async (interaction) => {

  // ===== SELECT MENU =====
  if (interaction.isStringSelectMenu()) {
    const hosting = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`form_${hosting}`)
      .setTitle('📦 Tworzenie oferty');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('ilosc')
          .setLabel('💰 Ilość w PLN')
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('kurs')
          .setLabel('📊 Kurs')
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('platnosc')
          .setLabel('💳 Metody płatności')
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('info')
          .setLabel('📝 Dodatkowe informacje')
          .setStyle(TextInputStyle.Paragraph)
      )
    );

    return interaction.showModal(modal);
  }

  // ================= MODALS =================
  if (interaction.isModalSubmit()) {

    // ===== CREATE OFFER =====
    if (interaction.customId.startsWith('form_')) {

      const hosting = interaction.customId.replace('form_', '');

      const data = {
        ilosc: interaction.fields.getTextInputValue('ilosc'),
        kurs: interaction.fields.getTextInputValue('kurs'),
        platnosc: interaction.fields.getTextInputValue('platnosc'),
        info: interaction.fields.getTextInputValue('info')
      };

      const embed = new EmbedBuilder()
        .setTitle(`Oferta: ${hosting}`)
        .setColor(COLOR)
        .setDescription(
`👤 Sprzedający: <@${interaction.user.id}>

🏷️ Hosting: ${hosting}
💰 Ilość: ${data.ilosc}
📊 Kurs: ${data.kurs}
💳 Płatnośći: ${data.platnosc}

📝 Dodatkowe Informacje:
${data.info}
────────────────────
**Pamiętaj!** Jedyną bezpieczną metodą dokonywania transakcji jest przycisk Chcę kupić!. Nie ufaj nikomu kto prosi o kontakt na privie! Jeżeli nie jesteś pewien transakcji, zapytaj moderacji o opcje middleman!
────────────────────`
        );

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('buy')
          .setLabel('🛒 Chcę kupić')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('sold')
          .setLabel('❌ Oznacz jako sprzedane')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('edit_amount')
          .setLabel('✏️ Zmień ilość')
          .setStyle(ButtonStyle.Secondary)
      );

      const channel = await client.channels.fetch(CHANNEL_ID);

      const thread = await channel.threads.create({
        name: `📦 ${hosting}`,
        message: {
          embeds: [embed],
          components: [buttons]
        }
      });

      // 🔥 DODANE (CACHE MESSAGE)
      const msg = await thread.fetchStarterMessage();
      offerMessages.set(thread.id, msg);

      offers.set(thread.id, {
        ...data,
        hosting,
        userId: interaction.user.id
      });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ Oferta utworzona")
            .setColor(COLOR)
            .setDescription(`📌 ${thread.url}`)
        ],
        ephemeral: true
      });
    }

    // ===== BUY MODAL =====
    if (interaction.customId.startsWith('buy_modal_')) {

      const threadId = interaction.customId.replace('buy_modal_', '');
      const offer = offers.get(threadId);

      if (!offer)
        return interaction.reply({ content: "❌ Brak oferty", ephemeral: true });

      const ilosc = interaction.fields.getTextInputValue('ilosc');
      const kurs = interaction.fields.getTextInputValue('kurs');

      const embed = new EmbedBuilder()
        .setTitle("💖 Zaproponowana oferta")
        .setColor("#FF69B4")
        .setDescription(
`👤 Kupujący: <@${interaction.user.id}>
👤 Sprzedający: <@${offer.userId}>

💰 Wybrana Ilość: ${ilosc}
📊 Zaoferowany kurs: ${kurs}`
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${interaction.user.id}_${threadId}`)
          .setLabel('✅ Akceptuj ofertę')
          .setStyle(ButtonStyle.Success)
      );

      const channel = await client.channels.fetch(threadId);

      const msg = await channel.send({
        embeds: [embed],
        components: [row]
      });

      proposals.set(msg.id, {
        sellerId: offer.userId,
        buyerId: interaction.user.id
      });

      return interaction.reply({ content: "📨 Oferta wysłana", ephemeral: true });
    }

    // ===== EDIT AMOUNT MODAL (DODANE) =====
    if (interaction.customId.startsWith('edit_amount_modal_')) {

      const threadId = interaction.customId.replace('edit_amount_modal_', '');
      const newAmount = interaction.fields.getTextInputValue('new_amount');

      const msg = offerMessages.get(threadId);

      if (!msg) {
        return interaction.reply({ content: "❌ Brak oferty", ephemeral: true });
      }

      const embed = EmbedBuilder.from(msg.embeds[0]);

      embed.setDescription(
        embed.data.description.replace(
          /💰 Ilość: .*/,
          `💰 Ilość: ${newAmount}`
        )
      );

      await msg.edit({ embeds: [embed] });

      return interaction.reply({
        content: "✅ Zmieniono ilość",
        ephemeral: true
      });
    }
  }

  // ================= BUTTONS =================
  if (interaction.isButton()) {

    const thread = interaction.channel;

    // ===== BUY =====
    if (interaction.customId === 'buy') {

      const modal = new ModalBuilder()
        .setCustomId(`buy_modal_${thread.id}`)
        .setTitle('🛒 Oferta kupna');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('ilosc')
            .setLabel('💰 Wybierz ilość wPLN')
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('kurs')
            .setLabel('📊 Zaoferuj Kurs')
            .setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    // ===== SOLD (DODANE - USUWANIE THREADA) =====
    if (interaction.customId === 'sold') {
      try {
        offerMessages.delete(thread.id);
        offers.delete(thread.id);
        await thread.delete();
      } catch (err) {
        return interaction.reply({
          content: "❌ Nie mogę usunąć posta",
          ephemeral: true
        });
      }
    }

    // ===== ACCEPT =====
    if (interaction.customId.startsWith('accept_')) {

      const proposal = proposals.get(interaction.message.id);

      if (!proposal)
        return interaction.reply({ content: "❌ Brak danych", ephemeral: true });

      if (interaction.user.id !== proposal.sellerId)
        return interaction.reply({ content: "❌ Tylko sprzedający może zaakceptować", ephemeral: true });

      await interaction.message.edit({
        embeds: [
          EmbedBuilder.from(interaction.message.embeds[0])
            .setTitle("✅ Oferta zaakceptowana")
            .setColor("#00FF00")
        ],
        components: []
      });

      proposals.delete(interaction.message.id);

      return interaction.reply("🎉 Oferta zaakceptowana");
    }

    // ===== EDIT BUTTON =====
    if (interaction.customId === 'edit_amount') {

      const modal = new ModalBuilder()
        .setCustomId(`edit_amount_modal_${thread.id}`)
        .setTitle('✏️ Zmień ilość');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('new_amount')
            .setLabel('💰Nowa ilość w wPLN')
            .setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }
  }
});

// ================= EXPRESS =================
const app = express();
app.get('/', (req, res) => res.send('🤖 Bot działa'));
app.listen(3000, () => console.log('🌐 Keep alive działa'));

// ================= LOGIN =================
client.login(TOKEN);
