'use strict';

import * as fs from 'fs';
import * as path from 'path';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import {
	Client,
	GatewayIntentBits,
	TextChannel,
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	PermissionsBitField,
	GuildMember,
	ChatInputCommandInteraction,
} from 'discord.js';

const config = require(path.join(__dirname, '..', 'config', 'config.json'));
const partRoleConfig = require(path.join(__dirname, '..', 'config', 'partRole.json'));
const gameRoleConfigPath = path.join(__dirname, '..', 'config', 'gameRole.json');
let gameRoleConfig = undefined;

const idRule = /^[a-zA-Z]{1,10}$/;

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
	],
});

/////////////// Functions
const refreshSlashCommands = async () => {
	const commands = [
		new SlashCommandBuilder()
			.setName('add')
			.setDescription('부여받을 수 있는 역할을 추가합니다. (서버 관리자 & 봇 관리자 전용)')
			.addRoleOption((option) =>
				option.setName('역할').setDescription('추가할 역할을 지정합니다.').setRequired(true)
			)
			.addStringOption((option) =>
				option
					.setName('영문이름')
					.setDescription(
						'역할의 영문 이름을 지정합니다. 공백 없이 대/소문자로만 구성합니다.'
					)
					.setRequired(true)
			),

		new SlashCommandBuilder()
			.setName('remove')
			.setDescription('부여받을 수 있는 역할을 제거합니다. (서버 관리자 & 봇 관리자 전용)')
			.addRoleOption((option) =>
				option.setName('역할').setDescription('제거할 역할을 지정합니다.').setRequired(true)
			),

		new SlashCommandBuilder()
			.setName('refresh')
			.setDescription('메시지를 다시 발송합니다. (서버 관리자 & 봇 관리자 전용)'),
	];

	const rest = new REST({ version: '9' }).setToken(config.Token);
	try {
		await rest.put(Routes.applicationGuildCommands(client.application.id, config.GuildId), {
			body: commands,
		});

		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error(error);
	}
};

const deleteAllMessage = async () => {
	// 분야별 역할
	let targetChannel: TextChannel = client.channels.cache.get(
		partRoleConfig.Notice.ChannelId
	) as TextChannel;
	let messageManager = targetChannel.messages;
	let messages = await messageManager.channel.messages.fetch({ limit: 100 });
	targetChannel.bulkDelete(messages, true);

	// 게임 역할
	targetChannel = client.channels.cache.get(gameRoleConfig.Notice.ChannelId) as TextChannel;
	messageManager = targetChannel.messages;
	messages = await messageManager.channel.messages.fetch({ limit: 100 });
	targetChannel.bulkDelete(messages, true);
};

