import { USER_ROLES } from '../user/user.enums';

export interface IJwtPayload {
     id: string;
     role: USER_ROLES | '';
     email: string;
}
