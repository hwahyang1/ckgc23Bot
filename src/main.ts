const path = require("path");
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, GatewayIntentBits, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

const config = require(path.join(__dirname, '..', 'config', 'config.json'));
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [{
    name: 'refresh',
    description: '메시지를 다시 발송합니다. (관리자 전용)'
}];

/////////////// Functions

const refreshSlashCommands = async () => {
	const rest = new REST({ version: '9' }).setToken(config.Token);
    try {
      	await rest.put(
        	Routes.applicationGuildCommands('1037869521098252388', config.GuildId),
        	{ body: commands },
      	);
  
      	console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      	console.error(error);
    }
};

const refreshMessage = async () => {
	const messageEmbed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle('정말 멋진 제목')
		.setDescription('정말 멋진 설명')
		
	const messageButtons = new ActionRowBuilder()
	config.Roles.forEach((role) => {
		messageButtons.addComponents(
			new ButtonBuilder()
				.setCustomId(role.id)
				.setLabel(role.label)
				.setStyle(ButtonStyle.Primary)
		);
	});
	await (client.channels.cache.get(config.NoticeChannelId) as typeof TextChannel).send({ embeds: [messageEmbed], components: [messageButtons] });
}

/////////////// Event

client.on('ready', async () => {
  	console.log(`Logged in as ${client.user.tag}!`);

	refreshSlashCommands();
	//refreshMessage();
});

client.on('guildMemberAdd', async member => {
	if (member.guild.id !== config.GuildId) return;
	let roleData = member.guild.roles.cache.find(target => target.id === config.DefualtRoleId);
	member.roles.add(roleData);
});

client.on('interactionCreate', async interaction => {
	if (interaction.isCommand()) {
		if (interaction.guild.id !== config.GuildId) return;
		if (interaction.commandName === 'refresh') {
			if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
				interaction.reply({ content: `요청을 처리하지 못했습니다.\n\`권한이 없습니다.\``, ephemeral: true });
				return;
			}
			await refreshMessage();
			await interaction.reply({ content: '해당 채널에 메시지를 전송했습니다.', ephemeral: true });
		}
	} else if (interaction.isButton()) {
		if (interaction.guild.id !== config.GuildId) return;
		if (interaction.customId.startsWith('assignRoles_')) {
			let role = config.Roles.find(target => target.id === interaction.customId);
			if (role === undefined) {
				interaction.reply({ content: `요청을 처리하지 못했습니다.\n\`정의되지 않은 값입니다: ${interaction.customId}\``, ephemeral: true });
				return;
			}

			try {
				let roleData = interaction.guild.roles.cache.find(target => target.id === role.roleId);
				await interaction.member.roles.remove(interaction.member.roles.cache);
				await interaction.member.roles.add(roleData);
				await interaction.reply({ content: `\`${role.label}\` 역할이 설정되었습니다.`, ephemeral: true });
			} catch (error) {
				await interaction.reply({ content: `요청을 처리하지 못했습니다.\n\`${error}\``, ephemeral: true });
				return;
			}
		}
	}
});

client.login(config.Token);