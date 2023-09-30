'use strict';

import {
	GuildMember,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	PermissionsBitField,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
} from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import DataManager from './dataManager';

import { IGuildData, IChannelData, INoticeData, IRoleData } from '../template/IData';

class SlashCommandsManager {
	private readonly idRule = /^[a-zA-Z]{1,20}$/;

	constructor() {
		dayjs.extend(customParseFormat);
		dayjs.extend(utc);
		dayjs.extend(timezone);
		dayjs.tz.setDefault('Asia/Seoul');
	}

	public getSlashCommands(): Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>[] {
		return [
			new SlashCommandBuilder()
				.setName('채널추가')
				.setDescription(
					'역할을 부여받을 수 있는 채널을 추가합니다. (서버 관리자 & 봇 관리자 전용)'
				)
				.addStringOption((option) =>
					option
						.setName('제목')
						.setDescription('메시지의 제목을 지정합니다.')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('내용')
						.setDescription('메시지의 내용을 지정합니다.')
						.setRequired(true)
				),
			new SlashCommandBuilder()
				.setName('채널제거')
				.setDescription(
					'역할을 부여받을 수 있는 채널을 제거합니다. (서버 관리자 & 봇 관리자 전용)'
				),
			new SlashCommandBuilder()
				.setName('역할추가')
				.setDescription(
					'부여받을 수 있는 역할을 추가합니다. (서버 관리자 & 봇 관리자 전용)'
				)
				.addRoleOption((option) =>
					option
						.setName('역할')
						.setDescription('추가할 역할을 지정합니다.')
						.setRequired(true)
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
				.setName('역할제거')
				.setDescription(
					'부여받을 수 있는 역할을 제거합니다. (서버 관리자 & 봇 관리자 전용)'
				)
				.addRoleOption((option) =>
					option
						.setName('역할')
						.setDescription('제거할 역할을 지정합니다.')
						.setRequired(true)
				),
			new SlashCommandBuilder()
				.setName('역할알림')
				.setDescription(
					'현재 채널에 메시지를 다시 발송합니다. (서버 관리자 & 봇 관리자 전용)'
				),
		];
	}

	public async refreshSlashCommands(applicationId: string, token: string, guildId: string) {
		const rest = new REST({ version: '9' }).setToken(token);
		try {
			await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
				body: this.getSlashCommands(),
			});

			console.log(`Successfully reloaded application (/) commands in guild ${guildId}.`);
		} catch (error) {
			console.error(error);
		}
	}

	public async processSlashCommand(
		interaction: ChatInputCommandInteraction,
		interactionMember: GuildMember,
		botOwner: string
	) {
		let channelData: IChannelData = null;

		switch (interaction.commandName) {
			case '채널추가':
				// 권한 체크
				if (
					!interactionMember.permissions.has(PermissionsBitField.Flags.Administrator) &&
					interactionMember.id !== botOwner
				) {
					await interaction.reply({
						content:
							'요청을 처리하지 못했습니다.\n`권한이 없습니다: Administrator(0x8) || Bot Owner(config/config.json)`',
						ephemeral: true,
					});
					return;
				}

				if (
					DataManager.getInstance().isExistChannel(
						interaction.guild.id,
						interaction.channel.id
					)
				) {
					await interaction.reply({
						content: `요청을 처리하지 못했습니다.\n\`이미 추가된 채널입니다: ${interaction.channel.id}\``,
						ephemeral: true,
					});
					return;
				}

				const title: string = interaction.options.getString('제목');
				const description: string = interaction.options.getString('내용');

				const noticeData: INoticeData = {
					embedTitle: title,
					embedDescription: description,
				};
				channelData = {
					channelId: interaction.channel.id,
					notice: noticeData,
					defaultRoleIds: [],
					roleAssignType: 'SINGLE',
					roles: [],
				};

				DataManager.getInstance().setChannelData(interaction.guild.id, channelData);

				await DataManager.getInstance().saveData();

				await interaction.reply({
					content: '성공적으로 본 채널을 추가했습니다.',
					ephemeral: true,
				});

				break;
			case '채널제거':
				// 권한 체크
				if (
					!interactionMember.permissions.has(PermissionsBitField.Flags.Administrator) &&
					interactionMember.id !== botOwner
				) {
					await interaction.reply({
						content:
							'요청을 처리하지 못했습니다.\n`권한이 없습니다: Administrator(0x8) || Bot Owner(config/config.json)`',
						ephemeral: true,
					});
					return;
				}

				if (
					!DataManager.getInstance().isExistChannel(
						interaction.guild.id,
						interaction.channel.id
					)
				) {
					await interaction.reply({
						content: `요청을 처리하지 못했습니다.\n\`추가되지 않은 채널입니다: ${interaction.channel.id}\``,
						ephemeral: true,
					});
					return;
				}

				DataManager.getInstance().deleteChannelData(
					interaction.guild.id,
					interaction.channel.id
				);

				await DataManager.getInstance().saveData();

				await interaction.reply({
					content: '성공적으로 본 채널을 제거했습니다.',
					ephemeral: true,
				});
				break;
			case '역할추가':
				// 권한 체크
				if (
					!interactionMember.permissions.has(PermissionsBitField.Flags.Administrator) &&
					interactionMember.id !== botOwner
				) {
					await interaction.reply({
						content:
							'요청을 처리하지 못했습니다.\n`권한이 없습니다: Administrator(0x8) || Bot Owner(config/config.json)`',
						ephemeral: true,
					});
					return;
				}

				if (
					!DataManager.getInstance().isExistChannel(
						interaction.guild.id,
						interaction.channel.id
					)
				) {
					await interaction.reply({
						content: `요청을 처리하지 못했습니다.\n\`추가되지 않은 채널입니다: ${interaction.channel.id}\``,
						ephemeral: true,
					});
					return;
				}

				const addTargetRole = interaction.options.getRole('역할');
				const id = interaction.options.getString('영문이름');

				// 정규식 불일치
				if (!this.idRule.test(id)) {
					await interaction.reply({
						content:
							'요청을 처리하지 못했습니다.\n`영문 이름이 규격에 맞지 않습니다: 영어 대/소문자, 1~20자 이내`',
						ephemeral: true,
					});
					return;
				}

				channelData = DataManager.getInstance().getChannelData(
					interaction.guild.id,
					interaction.channel.id
				);

				// 영문 ID 중복
				if (channelData.roles.find((target) => target.id === id) !== undefined) {
					await interaction.reply({
						content: `요청을 처리하지 못했습니다.\n\`이미 등록되어 있는 영문 이름입니다: ${id}\``,
						ephemeral: true,
					});
					return;
				}

				// 역할 중복
				if (
					channelData.roles.find((target) => target.roleId === addTargetRole.id) !==
					undefined
				) {
					await interaction.reply({
						content: `요청을 처리하지 못했습니다.\n\`이미 등록되어 있는 역할입니다: ${addTargetRole.id}\``,
						ephemeral: true,
					});
					return;
				}

				// 역할 목록 변수에 대상 역할 추가하고 저장 -> 파일로 출력
				channelData.roles.push({
					id: `assignGameRoles_${id}`,
					label: addTargetRole.name,
					roleId: addTargetRole.id.toString(),
				});
				DataManager.getInstance().deleteChannelData(
					interaction.guild.id,
					interaction.channel.id
				);
				DataManager.getInstance().setChannelData(interaction.guild.id, channelData);
				DataManager.getInstance().saveData();

				await interaction.reply({
					content: '해당 역할을 추가했습니다.',
					ephemeral: true,
				});
				break;
			case '역할제거':
				// 권한 체크
				if (
					!interactionMember.permissions.has(PermissionsBitField.Flags.Administrator) &&
					interactionMember.id !== botOwner
				) {
					await interaction.reply({
						content:
							'요청을 처리하지 못했습니다.\n`권한이 없습니다: Administrator(0x8) || Bot Owner(config/config.json)`',
						ephemeral: true,
					});
					return;
				}

				if (
					!DataManager.getInstance().isExistChannel(
						interaction.guild.id,
						interaction.channel.id
					)
				) {
					await interaction.reply({
						content: `요청을 처리하지 못했습니다.\n\`추가되지 않은 채널입니다: ${interaction.channel.id}\``,
						ephemeral: true,
					});
					return;
				}

				const removeTargetRole = interaction.options.getRole('역할');
				channelData = DataManager.getInstance().getChannelData(
					interaction.guild.id,
					interaction.channel.id
				);
				const target = channelData.roles.find(
					(target) => target.roleId === removeTargetRole.id
				);

				// 역할 미등록 상태
				if (target === undefined) {
					await interaction.reply({
						content: `요청을 처리하지 못했습니다.\n\`등록되어 있지 않은 역할입니다: ${removeTargetRole.id}\``,
						ephemeral: true,
					});
					return;
				}

				// 역할 목록 변수에 대상 역할 제거하고 저장 -> 파일로 출력
				const index = channelData.roles.findIndex(
					(target) => target.roleId === removeTargetRole.id
				);
				if (index >= 0) {
					channelData.roles.splice(index, 1);
				}
				DataManager.getInstance().deleteChannelData(
					interaction.guild.id,
					interaction.channel.id
				);
				DataManager.getInstance().setChannelData(interaction.guild.id, channelData);
				DataManager.getInstance().saveData();

				await interaction.reply({
					content: '해당 역할을 제거했습니다.',
					ephemeral: true,
				});
				break;
			case '역할알림':
				// 권한 체크
				if (
					!interactionMember.permissions.has(PermissionsBitField.Flags.Administrator) &&
					interactionMember.id !== botOwner
				) {
					await interaction.reply({
						content:
							'요청을 처리하지 못했습니다.\n`권한이 없습니다: Administrator(0x8) || Bot Owner(config/config.json)`',
						ephemeral: true,
					});
					return;
				}

				if (
					!DataManager.getInstance().isExistChannel(
						interaction.guild.id,
						interaction.channel.id
					)
				) {
					await interaction.reply({
						content: `요청을 처리하지 못했습니다.\n\`추가되지 않은 채널입니다: ${interaction.channel.id}\``,
						ephemeral: true,
					});
					return;
				}

				let messageManager = interaction.channel.messages;
				let messages = await messageManager.channel.messages.fetch({ limit: 100 });
				interaction.channel.bulkDelete(messages, true);

				channelData = DataManager.getInstance().getChannelData(
					interaction.guild.id,
					interaction.channel.id
				);

				const messageEmbed = new EmbedBuilder()
					.setColor(0xf67720)
					.setTitle(channelData.notice.embedTitle)
					.setDescription(channelData.notice.embedDescription)
					.setFooter({
						text: '본 메시지는 상황에 따라 다시 전송 될 수도 있습니다.',
					});

				let messageButtons = undefined;
				let i = 0;
				for (const role of channelData.roles) {
					if (messageButtons === undefined)
						messageButtons = new ActionRowBuilder<ButtonBuilder>();

					messageButtons.addComponents(
						new ButtonBuilder()
							.setCustomId(`assignRole_${role.id}`)
							.setLabel(role.label)
							.setStyle(ButtonStyle.Primary)
					);

					i++;
					// 5개가 되면 메시지 보내고 새로 하나 더 만듦 (최대 크기)
					if (i % 5 == 0) {
						if (i == 5) {
							await interaction.channel.send({
								embeds: [messageEmbed],
								components: [messageButtons],
							});
						} else {
							await interaction.channel.send({
								content: 'ㅤ',
								components: [messageButtons],
							});
						}
						messageButtons = undefined;
					}
				}
				if (messageButtons !== undefined) {
					if (i <= 5) {
						await interaction.channel.send({
							embeds: [messageEmbed],
							components: [messageButtons],
						});
					} else {
						await interaction.channel.send({
							content: 'ㅤ',
							components: [messageButtons],
						});
					}
				}

				if (channelData.roleAssignType === 'MULTIPLE') {
					messageButtons = new ActionRowBuilder<ButtonBuilder>();
					messageButtons.addComponents(
						new ButtonBuilder()
							.setCustomId('assignRole_getAll')
							.setLabel('전체 선택')
							.setStyle(ButtonStyle.Primary)
					);
					messageButtons.addComponents(
						new ButtonBuilder()
							.setCustomId('assignRole_outAll')
							.setLabel('전체 해제')
							.setStyle(ButtonStyle.Primary)
					);
					await interaction.channel.send({
						content: 'ㅤ',
						components: [messageButtons],
					});
				}
				break;
		}
	}
}

export default SlashCommandsManager;

