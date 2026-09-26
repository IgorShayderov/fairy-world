import { IsIn } from 'class-validator';

export class UpdateClanRoleDto {
  @IsIn(['OFFICER', 'MEMBER'])
  role!: 'OFFICER' | 'MEMBER';
}