const refreshMessage = async () => {
	// 분야별 역할
	const partRoleMessageEmbed = new EmbedBuilder()
		.setColor(0xf67720)
		.setTitle(partRoleConfig.Notice.EmbedTitle)
		.setDescription(partRoleConfig.Notice.EmbedDescription)
		.setFooter({ text: '본 메시지는 상황에 따라 다시 전송 될 수도 있습니다.' });

	let partRoleMessageButtons = undefined;
	let i = 0;
	for (const role of partRoleConfig.Roles) {
		if (partRoleMessageButtons === undefined)
			partRoleMessageButtons = new ActionRowBuilder<ButtonBuilder>();

		partRoleMessageButtons.addComponents(
			new ButtonBuilder()
				.setCustomId(role.id)
				.setLabel(role.label)
				.setStyle(ButtonStyle.Primary)
		);

		i++;
		// 5개가 되면 메시지 보내고 새로 하나 더 만듦 (최대 크기)
		if (i % 5 == 0) {
			if (i == 5) {
				await (
					client.channels.cache.get(partRoleConfig.Notice.ChannelId) as TextChannel
				).send({
					embeds: [partRoleMessageEmbed],
					components: [partRoleMessageButtons],
				});
			} else {
				await (
					client.channels.cache.get(partRoleConfig.Notice.ChannelId) as TextChannel
				).send({
					content: 'ㅤ',
					components: [partRoleMessageButtons],
				});
			}
			partRoleMessageButtons = undefined;
		}
	}
	if (partRoleMessageButtons !== undefined) {
		if (i <= 5) {
			await (client.channels.cache.get(partRoleConfig.Notice.ChannelId) as TextChannel).send({
				embeds: [partRoleMessageEmbed],
				components: [partRoleMessageButtons],
			});
		} else {
			await (client.channels.cache.get(partRoleConfig.Notice.ChannelId) as TextChannel).send({
				content: 'ㅤ',
				components: [partRoleMessageButtons],
			});
		}
	}

	// 게임 역할

	// 얘는 데이터를 다시 불러오고 시작함
	let rawdata = await fs.readFileSync(gameRoleConfigPath, 'utf8');
	gameRoleConfig = JSON.parse(rawdata);

	const gameRoleMessageEmbed = new EmbedBuilder()
		.setColor(0xf67720)
		.setTitle(gameRoleConfig.Notice.EmbedTitle)
		.setDescription(gameRoleConfig.Notice.EmbedDescription)
		.setFooter({ text: '본 메시지는 상황에 따라 다시 전송 될 수도 있습니다.' });

	let gameRoleMessageButtons = undefined;
	i = 0;
	for (const role of gameRoleConfig.Roles) {
		if (gameRoleMessageButtons === undefined)
			gameRoleMessageButtons = new ActionRowBuilder<ButtonBuilder>();

		gameRoleMessageButtons.addComponents(
			new ButtonBuilder()
				.setCustomId(role.id)
				.setLabel(role.label)
				.setStyle(ButtonStyle.Primary)
		);

		i++;
		// 5개가 되면 메시지 보내고 새로 하나 더 만듦 (최대 크기)
		if (i % 5 == 0) {
			if (i == 5) {
				await (
					client.channels.cache.get(gameRoleConfig.Notice.ChannelId) as TextChannel
				).send({
					embeds: [gameRoleMessageEmbed],
					components: [gameRoleMessageButtons],
				});
			} else {
				await (
					client.channels.cache.get(gameRoleConfig.Notice.ChannelId) as TextChannel
				).send({
					content: 'ㅤ',
					components: [gameRoleMessageButtons],
				});
			}
			gameRoleMessageButtons = undefined;
		}
	}
	if (gameRoleMessageButtons !== undefined) {
		if (i <= 5) {
			await (client.channels.cache.get(gameRoleConfig.Notice.ChannelId) as TextChannel).send({
				embeds: [gameRoleMessageEmbed],
				components: [gameRoleMessageButtons],
			});
		} else {
			await (client.channels.cache.get(gameRoleConfig.Notice.ChannelId) as TextChannel).send({
				content: 'ㅤ',
				components: [gameRoleMessageButtons],
			});
		}
	}

	//gameRoleMessageButtons = undefined;
	gameRoleMessageButtons = new ActionRowBuilder<ButtonBuilder>();
	gameRoleMessageButtons.addComponents(
		new ButtonBuilder()
			.setCustomId('assignGameRoles_getAll')
			.setLabel('전체 선택')
			.setStyle(ButtonStyle.Primary)
	);
	gameRoleMessageButtons.addComponents(
		new ButtonBuilder()
			.setCustomId('assignGameRoles_outAll')
			.setLabel('전체 취소')
			.setStyle(ButtonStyle.Primary)
	);
	await (client.channels.cache.get(gameRoleConfig.Notice.ChannelId) as TextChannel).send({
		content: 'ㅤ\n※ `전체 취소` 버튼은 에러가 발생하는 것이 정상 동작입니다.',
		components: [gameRoleMessageButtons],
	});
};

/////////////// Event
client.on('ready', async () => {
	console.log(`Logged in as ${client.user.tag}!`);

	await refreshSlashCommands();
	//await deleteAllMessage();
	//await refreshMessage();
});

client.on('guildMemberAdd', async (member) => {
	// 지정되지 않은 Guild의 요청 무시
	if (member.guild.id !== config.GuildId) return;

	// 입장 시, 기본 역할(파트역할 미배정) 부여
	let roleData = member.guild.roles.cache.find(
		(target) => target.id === partRoleConfig.DefaultRoleId
	);
	member.roles.add(roleData);
});

