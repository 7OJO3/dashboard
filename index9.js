const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, Collection, ModalBuilder, TextInputBuilder, 
    TextInputStyle, EmbedBuilder, UserSelectMenuBuilder 
} = require('discord.js');

const config = require('./config.json');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildVoiceStates, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// مصفوفة لتخزين مالكي الغرف (ID الروم -> ID المستخدم)
const roomOwners = new Collection(); 

client.once('ready', () => {
    console.log(`تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
});

// أمر إرسال اللوحة
client.on('messageCreate', async (message) => {
    if (message.content === '!تحكم') {
        const embed = new EmbedBuilder()
            .setTitle('لوحة تحكم الروم الخاص بك')
            .setDescription('استخدم الأزرار أدناه للتحكم بغرفتك (ملاحظة: يجب أن تكون مالك الروم ومتواجداً بداخله):')
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

// معالجة التفاعلات
client.on('interactionCreate', async (interaction) => {
    // التحقق من أن المستخدم في روم صوتي
    const vc = interaction.member.voice.channel;
    
    // نستثني زر الـ kick لأنه يحتاج منطق مختلف
    if ((interaction.isButton() || interaction.isUserSelectMenu()) && interaction.customId !== 'kick_member' && vc && roomOwners.get(vc.id) !== interaction.user.id) {
        return interaction.reply({ content: "❌ أنت لست مالك هذا الروم!", ephemeral: true });
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'change_name') {
            const modal = new ModalBuilder().setCustomId('name_modal').setTitle('تغيير اسم الروم');
            const input = new TextInputBuilder().setCustomId('val').setLabel('الاسم الجديد').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }
        if (interaction.customId === 'change_limit') {
            const modal = new ModalBuilder().setCustomId('limit_modal').setTitle('تغيير عدد الأشخاص');
            const input = new TextInputBuilder().setCustomId('val').setLabel('العدد (0-99)').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }
        if (interaction.customId === 'add_member') {
            const row = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('add_user').setPlaceholder('اختر الشخص لإضافته'));
            return interaction.reply({ content: 'اختر العضو من القائمة:', components: [row], ephemeral: true });
        }
        if (interaction.customId === 'kick_member') {
            const row = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('kick_user').setPlaceholder('اختر الشخص لطرده'));
            return interaction.reply({ content: 'اختر العضو لطرده من الروم:', components: [row], ephemeral: true });
        }
        if (interaction.customId === 'perm_speak') {
            const isAllowed = vc.permissionsFor(interaction.guild.roles.everyone).has('Speak');
            await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, { Speak: !isAllowed });
            return interaction.reply({ content: `✅ تم ${isAllowed ? 'إغلاق' : 'فتح'} المايك للجميع.`, ephemeral: true });
        }
        if (interaction.customId === 'ownership') {
            const row = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('new_owner').setPlaceholder('اختر المالك الجديد'));
            return interaction.reply({ content: 'اختر الشخص لنقل الملكية له:', components: [row], ephemeral: true });
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'name_modal') {
            await vc.setName(interaction.fields.getTextInputValue('val'));
            await interaction.reply({ content: '✅ تم تغيير الاسم.', ephemeral: true });
        }
        if (interaction.customId === 'limit_modal') {
            await vc.setUserLimit(parseInt(interaction.fields.getTextInputValue('val')));
            await interaction.reply({ content: '✅ تم تغيير الليمت.', ephemeral: true });
        }
    }

    if (interaction.isUserSelectMenu()) {
        const target = interaction.members.first();
        if (interaction.customId === 'add_user') {
            await vc.permissionOverwrites.edit(target.id, { Connect: true });
            await interaction.reply({ content: `✅ تم السماح لـ ${target.displayName} بالدخول.`, ephemeral: true });
        }
        if (interaction.customId === 'kick_user') {
            if (target.voice.channel?.id === vc.id) {
                await target.voice.disconnect();
                await interaction.reply({ content: `✅ تم طرد ${target.displayName}.`, ephemeral: true });
            } else {
                await interaction.reply({ content: "❌ العضو ليس داخل غرفتك.", ephemeral: true });
            }
        }
        if (interaction.customId === 'new_owner') {
            roomOwners.set(vc.id, target.id);
            await interaction.reply({ content: `✅ تم نقل ملكية الروم إلى ${target.displayName}`, ephemeral: true });
        }
    }
});

client.login(config.token);
