const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, Collection, ModalBuilder, TextInputBuilder, 
    TextInputStyle, EmbedBuilder 
} = require('discord.js');

// استدعاء ملف الإعدادات
const config = require('./config.json');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildVoiceStates, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

const roomData = new Collection(); 

client.once('ready', () => {
    console.log(`تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.content === '!تحكم') {
        const vc = message.member.voice.channel;
        
        if (!vc) return message.reply("يجب أن تكون داخل روم صوتي لاستخدام هذا الأمر.");

        // إعداد الـ Embed باستخدام بيانات ملف الـ JSON
        const embed = new EmbedBuilder()
            .setTitle('🎮 لوحة تحكم الروم الخاص بك')
            .setDescription('أهلاً بك، يمكنك التحكم بإعدادات غرفتك الصوتية من الأزرار أدناه:')
            .setImage(config.images.panel_banner)
            .setColor(config.settings.embed_color);

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('change_name').setLabel('Change Name').setStyle(ButtonStyle.Secondary).setEmoji('1524265172489863218'),
            new ButtonBuilder().setCustomId('change_limit').setLabel('Change Limit').setStyle(ButtonStyle.Secondary).setEmoji('1524265115074166784')
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add_member').setLabel('Add Member').setStyle(ButtonStyle.Secondary).setEmoji('1524265096363376650'),
            new ButtonBuilder().setCustomId('kick_member').setLabel('Kick Member').setStyle(ButtonStyle.Secondary).setEmoji('1524265050242678845')
        );
        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('perm_speak').setLabel('Speak Permission').setStyle(ButtonStyle.Secondary).setEmoji('1524265071528644701'),
            new ButtonBuilder().setCustomId('ownership').setLabel('Ownership').setStyle(ButtonStyle.Secondary).setEmoji('1524265152927629384')
        );

        await message.channel.send({ embeds: [embed], components: [row1, row2, row3] });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId === 'change_name') {
            const modal = new ModalBuilder().setCustomId('name_modal').setTitle('تغيير اسم الروم');
            const input = new TextInputBuilder()
                .setCustomId('new_name')
                .setLabel('الاسم الجديد')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'name_modal') {
            const newName = interaction.fields.getTextInputValue('new_name');
            const vc = interaction.member.voice.channel;
            
            if (vc) {
                await vc.setName(newName);
                await interaction.reply({ content: `✅ تم تغيير اسم الروم إلى: **${newName}**`, ephemeral: true });
            } else {
                await interaction.reply({ content: "خطأ: يجب أن تكون في الروم لتغيير اسمه.", ephemeral: true });
            }
        }
    }
});

client.login(config.token);