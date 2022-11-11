'use strict';

const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, GatewayIntentBits, TextChannel, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

const config = require(path.join(__dirname, '..', 'config', 'config.json'));
const partRoleConfig = require(path.join(__dirname, '..', 'config', 'partRole.json'));
const gameRoleConfigPath = path.join(__dirname, '..', 'config', 'gameRole.json');
let gameRoleConfig = undefined;

const idRule = /^[a-zA-Z]{1,10}$/;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] });

/////////////// Functions
const refreshSlashCommands = async () => {
	const commands:Array<typeof SlashCommandBuilder> = [
		new SlashCommandBuilder().setName('notice').setDescription('역할 부여 채널에 공지 메시지를 작성합니다. (봇 관리자 전용)')
		.addBooleanOption((option) => option.setName('기록제거').setDescription('기존 메시지를 제거 할 지 지정합니다.').setRequired(true))
		.addStringOption((option) => option.setName('파일명').setDescription('해당되는 공지방에 보낼 파일명을 지정합니다.').setRequired(true)),

		new SlashCommandBuilder().setName('add').setDescription('부여받을 수 있는 역할을 추가합니다. (서버 관리자 전용)')
			.addRoleOption((option) => option.setName('역할').setDescription('추가할 역할을 지정합니다.').setRequired(true))
			.addStringOption((option) => option.setName('영문이름').setDescription('역할의 영문 이름을 지정합니다. 공백 없이 대/소문자로만 구성합니다.').setRequired(true)),

		new SlashCommandBuilder().setName('remove').setDescription('부여받을 수 있는 역할을 제거합니다. (서버 관리자 전용)')
			.addRoleOption((option) => option.setName('역할').setDescription('제거할 역할을 지정합니다.').setRequired(true)),

		new SlashCommandBuilder().setName('refresh').setDescription('메시지를 다시 발송합니다. (서버 관리자 전용)'),
	];

	const rest = new REST({ version: '9' }).setToken(config.Token);
    try {
      	await rest.put(
        	Routes.applicationGuildCommands(client.application.id, config.GuildId),
        	{ body: commands }
      	);
  
      	console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      	console.error(error);
    }
};

const deleteAllMessage = async () => {
	// 분야별 역할
	let channel = client.channels.cache.get(partRoleConfig.Notice.ChannelId) as typeof TextChannel;
	let messageManager = channel.messages;
	let messages = await messageManager.channel.messages.fetch({ limit: 100 });
	channel.bulkDelete(messages, true);

	// 게임 역할
	channel = client.channels.cache.get(gameRoleConfig.Notice.ChannelId) as typeof TextChannel;
	messageManager = channel.messages;
	messages = await messageManager.channel.messages.fetch({ limit: 100 });
	channel.bulkDelete(messages, true);
}

const refreshMessage = async () => {
	// 분야별 역할
	const partRoleMessageEmbed = new EmbedBuilder()
		.setColor(0xF67720)
		.setTitle(partRoleConfig.Notice.EmbedTitle)
		.setDescription(partRoleConfig.Notice.EmbedDescription)
		.setFooter("본 메시지는 상황에 따라 다시 전송 될 수도 있습니다.")
		.setTimestamp(new Date());
		
	const partRoleMessageButtons = new ActionRowBuilder()
	for (const role of partRoleConfig.Roles) {
		partRoleMessageButtons.addComponents(
			new ButtonBuilder()
				.setCustomId(role.id)
				.setLabel(role.label)
				.setStyle(ButtonStyle.Primary)
		);
	};
	await (client.channels.cache.get(partRoleConfig.Notice.ChannelId) as typeof TextChannel).send({ embeds: [partRoleMessageEmbed], components: [partRoleMessageButtons] });

	// 추가 요청: 작대기 역할
	const partRoleDividerMessageEmbed = new EmbedBuilder()
		.setColor(0xF67720)
		.setTitle('필수 역할')
		.setDescription('아래의 역할(버튼)은 필수로 눌러서 가져가세요.')
		.setFooter("본 메시지는 상황에 따라 다시 전송 될 수도 있습니다.")
		.setTimestamp(new Date());
		
	const partRoleDividerMessageButtons = new ActionRowBuilder()
	.addComponents(
		new ButtonBuilder()
			.setCustomId('assignAdditionalPartRoles_Divider')
			.setLabel('------------------------')
			.setStyle(ButtonStyle.Primary)
	);
	await (client.channels.cache.get(partRoleConfig.Notice.ChannelId) as typeof TextChannel).send({ embeds: [partRoleDividerMessageEmbed], components: [partRoleDividerMessageButtons] });

	// 게임 역할
	const gameRoleMessageEmbed = new EmbedBuilder()
		.setColor(0xF67720)
		.setTitle(gameRoleConfig.Notice.EmbedTitle)
		.setDescription(gameRoleConfig.Notice.EmbedDescription)
		.setFooter("본 메시지는 상황에 따라 다시 전송 될 수도 있습니다.")
		.setTimestamp(new Date());
		
	let gameRoleMessageButtons = undefined;
	let i = 0;
	for (const role of gameRoleConfig.Roles) {
		if (gameRoleMessageButtons === undefined) gameRoleMessageButtons = new ActionRowBuilder();

		gameRoleMessageButtons.addComponents(
			new ButtonBuilder()
				.setCustomId(role.id)
				.setLabel(role.label)
				.setStyle(ButtonStyle.Primary)
		);
		
		i++;
		// 5개가 되면 메시지 보내고 새로 하나 더 만듦 (최대 크기)
		if (i % 5 == 0) {
			await (client.channels.cache.get(gameRoleConfig.Notice.ChannelId) as typeof TextChannel).send({ embeds: [gameRoleMessageEmbed], components: [gameRoleMessageButtons] });
			gameRoleMessageButtons = undefined;
		}
	};
	if (gameRoleMessageButtons !== undefined) await (client.channels.cache.get(gameRoleConfig.Notice.ChannelId) as typeof TextChannel).send({ embeds: [gameRoleMessageEmbed], components: [gameRoleMessageButtons] });
}

