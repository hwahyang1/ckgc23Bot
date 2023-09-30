'use strict';

import { ButtonInteraction, GuildMember } from 'discord.js';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import DataManager from './dataManager';

class ButtonsManager {
	constructor() {
		dayjs.extend(customParseFormat);
		dayjs.extend(utc);
		dayjs.extend(timezone);
		dayjs.tz.setDefault('Asia/Seoul');
	}

	public async processButton(
		interaction: ButtonInteraction,
		interactionMember: GuildMember,
		botOwner: string
	) {
		if (interaction.customId.startsWith('assignRole_')) {
			const channelData = DataManager.getInstance().getChannelData(
				interaction.guild.id,
				interaction.channel.id
			);

			// 특수 버튼
			switch (interaction.customId) {
				case 'assignRole_getAll':
					await interaction.reply({
						content:
							'전체 역할이 설정되었습니다.\n반영되기까지 시간이 소요 될 수 있습니다.',
						ephemeral: true,
					});
					for (const role of channelData.roles) {
						let roleData = interactionMember.roles.cache.find(
							(target) => target.id === role.id
						);
						if (roleData === undefined) {
							await interactionMember.roles.add(roleData);
						}
					}
					return;
				case 'assignRole_outAll':
					await interaction.reply({
						content:
							'전체 역할이 제거되었습니다.\n반영되기까지 시간이 소요 될 수 있습니다.',
						ephemeral: true,
					});
					for (const role of channelData.roles) {
						let roleData = interactionMember.roles.cache.find(
							(target) => target.id === role.id
						);
						if (roleData !== undefined) {
							await interactionMember.roles.remove(roleData);
						}
					}
					return;
			}

			// 아니면 역할 조정
			let findTargetId = interaction.customId.replace('assignRole_', '');

			// 대상 역할 정보 취득
			let role = channelData.roles.find((target) => target.id === findTargetId);
			if (role === undefined) {
				await interaction.reply({
					content: `요청을 처리하지 못했습니다.\n\`정의되지 않은 ID 입니다: ${interaction.customId}\``,
					ephemeral: true,
				});
				return;
			}

			try {
				// 기본 역할 먼저 부여
				for (let defaultRoleId of channelData.defaultRoleIds) {
					let additionalRoleData = interaction.guild.roles.cache.find(
						(target) => target.id === defaultRoleId
					);
					await interactionMember.roles.add(additionalRoleData);
				}

				if (channelData.roleAssignType === 'SINGLE') {
					// Memeber가 다른 역할 소지 중인지 확인 -> 해제
					for (const role of channelData.roles) {
						let rData = interactionMember.roles.cache.find(
							(target) => target.id === role.roleId
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
				} else {
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
}

export default ButtonsManager;

