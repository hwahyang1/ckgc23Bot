'use strict';

import fs from 'fs';

import { IGuildData, IChannelData, INoticeData, IRoleData } from '../template/IData';

class DataManager {
	private static instance: DataManager;

	public static getInstance() {
		return this.instance || (this.instance = new this());
	}

	private readonly dataPath = 'data/data.json';
	private data: Array<IGuildData>;

	constructor() {
		this.reloadData();
	}

	public async reloadData() {
		if (!(await fs.existsSync(this.dataPath))) {
			throw `'${this.dataPath}' does not exist.`;
		}
		let rawData = JSON.parse(await fs.readFileSync(this.dataPath, 'utf-8'));
		this.data = rawData as Array<IGuildData>;
	}

	public isExistGuild = (guildId: string): boolean => {
		const index = this.data.findIndex((target) => target.guildId == guildId);
		return index >= 0;
	};
	public isExistChannel = (guildId: string, channelId: string): boolean => {
		if (!this.isExistGuild(guildId)) return false;
		const index = this.getGuildData(guildId).channels.findIndex(
			(target) => target.channelId == channelId
		);
		return index >= 0;
	};

	public setGuildData = (guildId: string, data: IGuildData) => {
		if (this.isExistGuild(guildId)) {
			const index = this.data.findIndex((target) => target.guildId == guildId);
			this.data[index] = data;
		} else {
			this.data.push(data);
		}
	};
	public setChannelData = (guildId: string, channelData: IChannelData) => {
		if (!this.isExistGuild(guildId)) {
			const guildData: IGuildData = {
				guildId: guildId,
				defaultRoleIds: [],
				channels: [],
			};
			this.setGuildData(guildId, guildData);
		}
		// TODO: 중복 대응
		if (!this.getGuildData(guildId).channels)
			this.getGuildData(guildId).channels = new Array<IChannelData>();
		this.getGuildData(guildId).channels.push(channelData);
	};

	public getGuildData = (guildId: string): IGuildData => {
		if (!this.isExistGuild(guildId)) return null;
		return this.data.find((target) => target.guildId == guildId);
	};
	public getChannelData = (guildId: string, channelId: string): IChannelData => {
		if (!this.isExistChannel(guildId, channelId)) return null;
		return this.getGuildData(guildId).channels.find((target) => target.channelId == channelId);
	};

	public deleteGuildData = (guildId: string) => {
		const index = this.data.findIndex((target) => target.guildId == guildId);
		if (index >= 0) {
			this.data.splice(index, 1);
		}
	};
	public deleteChannelData = (guildId: string, channelId: string) => {
		const index =
			this.data
				.find((target) => target.guildId == guildId)
				?.channels.findIndex((target) => target.channelId == channelId) ?? -1;
		if (index >= 0) {
			this.data.splice(index, 1);
		}
	};

	public getAllData = (): Array<IGuildData> => this.data;

	public async saveData() {
		let rawData = JSON.stringify(this.data, null, 4);
		fs.writeFileSync(this.dataPath, rawData, 'utf-8');
	}
}

export default DataManager;