/////////////// Event
client.on('ready', async () => {
  	console.log(`Logged in as ${client.user.tag}!`);

	await refreshSlashCommands();
	//await deleteAllMessage();
	//await refreshMessage();
});

client.on('guildMemberAdd', async member => {
	if (member.guild.id !== config.GuildId) return;
	let roleData = member.guild.roles.cache.find(target => target.id === partRoleConfig.DefualtRoleId);
	member.roles.add(roleData);
});

client.on('interactionCreate', async interaction => {
	if (interaction.isCommand()) {
		if (interaction.guild.id !== config.GuildId) return;
		if (interaction.commandName === 'notice') {
			if (interaction.member.id !== config.BotOwner) {
				await interaction.reply({ content: '요청을 처리하지 못했습니다.\n`권한이 없습니다: Bot Owner(config/config.json)`', ephemeral: true });
				return;
			}

			const messageFileName: string = interaction.options.getString('파일명');
			const deleteMessage: boolean = interaction.options.getBoolean('기록제거');

			if (!await fs.existsSync(`noticeData/${messageFileName}`)) {
				await interaction.reply({ content: `요청을 처리하지 못했습니다.\n\`해당 경로에 파일이 존재하지 않습니다: ${messageFileName}\``, ephemeral: true });
				return;
			}

			let rawdata = await fs.readFileSync(`noticeData/${messageFileName}`);
			let messageData = JSON.parse(rawdata);

			const messageEmbed = new EmbedBuilder().setColor(0xF67720);
			if (messageData.Title === null)	messageEmbed.setTitle(messageData.Title);
			if (messageData.Description === null) messageEmbed.setDescription(messageData.Description);
			if (messageData.Footer === null) messageEmbed.setFooter(messageData.Footer);
			if (messageData.Timestamp) messageEmbed.setTimestamp(new Date());
			for (const field of messageData) {
				messageEmbed.addFields({
					name: field.Title,
					value: field.Description
				});
			};

			if (deleteMessage) {
				await deleteAllMessage();
			}

			await (client.channels.cache.get(partRoleConfig.Notice.ChannelId) as typeof TextChannel).send({ embeds: [messageEmbed] });
			await (client.channels.cache.get(gameRoleConfig.Notice.ChannelId) as typeof TextChannel).send({ embeds: [messageEmbed] });

			await interaction.reply({ content: '해당 채널에 메시지를 전송했습니다.', ephemeral: true });
		}
		if (interaction.commandName === 'refresh') {
			if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
				await interaction.reply({ content: '요청을 처리하지 못했습니다.\n`권한이 없습니다: Administrator(0x8)`', ephemeral: true });
				return;
			}
			await deleteAllMessage();
			await refreshMessage();
			await interaction.reply({ content: '해당 채널에 메시지를 전송했습니다.', ephemeral: true });
		}
		if (interaction.commandName === 'add') {
			if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
				await interaction.reply({ content: '요청을 처리하지 못했습니다.\n`권한이 없습니다: Administrator(0x8)`', ephemeral: true });
				return;
			}
			
			const role = interaction.options.getRole('역할');
			const id: string = interaction.options.getString('영문이름');

			if (!idRule.test(id)) {
				await interaction.reply({ content: '요청을 처리하지 못했습니다.\n`영문 이름이 규격에 맞지 않습니다: 영어 대/소문자, 1~10자 이내`', ephemeral: true });
				return;
			}
			if (gameRoleConfig.Roles.find(target => target.id === `assignGameRoles_${id}`) !== undefined) {
				await interaction.reply({ content: `요청을 처리하지 못했습니다.\n\`이미 등록되어 있는 영문 이름입니다: ${id}\``, ephemeral: true });
				return;
			}
			if (gameRoleConfig.Roles.find(target => target.roleId === role.id) !== undefined) {
				await interaction.reply({ content: `요청을 처리하지 못했습니다.\n\`이미 등록되어 있는 역할입니다: ${role.name}\``, ephemeral: true });
				return;
			}

			gameRoleConfig.Roles.push({
				id: `assignGameRoles_${id}`,
				label: role.name,
				roleId: role.id.toString()
			});
			await fs.writeFileSync(gameRoleConfigPath, JSON.stringify(gameRoleConfig));

			await refreshMessage();
			await interaction.reply({ content: '해당 역할을 추가하고 메시지를 갱신했습니다.', ephemeral: true });
		}
		if (interaction.commandName === 'remove') {
			if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
				await interaction.reply({ content: `요청을 처리하지 못했습니다.\n\`권한이 없습니다: Administrator(0x8)\``, ephemeral: true });
				return;
			}
			
			const role = interaction.options.getRole('역할');
			const target = gameRoleConfig.Roles.find(target => target.roleId === role.id);
			if (target === undefined) {
				await interaction.reply({ content: `요청을 처리하지 못했습니다.\n\`등록되어 있지 않은 역할입니다: ${role.name}\``, ephemeral: true });
				return;
			}

			gameRoleConfig.Roles = gameRoleConfig.Roles.find(target => target.roleId === role.id);
			await fs.writeFileSync(gameRoleConfigPath, JSON.stringify(gameRoleConfig));

			await refreshMessage();
			await interaction.reply({ content: '해당 역할을 제거하고 메시지를 갱신했습니다.', ephemeral: true });
		}
	} else if (interaction.isButton()) {
		if (interaction.guild.id !== config.GuildId) return;
		if (interaction.customId === 'assignAdditionalPartRoles_Divider') { // 추가 역할
			try {
				let roleData = interaction.guild.roles.cache.find(target => target.id === '1038049868347871313');
				await interaction.member.roles.add(roleData);
				await interaction.reply({ content: '`------------------------` 역할이 설정되었습니다.', ephemeral: true });
			} catch (error) {
				await interaction.reply({ content: `요청을 처리하지 못했습니다.\n\`${error}\``, ephemeral: true });
				return;
			}
		} else if (interaction.customId.startsWith('assignPartRoles_')) { // 분야별 역할
			let role = partRoleConfig.Roles.find(target => target.id === interaction.customId);
			if (role === undefined) {
				await interaction.reply({ content: `요청을 처리하지 못했습니다.\n\`정의되지 않은 ID 입니다: ${interaction.customId}\``, ephemeral: true });
				return;
			}

			try {
				for (const role of partRoleConfig.Roles) {
					let rData = interaction.member.roles.cache.find(target => target.id === role.roleId || target.id === role.DefaultRoleId);
					if (rData !== undefined) {
						await interaction.member.roles.remove(rData);
					}
				};

				let roleData = interaction.guild.roles.cache.find(target => target.id === role.roleId);
				await interaction.member.roles.add(roleData);
				await interaction.reply({ content: `\`${role.label}\` 역할이 설정되었습니다.`, ephemeral: true });
			} catch (error) {
				await interaction.reply({ content: `요청을 처리하지 못했습니다.\n\`${error}\``, ephemeral: true });
				return;
			}
		}

		if (interaction.customId.startsWith('assignGameRoles_')) { // 게임 역할
			let role = gameRoleConfig.Roles.find(target => target.id === interaction.customId);
			if (role === undefined) {
				interaction.reply({ content: `요청을 처리하지 못했습니다.\n\`정의되지 않은 ID 입니다: ${interaction.customId}\``, ephemeral: true });
				return;
			}

			try {
				let guildRoleData = interaction.guild.roles.cache.find(target => target.id === role.roleId);
				let memberRoleData = interaction.member.roles.cache.find(target => target.id === role.roleId);

				if (memberRoleData == undefined) { // 역할 미소지
					await interaction.member.roles.add(guildRoleData);
					await interaction.reply({ content: `\`${role.label}\` 역할이 설정되었습니다.`, ephemeral: true });
				} else {
					await interaction.member.roles.remove(memberRoleData);
					await interaction.reply({ content: `\`${role.label}\` 역할이 제거되었습니다.`, ephemeral: true });
				}
			} catch (error) {
				await interaction.reply({ content: `요청을 처리하지 못했습니다.\n\`${error}\``, ephemeral: true });
				return;
			}
		}
	}
});

/////////////// Entry
(async() => {
	let rawdata = await fs.readFileSync(gameRoleConfigPath);
	gameRoleConfig = JSON.parse(rawdata);
	client.login(config.Token);
})();