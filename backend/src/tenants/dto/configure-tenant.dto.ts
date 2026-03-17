import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfigureTenantDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brainName?: string;

  @IsOptional()
  @IsString()
  brainPersona?: string;

  @IsOptional()
  @IsString()
  brainContext?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  customDomain?: string;

  @IsOptional()
  @IsString()
  telegramBotToken?: string;
}
