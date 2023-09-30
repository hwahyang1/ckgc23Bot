'use strict';

import { ButtonInteraction, GuildMember } from 'discord.js';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import IConfig from '../template/IConfig';

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
		}
	}
}

export default ButtonsManager;

