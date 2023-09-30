'use strict';

interface IGuildData {
	guildId: string;
	defaultRoleIds: Array<string>;
	channels: Array<IChannelData>;
}

interface IChannelData {
	channelId: string;
	notice: INoticeData;
	defaultRoleIds: Array<string>;
	roleAssignType: 'SINGLE' | 'MULTIPLE';
	roles: Array<IRoleData>;
}

interface INoticeData {
	embedTitle: string;
	embedDescription: string;
}

interface IRoleData {
	id: string;
	label: string;
	roleId: string;
}

export { IGuildData, IChannelData, INoticeData, IRoleData };