client.on('interactionCreate', async (interaction) => {
	let interactionMember: GuildMember = interaction.member as GuildMember;

	// Slash Command Interaction
	if (interaction.isCommand()) {
		let commandInteraction: ChatInputCommandInteraction =
			interaction as ChatInputCommandInteraction;

		// 지정되지 않은 Guild의 요청 무시
		if (interaction.guild.id !== config.GuildId) return;

		switch (interaction.commandName) {
			case 'refresh':
				// 권한 체크
				if (
					!interactionMember.permissions.has(PermissionsBitField.Flags.Administrator) &&
					interactionMember.id !== config.BotOwner
				) {
					await interaction.reply({
						content:
							'요청을 처리하지 못했습니다.\n`권한이 없습니다: Administrator(0x8) || Bot Owner(config/config.json)`',
						ephemeral: true,
					});
					return;
				}

				await deleteAllMessage();
				await refreshMessage();
				await interaction.reply({
					content: '해당 채널에 메시지를 전송했습니다.',
					ephemeral: true,
				});
				break;
			case 'add':
				// 권한 체크
				if (
					!interactionMember.permissions.has(PermissionsBitField.Flags.Administrator) &&
					interactionMember.id !== config.BotOwner
				) {
					await interaction.reply({
						content:
							'요청을 처리하지 못했습니다.\n`권한이 없습니다: Administrator(0x8) || Bot Owner(config/config.json)`',
						ephemeral: true,
					});
					return;
				}

				const addTargetRole = commandInteraction.options.getRole('역할');
				const id: string = commandInteraction.options.getString('영문이름');

				// 정규식 불일치
				if (!idRule.test(id)) {
					await interaction.reply({
						content:
							'요청을 처리하지 못했습니다.\n`영문 이름이 규격에 맞지 않습니다: 영어 대/소문자, 1~10자 이내`',
						ephemeral: true,
					});
					return;
				}

				// 영문 ID 중복
				if (
					gameRoleConfig.Roles.find((target) => target.id === `assignGameRoles_${id}`) !==
					undefined
				) {
					await interaction.reply({
						content: `요청을 처리하지 못했습니다.\n\`이미 등록되어 있는 영문 이름입니다: ${id}\``,
						ephemeral: true,
					});
					return;
				}

				// 역할 중복
				if (
					gameRoleConfig.Roles.find((target) => target.roleId === addTargetRole.id) !==
					undefined
				) {
					await interaction.reply({
						content: `요청을 처리하지 못했습니다.\n\`이미 등록되어 있는 역할입니다: ${addTargetRole.name}\``,
						ephemeral: true,
					});
					return;
				}

				// 역할 목록 변수에 대상 역할 추가하고 저장 -> 파일로 출력
				gameRoleConfig.Roles.push({
					id: `assignGameRoles_${id}`,
					label: addTargetRole.name,
					roleId: addTargetRole.id.toString(),
				});
				await fs.writeFileSync(gameRoleConfigPath, JSON.stringify(gameRoleConfig));

				await deleteAllMessage();
				await refreshMessage();
				await interaction.reply({
					content: '해당 역할을 추가하고 메시지를 갱신했습니다.',
					ephemeral: true,
				});
				break;
			case 'remove':
				// 권한 체크
				if (
					!interactionMember.permissions.has(PermissionsBitField.Flags.Administrator) &&
					interactionMember.id !== config.BotOwner
				) {
					await interaction.reply({
						content:
							'요청을 처리하지 못했습니다.\n`권한이 없습니다: Administrator(0x8) || Bot Owner(config/config.json)`',
						ephemeral: true,
					});
					return;
				}

				const removeTargetRole = commandInteraction.options.getRole('역할');
				const target = gameRoleConfig.Roles.find(
					(target) => target.roleId === removeTargetRole.id
				);

				// 역할 미등록 상태
				if (target === undefined) {
					await interaction.reply({
						content: `요청을 처리하지 못했습니다.\n\`등록되어 있지 않은 역할입니다: ${removeTargetRole.name}\``,
						ephemeral: true,
					});
					return;
				}

				// 역할 목록 변수에 대상 역할 제거하고 저장 -> 파일로 출력
				gameRoleConfig.Roles = gameRoleConfig.Roles.find(
					(target) => target.roleId === removeTargetRole.id
				);
				await fs.writeFileSync(gameRoleConfigPath, JSON.stringify(gameRoleConfig));

				await deleteAllMessage();
				await refreshMessage();
				await interaction.reply({
					content: '해당 역할을 제거하고 메시지를 갱신했습니다.',
					ephemeral: true,
				});
				break;
		}
	}
	// Button Interaction
	else if (interaction.isButton()) {
		// 지정되지 않은 Guild의 요청 무시
		if (interaction.guild.id !== config.GuildId) return;

		// 분야별 역할 + 추가 역할
		if (interaction.customId.startsWith('assignPartRoles_')) {
			// 대상 역할 정보 취득
			let role = partRoleConfig.Roles.find((target) => target.id === interaction.customId);
			if (role === undefined) {
				await interaction.reply({
					content: `요청을 처리하지 못했습니다.\n\`정의되지 않은 ID 입니다: ${interaction.customId}\``,
					ephemeral: true,
				});
				return;
			}

			try {
				// 추가 역할(작대기 역할) 부여하고 시작
				let additionalRoleData = interaction.guild.roles.cache.find(
					(target) => target.id === '1038049868347871313'
				);
				await interactionMember.roles.add(additionalRoleData);

				// Memeber가 다른 파트의 역할이나 기본 역할 소지 중인지 확인 -> 해제
				for (const role of partRoleConfig.Roles) {
					let rData = interactionMember.roles.cache.find(
						(target) =>
							target.id === role.roleId || target.id === partRoleConfig.DefaultRoleId
					);
					if (rData !== undefined) {
						await interactionMember.roles.remove(rData);
					}
				}

				// 대상 역할 부여
				let roleData = interaction.guild.roles.cache.find(
					(target) => target.id === role.roleId
				);
				await interactionMember.roles.add(roleData);
				await interaction.reply({
					content: `\`${role.label}\` 역할이 설정되었습니다.`,
					ephemeral: true,
				});
			} catch (error) {
				await interaction.reply({
					content: `요청을 처리하지 못했습니다.\n\`${error}\``,
					ephemeral: true,
				});
				return;
			}
		}

		// 게임 역할
		if (interaction.customId.startsWith('assignGameRoles_')) {
			// 특수 버튼
			switch (interaction.customId) {
				case 'assignGameRoles_getAll':
					for (const role of gameRoleConfig.Roles) {
						let rData = interactionMember.roles.cache.find(
							(target) => target.id === role.roleId
						);
						if (rData === undefined) {
							await interactionMember.roles.add(role.roleId);
						}
					}
					await interaction.reply({
						content: '전체 역할이 설정되었습니다.',
						ephemeral: true,
					});
					return;
				case 'assignGameRoles_outAll':
					for (const role of gameRoleConfig.Roles) {
						let rData = interactionMember.roles.cache.find(
							(target) => target.id === role.roleId
						);
						if (rData !== undefined) {
							await interactionMember.roles.remove(rData);
						}
					}
					//TODO: 시간이 초과되어서 그런 건지 Unknown Interaction 에러가 발생함
					/*await interaction.reply({
						content: '전체 역할이 제거되었습니다.',
						ephemeral: true,
					});*/
					return;
			}

			// 대상 역할 정보 취득
			let role = gameRoleConfig.Roles.find((target) => target.id === interaction.customId);
			if (role === undefined) {
				interaction.reply({
					content: `요청을 처리하지 못했습니다.\n\`정의되지 않은 ID 입니다: ${interaction.customId}\``,
					ephemeral: true,
				});
				return;
			}

			try {
				// Member의 소지 중인 역할 확인 -> 대상 역할을 가지고 있으면 해제, 가지고 있지 않으면 부여
				let guildRoleData = interaction.guild.roles.cache.find(
					(target) => target.id === role.roleId
				);
				let memberRoleData = interactionMember.roles.cache.find(
					(target) => target.id === role.roleId
				);

				if (memberRoleData == undefined) {
					// 역할 미소지
					await interactionMember.roles.add(guildRoleData);
					await interaction.reply({
						content: `\`${role.label}\` 역할이 설정되었습니다.`,
						ephemeral: true,
					});
				} else {
					await interactionMember.roles.remove(memberRoleData);
					await interaction.reply({
						content: `\`${role.label}\` 역할이 제거되었습니다.`,
						ephemeral: true,
					});
				}
			} catch (error) {
				await interaction.reply({
					content: `요청을 처리하지 못했습니다.\n\`${error}\``,
					ephemeral: true,
				});
				return;
			}
		}
	}
});

/////////////// Entry
(async () => {
	let rawdata = await fs.readFileSync(gameRoleConfigPath, 'utf8');
	gameRoleConfig = JSON.parse(rawdata);
	client.login(config.Token);
})();
