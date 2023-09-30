'use strict';

import {
	Client,
	GatewayIntentBits,
	GuildMember,
	ChatInputCommandInteraction,
	ButtonInteraction,
} from 'discord.js';

import DataManager from './modules/dataManager';
import SlashCommandsManager from './modules/slashCommandsManager';
import ButtonsManager from './modules/buttonsManager';

import IConfig from './template/IConfig';

const config = require('../config/config.json') as IConfig;

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
	],
});

const slashCommandsManager = new SlashCommandsManager();
const buttonsManager = new ButtonsManager();

/////////////// Functions

/////////////// Discord Events
client.on('ready', async () => {
	console.log(`Logged in as ${client.user.tag}!`);

	config.guilds.forEach((guildId) => {
		slashCommandsManager.refreshSlashCommands(client.application.id, config.token, guildId);
	});
});

client.on('interactionCreate', async (rawInteraction) => {
	// 지정되지 않은 Guild의 요청 무시
	if (!config.guilds.includes(rawInteraction.guild.id)) return;

	let interactionMember: GuildMember = rawInteraction.member as GuildMember;

	// Slash Command Interaction
	if (rawInteraction.isCommand()) {
		let interaction: ChatInputCommandInteraction =
			rawInteraction as ChatInputCommandInteraction;
		slashCommandsManager.processSlashCommand(interaction, interactionMember, config.botOwner);
	}
	// Button Interaction
	else if (rawInteraction.isButton()) {
		let interaction: ButtonInteraction = rawInteraction as ButtonInteraction;
		buttonsManager.processButton(interaction, interactionMember, config.botOwner);
	}
});

/////////////// Entry
(async () => {
	client.login(config.token);

	// constructor 호출
	DataManager.getInstance();
})();

