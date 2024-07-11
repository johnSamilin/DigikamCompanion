import { instance } from '@/services/instance';
import { userSchema } from '@/types/schemas/user';

export default async id => {
	const response = await instance.get(`users/${id}`).json();
	return userSchema.parse(response);
};
